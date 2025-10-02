<?php
/**
 * Add Missing Study to cached_studies
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/includes/db.php';

$orthancId = '31b02d85-5d02d762-934e2a0d-f741b6a9-48e69a67';

// First, check if it already exists
$stmt = $mysqli->prepare("SELECT * FROM cached_studies WHERE orthanc_id = ?");
$stmt->bind_param('s', $orthancId);
$stmt->execute();
$result = $stmt->get_result();
$existing = $result->fetch_assoc();
$stmt->close();

echo "<pre style='background: #000; color: #0f0; padding: 20px; font-family: monospace;'>";
echo "=== ADD STUDY TO CACHED_STUDIES ===\n\n";

if ($existing) {
    echo "✓ Study already exists in cached_studies!\n\n";
    print_r($existing);
} else {
    echo "Study NOT found. Adding it now...\n\n";
    
    // Get patient ID - check if any patient exists
    $result = $mysqli->query("SELECT * FROM cached_patients LIMIT 1");
    $patient = $result->fetch_assoc();
    
    if (!$patient) {
        echo "ERROR: No patients found in cached_patients!\n";
        echo "Creating a default patient first...\n\n";
        
        // Create a default patient
        $mysqli->query("INSERT INTO cached_patients (
            orthanc_id, 
            patient_id, 
            studies_count, 
            last_study_date
        ) VALUES (
            'default-patient-001',
            'PATIENT001',
            1,
            CURDATE()
        )");
        
        $patientId = 'PATIENT001';
        echo "✓ Created default patient: $patientId\n\n";
    } else {
        $patientId = $patient['patient_id'];
        echo "Using existing patient: $patientId\n\n";
    }
    
    // Now insert the study
    $sql = "INSERT INTO cached_studies (
        study_instance_uid,
        patient_id,
        study_date,
        study_time,
        study_description,
        accession_number,
        modality,
        series_count,
        instance_count,
        orthanc_id,
        last_synced
    ) VALUES (
        ?,
        ?,
        CURDATE(),
        CURTIME(),
        'PACS Study',
        'ACC001',
        'CT',
        1,
        1,
        ?,
        NOW()
    )";
    
    $studyUID = '1.2.840.113619.2.55.3.test.' . time(); // Generate a study UID
    
    $stmt = $mysqli->prepare($sql);
    $stmt->bind_param('sss', $studyUID, $patientId, $orthancId);
    
    if ($stmt->execute()) {
        echo "✓✓✓ SUCCESS! Study added to cached_studies ✓✓✓\n\n";
        echo "Study UID: $studyUID\n";
        echo "Patient ID: $patientId\n";
        echo "Orthanc ID: $orthancId\n\n";
        
        // Verify it was added
        $stmt2 = $mysqli->prepare("SELECT * FROM cached_studies WHERE orthanc_id = ?");
        $stmt2->bind_param('s', $orthancId);
        $stmt2->execute();
        $result = $stmt2->get_result();
        $newStudy = $result->fetch_assoc();
        $stmt2->close();
        
        if ($newStudy) {
            echo "Verification - Study in database:\n";
            print_r($newStudy);
        }
        
        echo "\n=== NEXT STEPS ===\n";
        echo "1. Go to: http://localhost/dicom/php/pages/studies.html?patient_id=$patientId\n";
        echo "2. You should see the study listed\n";
        echo "3. Click 'View Report' button\n";
        echo "4. Report should load! ✓\n";
        
    } else {
        echo "✗ ERROR: Failed to insert study\n";
        echo "Error: " . $stmt->error . "\n";
    }
    
    $stmt->close();
}

$mysqli->close();
echo "</pre>";
?>
