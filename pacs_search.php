<?php
$ORTHANC_URL = 'https://pacs.e-connect.in';

function orthancAPI($endpoint) {
    global $ORTHANC_URL;
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $ORTHANC_URL . $endpoint);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return $httpCode === 200 ? json_decode($response, true) : null;
}

if (isset($_GET['action'])) {
    header('Content-Type: application/json');
    
    if ($_GET['action'] === 'search') {
        $patients = orthancAPI('/patients') ?: [];
        $results = [];
        
        foreach ($patients as $patientId) {
            $patient = orthancAPI("/patients/$patientId");
            if (!$patient) continue;
            
            $studies = [];
            foreach ($patient['Studies'] as $studyId) {
                $study = orthancAPI("/studies/$studyId");
                if ($study) {
                    $studies[] = [
                        'studyUID' => $studyId,
                        'studyDescription' => $study['MainDicomTags']['StudyDescription'] ?? 'Unknown Study',
                        'studyDate' => $study['MainDicomTags']['StudyDate'] ?? '',
                        'seriesCount' => count($study['Series'])
                    ];
                }
            }
            
            $results[] = [
                'patientID' => $patient['MainDicomTags']['PatientID'] ?? 'Unknown',
                'patientName' => $patient['MainDicomTags']['PatientName'] ?? 'Unknown',
                'studies' => $studies
            ];
        }
        
        echo json_encode(['success' => true, 'results' => $results]);
        exit;
    }
    
    if ($_GET['action'] === 'load_study') {
        $studyUID = $_GET['studyUID'] ?? '';
        $study = orthancAPI("/studies/$studyUID");
        
        if (!$study) {
            echo json_encode(['success' => false, 'error' => 'Study not found']);
            exit;
        }
        
        $images = [];
        foreach ($study['Series'] as $seriesId) {
            $series = orthancAPI("/series/$seriesId");
            if (!$series) continue;
            
            foreach ($series['Instances'] as $instanceId) {
                $instance = orthancAPI("/instances/$instanceId");
                if (!$instance) continue;
                
                $dicomData = file_get_contents($ORTHANC_URL . "/instances/$instanceId/file");
                if ($dicomData === false) continue;
                
                $images[] = [
                    'id' => $instanceId,
                    'file_name' => ($instance['MainDicomTags']['SOPInstanceUID'] ?? $instanceId) . '.dcm',
                    'file_data' => base64_encode($dicomData),
                    'patient_name' => $instance['MainDicomTags']['PatientName'] ?? 'Unknown',
                    'study_description' => $instance['MainDicomTags']['StudyDescription'] ?? '',
                    'series_description' => $instance['MainDicomTags']['SeriesDescription'] ?? ''
                ];
            }
        }
        
        echo json_encode(['success' => true, 'images' => $images]);
        exit;
    }
}
?>

<!DOCTYPE html>
<html lang="en" data-bs-theme="dark">
<head>
    <meta charset="UTF-8">
    <title>Hospital PACS Search</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <style>
        body { background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); }
        .search-container { background: rgba(0,0,0,0.8); border-radius: 10px; padding: 20px; }
    </style>
</head>
<body>
    <div class="container mt-4">
        <div class="text-center mb-4">
            <h1 class="text-white">
                <i class="bi bi-search text-info"></i>
                Hospital PACS Search
            </h1>
            <p class="text-light">Search and load studies directly into your DICOM viewer</p>
        </div>

        <div class="search-container mb-4">
            <div class="row">
                <div class="col-md-4">
                    <label class="form-label text-light">Patient Name</label>
                    <input type="text" class="form-control" id="patientName" placeholder="Enter patient name...">
                </div>
                <div class="col-md-4">
                    <label class="form-label text-light">Patient ID</label>
                    <input type="text" class="form-control" id="patientID" placeholder="Enter patient ID...">
                </div>
                <div class="col-md-4 d-flex align-items-end">
                    <button class="btn btn-primary w-100" onclick="searchPACS()">
                        <i class="bi bi-search"></i> Search PACS
                    </button>
                </div>
            </div>
            <div class="row mt-3">
                <div class="col-12">
                    <button class="btn btn-success" onclick="showAllPatients()">
                        <i class="bi bi-list"></i> Show All Patients
                    </button>
                    <small class="text-light ms-3">Click to see all uploaded studies</small>
                </div>
            </div>
        </div>

        <div id="loading" class="text-center" style="display: none;">
            <div class="spinner-border text-primary"></div>
            <div class="text-light mt-2">Searching...</div>
        </div>

        <div id="results"></div>
    </div>

    <script>
        function showAllPatients() {
            searchPACS();
        }

        async function searchPACS() {
            const patientName = document.getElementById('patientName').value;
            const patientID = document.getElementById('patientID').value;

            document.getElementById('loading').style.display = 'block';
            document.getElementById('results').innerHTML = '';

            try {
                const response = await fetch('?action=search');
                const data = await response.json();

                if (data.success) {
                    displayResults(data.results);
                } else {
                    throw new Error('Search failed');
                }
            } catch (error) {
                document.getElementById('results').innerHTML = `
                    <div class="alert alert-danger">
                        <strong>Search Error:</strong> ${error.message}
                        <br><small>Make sure Orthanc PACS is running on localhost:8042</small>
                    </div>
                `;
            } finally {
                document.getElementById('loading').style.display = 'none';
            }
        }

        function displayResults(results) {
            const resultsDiv = document.getElementById('results');

            if (results.length === 0) {
                resultsDiv.innerHTML = `
                    <div class="alert alert-info">
                        <strong>No Results:</strong> No patients found.
                    </div>
                `;
                return;
            }

            let html = `<h4 class="text-white mb-3">Search Results (${results.length} patients found)</h4>`;
            
            results.forEach(patient => {
                html += `
                    <div class="card bg-secondary mb-3">
                        <div class="card-header">
                            <h5 class="mb-0 text-info">
                                <i class="bi bi-person"></i>
                                ${patient.patientName} (ID: ${patient.patientID})
                            </h5>
                        </div>
                        <div class="card-body">
                `;
                
                patient.studies.forEach(study => {
                    html += `
                        <div class="border rounded p-3 mb-2" style="background: rgba(0,0,0,0.3);">
                            <h6 class="text-light">${study.studyDescription}</h6>
                            <small class="text-muted">
                                Date: ${study.studyDate}<br>
                                Series: ${study.seriesCount}
                            </small>
                            <br>
                            <button class="btn btn-success btn-sm mt-2" onclick="loadStudy('${study.studyUID}', '${patient.patientName}')">
                                <i class="bi bi-eye"></i> Load in Viewer
                            </button>
                        </div>
                    `;
                });
                
                html += '</div></div>';
            });

            resultsDiv.innerHTML = html;
        }

        async function loadStudy(studyUID, patientName) {
            const loadBtn = event.target;
            const originalText = loadBtn.innerHTML;
            
            loadBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Loading...';
            loadBtn.disabled = true;

            try {
                const response = await fetch(`?action=load_study&studyUID=${studyUID}`);
                const data = await response.json();

                if (data.success && data.images.length > 0) {
                    sessionStorage.setItem('pacsImages', JSON.stringify(data.images));
                    sessionStorage.setItem('pacsPatientName', patientName);
                    
                    window.location.href = 'index.php?source=pacs';
                } else {
                    throw new Error('No images found in study');
                }
            } catch (error) {
                alert('Failed to load study: ' + error.message);
                loadBtn.innerHTML = originalText;
                loadBtn.disabled = false;
            }
        }
    </script>
</body>
</html>