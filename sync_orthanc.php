<?php
/**
 * Sync Studies from Orthanc to Database - FIXED FOR YOUR TABLE STRUCTURE
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/includes/db.php';

header('Content-Type: text/html; charset=utf-8');

echo "<!DOCTYPE html><html><head><title>Orthanc Sync</title>";
echo "<style>body{background:#000;color:#0f0;font-family:monospace;padding:20px;}";
echo ".success{color:#0f0;font-weight:bold;}.error{color:#f00;font-weight:bold;}";
echo ".info{color:#0af;}.warning{color:#ff0;}</style></head><body>";

echo "<h1>🔄 Syncing Studies from Orthanc to Database</h1>";
echo "<pre>\n";

// Orthanc API endpoint
$orthancUrl = ORTHANC_URL;

echo "Orthanc URL: $orthancUrl\n";
echo "Connecting to Orthanc...\n\n";

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

// Get all patients from Orthanc
echo "=== FETCHING PATIENTS ===\n";
$patients = callOrthanc('/patients');

if (!$patients) {
    echo "<span class='error'>✗ Failed to connect to Orthanc!</span>\n";
    echo "Check your Orthanc configuration in config.php\n";
    echo "URL: $orthancUrl\n";
    echo "Make sure Orthanc is running!\n";
    exit;
}

echo "<span class='success'>✓ Found " . count($patients) . " patients in Orthanc</span>\n\n";

$studiesAdded = 0;
$studiesUpdated = 0;

// Process each patient
foreach ($patients as $patientOrthancId) {
    // Get patient details
    $patientData = callOrthanc("/patients/$patientOrthancId");
    
    if (!$patientData) {
        echo "<span class='warning'>⚠ Skipping patient: $patientOrthancId (no data)</span>\n";
        continue;
    }
    
    $patientId = $patientData['MainDicomTags']['PatientID'] ?? 'UNKNOWN';
    $patientName = $patientData['MainDicomTags']['PatientName'] ?? 'Unknown';
    
    echo "\nPatient: <span class='info'>$patientName</span> (ID: $patientId)\n";
    
    // Check if patient exists in cached_patients (using patient_id as unique key)
    $stmt = $mysqli->prepare("SELECT patient_id FROM cached_patients WHERE patient_id = ?");
    $stmt->bind_param('s', $patientId);
    $stmt->execute();
    $result = $stmt->get_result();
    $cachedPatient = $result->fetch_assoc();
    $stmt->close();
    
    if (!$cachedPatient) {
        // Insert patient
        $birthDate = $patientData['MainDicomTags']['PatientBirthDate'] ?? null;
        $sex = $patientData['MainDicomTags']['PatientSex'] ?? null;
        
        if ($birthDate && strlen($birthDate) === 8) {
            $birthDate = substr($birthDate, 0, 4) . '-' . substr($birthDate, 4, 2) . '-' . substr($birthDate, 6, 2);
        } else {
            $birthDate = null;
        }
        
        $stmt = $mysqli->prepare("INSERT INTO cached_patients (orthanc_id, patient_id, patient_birth_date, patient_sex, studies_count, last_study_date) VALUES (?, ?, ?, ?, 0, CURDATE())");
        $stmt->bind_param('ssss', $patientOrthancId, $patientId, $birthDate, $sex);
        $stmt->execute();
        $stmt->close();
        
        echo "  <span class='success'>✓ Added patient to cache</span>\n";
    }
    
    // Get studies for this patient
    $studies = $patientData['Studies'] ?? [];
    echo "  Studies in Orthanc: " . count($studies) . "\n";
    
    foreach ($studies as $studyOrthancId) {
        // Get study details
        $studyData = callOrthanc("/studies/$studyOrthancId");
        
        if (!$studyData) {
            continue;
        }
        
        $studyUID = $studyData['MainDicomTags']['StudyInstanceUID'] ?? null;
        $studyDate = $studyData['MainDicomTags']['StudyDate'] ?? null;
        $studyTime = $studyData['MainDicomTags']['StudyTime'] ?? null;
        $studyDesc = $studyData['MainDicomTags']['StudyDescription'] ?? 'PACS Study';
        $accessionNumber = $studyData['MainDicomTags']['AccessionNumber'] ?? null;
        
        // Get modality from series (Orthanc stores it there)
        $modality = null;
        if (isset($studyData['Series']) && count($studyData['Series']) > 0) {
            $firstSeries = callOrthanc("/series/" . $studyData['Series'][0]);
            if ($firstSeries) {
                $modality = $firstSeries['MainDicomTags']['Modality'] ?? 'CT';
            }
        }
        if (!$modality) $modality = 'CT';
        
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
        
        // Format time - IMPORTANT: Use standard colons!
        if ($studyTime && strlen($studyTime) >= 6) {
            $studyTime = substr($studyTime, 0, 2) . ':' . substr($studyTime, 2, 2) . ':' . substr($studyTime, 4, 2);
        } else {
            $studyTime = date('H:i:s');
        }
        
        // Check if study already exists (by orthanc_id)
        $stmt = $mysqli->prepare("SELECT orthanc_id FROM cached_studies WHERE orthanc_id = ?");
        $stmt->bind_param('s', $studyOrthancId);
        $stmt->execute();
        $result = $stmt->get_result();
        $existingStudy = $result->fetch_assoc();
        $stmt->close();
        
        if ($existingStudy) {
            // Update existing study - match YOUR table columns!
            $stmt = $mysqli->prepare("UPDATE cached_studies SET 
                study_instance_uid = ?,
                patient_id = ?,
                study_date = ?,
                study_time = ?,
                study_description = ?,
                accession_number = ?,
                modality = ?,
                series_count = ?,
                instance_count = ?,
                last_synced = NOW()
                WHERE orthanc_id = ?");
            $stmt->bind_param('sssssssiis', 
                $studyUID, 
                $patientId, 
                $studyDate, 
                $studyTime, 
                $studyDesc, 
                $accessionNumber, 
                $modality, 
                $seriesCount, 
                $instanceCount,
                $studyOrthancId
            );
            $stmt->execute();
            $stmt->close();
            
            $studiesUpdated++;
            echo "  <span class='info'>↻ Updated: $studyDesc (Date: $studyDate, Time: $studyTime)</span>\n";
        } else {
            // Insert new study - match YOUR table columns!
            $stmt = $mysqli->prepare("INSERT INTO cached_studies (
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
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
            $stmt->bind_param('sssssssiis', 
                $studyUID, 
                $patientId, 
                $studyDate, 
                $studyTime, 
                $studyDesc, 
                $accessionNumber, 
                $modality, 
                $seriesCount,
                $instanceCount,
                $studyOrthancId
            );
            $stmt->execute();
            $stmt->close();
            
            $studiesAdded++;
            echo "  <span class='success'>✓ Added: $studyDesc (Date: $studyDate, Time: $studyTime)</span>\n";
        }
    }
}

echo "\n=== SYNC COMPLETE ===\n";
echo "<span class='success'>Studies Added: $studiesAdded</span>\n";
echo "<span class='info'>Studies Updated: $studiesUpdated</span>\n";

// Show summary
$result = $mysqli->query("SELECT COUNT(*) as count FROM cached_studies");
$row = $result->fetch_assoc();
echo "\nTotal studies in database: <strong>{$row['count']}</strong>\n";

$result = $mysqli->query("SELECT COUNT(*) as count FROM cached_patients");
$row = $result->fetch_assoc();
echo "Total patients in database: <strong>{$row['count']}</strong>\n";

echo "\n<span class='success'>✓✓✓ SYNC SUCCESSFUL ✓✓✓</span>\n";
echo "\n<a href='pages/studies.html' style='color:#0af;'>→ Go to Studies Page</a> | ";
echo "<a href='quick_fix.php' style='color:#0af;'>← Back to Dashboard</a>\n";

$mysqli->close();
echo "</pre></body></html>";
?>
