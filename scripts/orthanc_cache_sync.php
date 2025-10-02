<?php
/**
 * Orthanc Cache Sync - Matches YOUR table structure
 * - No id columns
 * - Uses UIDs as primary keys
 * - Uses last_synced not last_cached
 * - Uses mysqli
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/db.php';

echo "========================================\n";
echo "Orthanc Cache Sync\n";
echo "========================================\n\n";

$startTime = microtime(true);
$stats = [
    'patients' => 0,
    'studies' => 0,
    'series' => 0,
    'errors' => 0
];

try {
    // Test Orthanc
    echo "Testing Orthanc connection...\n";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, ORTHANC_URL . "/system");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_USERPWD, ORTHANC_USERNAME . ':' . ORTHANC_PASSWORD);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        throw new Exception("Cannot connect to Orthanc");
    }
    
    $systemInfo = json_decode($response, true);
    echo "Connected to Orthanc " . ($systemInfo['Version'] ?? 'unknown') . "\n\n";
    
    // Get patients
    echo "Fetching patients from Orthanc...\n";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, ORTHANC_URL . "/patients");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERPWD, ORTHANC_USERNAME . ':' . ORTHANC_PASSWORD);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    $patientIds = json_decode($response, true);
    
    if (empty($patientIds)) {
        echo "⚠ No patients in Orthanc!\n";
        exit(0);
    }
    
    echo "Found " . count($patientIds) . " patients\n\n";
    
    // Sync each patient
    foreach ($patientIds as $orthancPatientId) {
        try {
            syncPatient($mysqli, $orthancPatientId);
            $stats['patients']++;
            echo ".";
        } catch (Exception $e) {
            echo "\nError: " . $e->getMessage() . "\n";
            $stats['errors']++;
        }
    }
    
    echo "\n\n";
    
    $duration = round(microtime(true) - $startTime, 2);
    
    echo "========================================\n";
    echo "Sync Completed!\n";
    echo "========================================\n";
    echo "Duration: {$duration}s\n";
    echo "Patients synced: {$stats['patients']}\n";
    echo "Studies synced: {$stats['studies']}\n";
    echo "Series synced: {$stats['series']}\n";
    if ($stats['errors'] > 0) {
        echo "Errors: {$stats['errors']}\n";
    }
    
    // Show statistics
    $result = $mysqli->query("SELECT COUNT(*) as count FROM cached_patients");
    $patientCount = $result->fetch_assoc()['count'];
    
    $result = $mysqli->query("SELECT COUNT(*) as count FROM cached_studies");
    $studyCount = $result->fetch_assoc()['count'];
    
    $result = $mysqli->query("SELECT COUNT(*) as count FROM cached_series");
    $seriesCount = $result->fetch_assoc()['count'];
    
    echo "\nCache Statistics:\n";
    echo "- Total patients: $patientCount\n";
    echo "- Total studies: $studyCount\n";
    echo "- Total series: $seriesCount\n";
    echo "\n";
    
} catch (Exception $e) {
    echo "\n❌ Fatal Error: " . $e->getMessage() . "\n\n";
    exit(1);
}

function syncPatient($mysqli, $orthancPatientId) {
    global $stats;
    
    // Get patient details
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, ORTHANC_URL . "/patients/$orthancPatientId");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERPWD, ORTHANC_USERNAME . ':' . ORTHANC_PASSWORD);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    $patientData = json_decode($response, true);
    if (!$patientData) {
        throw new Exception("Failed to get patient data");
    }
    
    $tags = $patientData['MainDicomTags'] ?? [];
    $patientId = $tags['PatientID'] ?? 'UNKNOWN';
    $patientName = $tags['PatientName'] ?? 'Unknown';
    $patientSex = isset($tags['PatientSex']) ? substr($tags['PatientSex'], 0, 1) : '';
    $patientBirthDate = $tags['PatientBirthDate'] ?? null;
    
    // Format birth date
    if ($patientBirthDate && strlen($patientBirthDate) === 8) {
        $patientBirthDate = substr($patientBirthDate, 0, 4) . '-' . 
                           substr($patientBirthDate, 4, 2) . '-' . 
                           substr($patientBirthDate, 6, 2);
    } else {
        $patientBirthDate = null;
    }
    
    // Insert or update - YOUR table structure (patient_id is PRIMARY KEY)
    $stmt = $mysqli->prepare("
        INSERT INTO cached_patients 
        (patient_id, patient_name, patient_sex, patient_birth_date, orthanc_id, last_synced) 
        VALUES (?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
            patient_name = VALUES(patient_name),
            patient_sex = VALUES(patient_sex),
            patient_birth_date = VALUES(patient_birth_date),
            orthanc_id = VALUES(orthanc_id),
            last_synced = NOW()
    ");
    $stmt->bind_param("sssss", $patientId, $patientName, $patientSex, $patientBirthDate, $orthancPatientId);
    $stmt->execute();
    $stmt->close();
    
    // Sync studies
    $studies = $patientData['Studies'] ?? [];
    foreach ($studies as $orthancStudyId) {
        syncStudy($mysqli, $orthancStudyId, $patientId);
        $stats['studies']++;
    }
    
    // Update patient statistics
    $stmt = $mysqli->prepare("
        UPDATE cached_patients 
        SET study_count = (SELECT COUNT(*) FROM cached_studies WHERE patient_id = ?),
            last_study_date = (SELECT MAX(study_date) FROM cached_studies WHERE patient_id = ?)
        WHERE patient_id = ?
    ");
    $stmt->bind_param("sss", $patientId, $patientId, $patientId);
    $stmt->execute();
    $stmt->close();
}

function syncStudy($mysqli, $orthancStudyId, $patientId) {
    global $stats;
    
    // Get study details
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, ORTHANC_URL . "/studies/$orthancStudyId");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERPWD, ORTHANC_USERNAME . ':' . ORTHANC_PASSWORD);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    $studyData = json_decode($response, true);
    if (!$studyData) return;
    
    $tags = $studyData['MainDicomTags'] ?? [];
    $studyUid = $tags['StudyInstanceUID'] ?? '';
    $studyDate = $tags['StudyDate'] ?? null;
    $studyTime = $tags['StudyTime'] ?? null;
    $studyDescription = $tags['StudyDescription'] ?? '';
    $accessionNumber = $tags['AccessionNumber'] ?? '';
    
    // Get modality from first series
    $series = $studyData['Series'] ?? [];
    $modality = '';
    if (!empty($series)) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, ORTHANC_URL . "/series/" . $series[0]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERPWD, ORTHANC_USERNAME . ':' . ORTHANC_PASSWORD);
        $seriesResp = curl_exec($ch);
        curl_close($ch);
        $seriesData = json_decode($seriesResp, true);
        $modality = $seriesData['MainDicomTags']['Modality'] ?? '';
    }
    
    // Format date
    if ($studyDate && strlen($studyDate) === 8) {
        $studyDate = substr($studyDate, 0, 4) . '-' . 
                    substr($studyDate, 4, 2) . '-' . 
                    substr($studyDate, 6, 2);
    } else {
        $studyDate = null;
    }
    
    // Format time
    if ($studyTime && strlen($studyTime) >= 6) {
        $studyTime = substr($studyTime, 0, 2) . ':' . 
                    substr($studyTime, 2, 2) . ':' . 
                    substr($studyTime, 4, 2);
    } else {
        $studyTime = null;
    }
    
    // Insert or update - YOUR table structure (study_instance_uid is PRIMARY KEY)
    $stmt = $mysqli->prepare("
        INSERT INTO cached_studies 
        (study_instance_uid, patient_id, study_date, study_time, 
         study_description, modality, accession_number, orthanc_id, last_synced) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
            patient_id = VALUES(patient_id),
            study_date = VALUES(study_date),
            study_time = VALUES(study_time),
            study_description = VALUES(study_description),
            modality = VALUES(modality),
            accession_number = VALUES(accession_number),
            orthanc_id = VALUES(orthanc_id),
            last_synced = NOW()
    ");
    $stmt->bind_param("ssssssss", $studyUid, $patientId, $studyDate, $studyTime, 
                     $studyDescription, $modality, $accessionNumber, $orthancStudyId);
    $stmt->execute();
    $stmt->close();
    
    // Sync series
    foreach ($series as $orthancSeriesId) {
        syncSeries($mysqli, $orthancSeriesId, $studyUid);
        $stats['series']++;
    }
    
    // Update study statistics
    $stmt = $mysqli->prepare("
        UPDATE cached_studies 
        SET series_count = (SELECT COUNT(*) FROM cached_series WHERE study_instance_uid = ?),
            instance_count = (SELECT SUM(instance_count) FROM cached_series WHERE study_instance_uid = ?)
        WHERE study_instance_uid = ?
    ");
    $stmt->bind_param("sss", $studyUid, $studyUid, $studyUid);
    $stmt->execute();
    $stmt->close();
}

function syncSeries($mysqli, $orthancSeriesId, $studyUid) {
    // Get series details
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, ORTHANC_URL . "/series/$orthancSeriesId");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERPWD, ORTHANC_USERNAME . ':' . ORTHANC_PASSWORD);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    $seriesData = json_decode($response, true);
    if (!$seriesData) return;
    
    $tags = $seriesData['MainDicomTags'] ?? [];
    $seriesUid = $tags['SeriesInstanceUID'] ?? '';
    $seriesNumber = $tags['SeriesNumber'] ?? 0;
    $seriesDescription = $tags['SeriesDescription'] ?? '';
    $modality = $tags['Modality'] ?? '';
    $instanceCount = count($seriesData['Instances'] ?? []);
    
    // Insert or update - YOUR table structure (series_instance_uid is PRIMARY KEY)
    $stmt = $mysqli->prepare("
        INSERT INTO cached_series 
        (series_instance_uid, study_instance_uid, series_number, 
         series_description, modality, instance_count, orthanc_id, last_synced) 
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
            study_instance_uid = VALUES(study_instance_uid),
            series_number = VALUES(series_number),
            series_description = VALUES(series_description),
            modality = VALUES(modality),
            instance_count = VALUES(instance_count),
            orthanc_id = VALUES(orthanc_id),
            last_synced = NOW()
    ");
    $stmt->bind_param("ssissis", $seriesUid, $studyUid, $seriesNumber, 
                     $seriesDescription, $modality, $instanceCount, $orthancSeriesId);
    $stmt->execute();
    $stmt->close();
}
