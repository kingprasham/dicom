<?php
/**
 * Auto-Sync Trigger
 * Called by Python script after uploading to Orthanc
 * Syncs data from Orthanc to database automatically
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/includes/db.php';

// Set content type to JSON
header('Content-Type: application/json');

// Function to call Orthanc API
function callOrthanc($endpoint) {
    $url = ORTHANC_URL . $endpoint;
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERPWD, ORTHANC_USERNAME . ':' . ORTHANC_PASSWORD);
    curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        return null;
    }
    
    return json_decode($response, true);
}

$startTime = microtime(true);
$studiesAdded = 0;
$studiesUpdated = 0;
$errors = [];

try {
    // Get all patients from Orthanc
    $patients = callOrthanc('/patients');
    
    if (!$patients) {
        throw new Exception('Failed to connect to Orthanc');
    }
    
    // Process each patient
    foreach ($patients as $patientOrthancId) {
        $patientData = callOrthanc("/patients/$patientOrthancId");
        
        if (!$patientData) continue;
        
        $patientId = $patientData['MainDicomTags']['PatientID'] ?? 'UNKNOWN';
        $patientName = $patientData['MainDicomTags']['PatientName'] ?? 'Unknown';
        $patientBirthDate = $patientData['MainDicomTags']['PatientBirthDate'] ?? null;
        $patientSex = $patientData['MainDicomTags']['PatientSex'] ?? null;
        
        // Format birth date
        if ($patientBirthDate && strlen($patientBirthDate) === 8) {
            $patientBirthDate = substr($patientBirthDate, 0, 4) . '-' . substr($patientBirthDate, 4, 2) . '-' . substr($patientBirthDate, 6, 2);
        } else {
            $patientBirthDate = null;
        }
        
        // Check if patient exists
        $stmt = $mysqli->prepare("SELECT patient_id FROM cached_patients WHERE patient_id = ?");
        $stmt->bind_param('s', $patientId);
        $stmt->execute();
        $result = $stmt->get_result();
        $existingPatient = $result->fetch_assoc();
        $stmt->close();
        
        if (!$existingPatient) {
            // Insert new patient
            $stmt = $mysqli->prepare("INSERT INTO cached_patients (orthanc_id, patient_id, patient_name, patient_birth_date, patient_sex, study_count) VALUES (?, ?, ?, ?, ?, 0)");
            $stmt->bind_param('sssss', $patientOrthancId, $patientId, $patientName, $patientBirthDate, $patientSex);
            $stmt->execute();
            $stmt->close();
        }
        
        $studies = $patientData['Studies'] ?? [];
        
        foreach ($studies as $studyOrthancId) {
            $studyData = callOrthanc("/studies/$studyOrthancId");
            
            if (!$studyData) continue;
            
            $studyUID = $studyData['MainDicomTags']['StudyInstanceUID'] ?? null;
            
            if (!$studyUID) continue;
            
            $studyDate = $studyData['MainDicomTags']['StudyDate'] ?? null;
            $studyTime = $studyData['MainDicomTags']['StudyTime'] ?? null;
            $studyDesc = $studyData['MainDicomTags']['StudyDescription'] ?? 'PACS Study';
            $accessionNumber = $studyData['MainDicomTags']['AccessionNumber'] ?? null;
            
            // Get modality
            $modality = 'CT';
            if (isset($studyData['Series']) && count($studyData['Series']) > 0) {
                $firstSeries = callOrthanc("/series/" . $studyData['Series'][0]);
                if ($firstSeries) {
                    $modality = $firstSeries['MainDicomTags']['Modality'] ?? 'CT';
                }
            }
            
            $seriesCount = count($studyData['Series'] ?? []);
            $instanceCount = 0;
            foreach ($studyData['Series'] ?? [] as $seriesId) {
                $seriesData = callOrthanc("/series/$seriesId");
                if ($seriesData) {
                    $instanceCount += count($seriesData['Instances'] ?? []);
                }
            }
            
            // Format date
            if ($studyDate && strlen($studyDate) === 8) {
                $studyDate = substr($studyDate, 0, 4) . '-' . substr($studyDate, 4, 2) . '-' . substr($studyDate, 6, 2);
            } else {
                $studyDate = date('Y-m-d');
            }
            
            // Format time
            if ($studyTime && strlen($studyTime) >= 6) {
                $studyTime = substr($studyTime, 0, 2) . ':' . substr($studyTime, 2, 2) . ':' . substr($studyTime, 4, 2);
            } else {
                $studyTime = date('H:i:s');
            }
            
            // Check if study exists
            $stmt = $mysqli->prepare("SELECT study_instance_uid FROM cached_studies WHERE study_instance_uid = ?");
            $stmt->bind_param('s', $studyUID);
            $stmt->execute();
            $result = $stmt->get_result();
            $existingStudy = $result->fetch_assoc();
            $stmt->close();
            
            if ($existingStudy) {
                // Update existing
                $stmt = $mysqli->prepare("UPDATE cached_studies SET 
                    orthanc_id = ?, patient_id = ?, study_date = ?, study_time = ?, 
                    study_description = ?, accession_number = ?, modality = ?, 
                    series_count = ?, instance_count = ?, instances_count = ?, last_synced = NOW()
                    WHERE study_instance_uid = ?");
                $stmt->bind_param('sssssssiiss', 
                    $studyOrthancId, $patientId, $studyDate, $studyTime, 
                    $studyDesc, $accessionNumber, $modality, 
                    $seriesCount, $instanceCount, $instanceCount, $studyUID
                );
                $stmt->execute();
                $stmt->close();
                $studiesUpdated++;
            } else {
                // Insert new
                $stmt = $mysqli->prepare("INSERT INTO cached_studies (
                    study_instance_uid, orthanc_id, patient_id, study_date, study_time,
                    study_description, accession_number, modality, series_count, 
                    instance_count, instances_count, last_synced
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
                $stmt->bind_param('ssssssssiii', 
                    $studyUID, $studyOrthancId, $patientId, $studyDate, $studyTime,
                    $studyDesc, $accessionNumber, $modality, $seriesCount,
                    $instanceCount, $instanceCount
                );
                $stmt->execute();
                $stmt->close();
                $studiesAdded++;
            }
        }
    }
    
    // Update patient study counts and last study dates
    $mysqli->query("
        UPDATE cached_patients cp
        SET study_count = (
            SELECT COUNT(*) FROM cached_studies cs WHERE cs.patient_id = cp.patient_id
        ),
        last_study_date = (
            SELECT MAX(study_date) FROM cached_studies cs WHERE cs.patient_id = cp.patient_id
        )
    ");
    
    $mysqli->close();
    
    $duration = round(microtime(true) - $startTime, 2);
    
    echo json_encode([
        'success' => true,
        'studies_added' => $studiesAdded,
        'studies_updated' => $studiesUpdated,
        'duration_seconds' => $duration,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
