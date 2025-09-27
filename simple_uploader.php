<?php
/**
 * Simple DICOM Uploader to Orthanc PACS
 * Upload your DCM files to Orthanc using simple PHP
 */

// Orthanc settings (default after installation)
$ORTHANC_URL = 'http://localhost:8042';

// Handle file upload
if ($_POST && isset($_FILES['dicomFiles'])) {
    $uploadedFiles = [];
    $errors = [];
    
    // Handle multiple files
    $files = $_FILES['dicomFiles'];
    $fileCount = count($files['name']);
    
    for ($i = 0; $i < $fileCount; $i++) {
        if ($files['error'][$i] === UPLOAD_ERR_OK) {
            $tempFile = $files['tmp_name'][$i];
            $fileName = $files['name'][$i];
            
            // Read DICOM file
            $dicomData = file_get_contents($tempFile);
            
            // Send to Orthanc
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $ORTHANC_URL . '/instances');
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $dicomData);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/dicom']);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($httpCode === 200) {
                $uploadedFiles[] = $fileName;
            } else {
                $errors[] = "Failed to upload: $fileName";
            }
        }
    }
    
    echo "<div class='alert alert-success'>Uploaded " . count($uploadedFiles) . " files successfully!</div>";
    if (!empty($errors)) {
        echo "<div class='alert alert-warning'>" . implode('<br>', $errors) . "</div>";
    }
}

// Get studies from Orthanc for display
function getStudies() {
    global $ORTHANC_URL;
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $ORTHANC_URL . '/patients');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true) ?: [];
}

$studies = getStudies();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simple DICOM Uploader</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .drop-zone {
            border: 2px dashed #007bff;
            border-radius: 10px;
            padding: 50px;
            text-align: center;
            background: #f8f9fa;
            margin: 20px 0;
            transition: all 0.3s ease;
        }
        .drop-zone:hover {
            border-color: #0056b3;
            background: #e3f2fd;
        }
        .drop-zone.dragover {
            border-color: #28a745;
            background: #d4edda;
        }
    </style>
</head>
<body>
    <div class="container mt-4">
        <h1 class="text-center mb-4">Simple DICOM Uploader</h1>
        
        <!-- Upload Form -->
        <div class="card">
            <div class="card-header">
                <h5>Upload DICOM Files to PACS</h5>
            </div>
            <div class="card-body">
                <form method="POST" enctype="multipart/form-data" id="uploadForm">
                    <div class="drop-zone" id="dropZone">
                        <i class="bi bi-cloud-upload fs-1 text-primary"></i>
                        <h4>Drag & Drop DICOM Files Here</h4>
                        <p class="text-muted">or click to browse</p>
                        <input type="file" name="dicomFiles[]" id="fileInput" multiple 
                               accept=".dcm,.dicom" class="d-none">
                        <button type="button" class="btn btn-primary" onclick="document.getElementById('fileInput').click()">
                            Browse Files
                        </button>
                    </div>
                    
                    <div id="selectedFiles" class="mt-3"></div>
                    
                    <button type="submit" class="btn btn-success btn-lg w-100 mt-3" id="uploadBtn" style="display:none;">
                        Upload to PACS
                    </button>
                </form>
            </div>
        </div>

        <!-- Current Studies -->
        <div class="card mt-4">
            <div class="card-header d-flex justify-content-between">
                <h5>Studies in PACS</h5>
                <a href="http://localhost:8042" target="_blank" class="btn btn-sm btn-outline-primary">
                    Open Orthanc Web Interface
                </a>
            </div>
            <div class="card-body">
                <?php if (empty($studies)): ?>
                    <div class="text-center text-muted">
                        <p>No studies in PACS yet. Upload some DICOM files to get started!</p>
                    </div>
                <?php else: ?>
                    <div class="alert alert-info">
                        <strong><?php echo count($studies); ?> patients</strong> with studies are currently stored in your PACS.
                        <br>
                        Visit <a href="http://localhost:8042" target="_blank">Orthanc Web Interface</a> to view and manage them.
                    </div>
                <?php endif; ?>
            </div>
        </div>

        <!-- Integration with Your Viewer -->
        <div class="card mt-4">
            <div class="card-header">
                <h5>Connect to Your DICOM Viewer</h5>
            </div>
            <div class="card-body">
                <p>Your PACS is now running! Use these settings to connect your viewer:</p>
                <ul>
                    <li><strong>PACS URL:</strong> http://localhost:8042</li>
                    <li><strong>DICOM Port:</strong> 4242</li>
                    <li><strong>AE Title:</strong> ORTHANC</li>
                </ul>
                
                <a href="pacs_search.php" class="btn btn-primary">
                    Open PACS Search Interface
                </a>
            </div>
        </div>
    </div>

    <script>
        // Drag and drop functionality
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const selectedFiles = document.getElementById('selectedFiles');
        const uploadBtn = document.getElementById('uploadBtn');

        dropZone.addEventListener('click', () => fileInput.click());

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            fileInput.files = files;
            displaySelectedFiles(files);
        });

        fileInput.addEventListener('change', (e) => {
            displaySelectedFiles(e.target.files);
        });

        function displaySelectedFiles(files) {
            if (files.length === 0) return;

            let html = '<h6>Selected Files:</h6><ul class="list-group">';
            for (let i = 0; i < Math.min(files.length, 10); i++) {
                html += `<li class="list-group-item">${files[i].name}</li>`;
            }
            if (files.length > 10) {
                html += `<li class="list-group-item text-muted">... and ${files.length - 10} more files</li>`;
            }
            html += '</ul>';
            
            selectedFiles.innerHTML = html;
            uploadBtn.style.display = 'block';
        }
    </script>
</body>
</html>