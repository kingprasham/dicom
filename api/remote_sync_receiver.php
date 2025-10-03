<?php
/**
 * Remote Sync Receiver
 * Place this on GoDaddy server
 * Receives study data from hospital PC
 */

header('Content-Type: application/json');

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/db.php';

// Simple API key authentication
$apiKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
$validApiKey = 'Prasham123$'; // Change this!

if ($apiKey !== $validApiKey) {
    http_response_code(401);
    die(json_encode(['error' => 'Unauthorized']));
}

// Get JSON data from request
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    die(json_encode(['error' => 'Invalid JSON']));
}

try {
    // Sync patients
    if (isset($data['patients'])) {
        foreach ($data['patients'] as $patient) {
            $stmt = $mysqli->prepare("
                INSERT INTO cached_patients 
                (patient_id, patient_name, patient_birth_date, patient_sex, orthanc_id, study_count, last_study_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                patient_name = VALUES(patient_name),
                patient_birth_date = VALUES(patient_birth_date),
                patient_sex = VALUES(patient_sex),
                orthanc_id = VALUES(orthanc_id),
                study_count = VALUES(study_count),
                last_study_date = VALUES(last_study_date)
            ");
            
            $stmt->bind_param('sssssis',
                $patient['patient_id'],
                $patient['patient_name'],
                $patient['patient_birth_date'],
                $patient['patient_sex'],
                $patient['orthanc_id'],
                $patient['study_count'],
                $patient['last_study_date']
            );
            
            $stmt->execute();
            $stmt->close();
        }
    }
    
    // Sync studies
    if (isset($data['studies'])) {
        foreach ($data['studies'] as $study) {
            $stmt = $mysqli->prepare("
                INSERT INTO cached_studies
                (study_instance_uid, orthanc_id, patient_id, study_date, study_time,
                 study_description, accession_number, modality, series_count,
                 instance_count, instances_count, last_synced)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                orthanc_id = VALUES(orthanc_id),
                patient_id = VALUES(patient_id),
                study_date = VALUES(study_date),
                study_time = VALUES(study_time),
                study_description = VALUES(study_description),
                accession_number = VALUES(accession_number),
                modality = VALUES(modality),
                series_count = VALUES(series_count),
                instance_count = VALUES(instance_count),
                instances_count = VALUES(instances_count),
                last_synced = NOW()
            ");
            
            $stmt->bind_param('ssssssssiii',
                $study['study_instance_uid'],
                $study['orthanc_id'],
                $study['patient_id'],
                $study['study_date'],
                $study['study_time'],
                $study['study_description'],
                $study['accession_number'],
                $study['modality'],
                $study['series_count'],
                $study['instance_count'],
                $study['instances_count']
            );
            
            $stmt->execute();
            $stmt->close();
        }
    }
    
    $mysqli->close();
    
    echo json_encode([
        'success' => true,
        'patients_synced' => count($data['patients'] ?? []),
        'studies_synced' => count($data['studies'] ?? []),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage()
    ]);
}
?>
