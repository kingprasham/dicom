<?php
/**
 * Fix Study Separation Issue
 * This script will:
 * 1. Fix column name mismatches
 * 2. Ensure studies are properly separated by study_instance_uid
 * 3. Re-sync from Orthanc with proper identification
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/includes/db.php';

header('Content-Type: text/html; charset=utf-8');

echo "<!DOCTYPE html><html><head><title>Fix Study Separation</title>";
echo "<style>body{background:#000;color:#0f0;font-family:monospace;padding:20px;}";
echo ".success{color:#0f0;font-weight:bold;}.error{color:#f00;font-weight:bold;}";
echo ".info{color:#0af;}.warning{color:#ff0;}</style></head><body>";

echo "<h1>🔧 Fixing Study Separation Issues</h1>";
echo "<pre>\n";

// Step 1: Check current table structure
echo "=== STEP 1: Checking Table Structure ===\n";
$result = $mysqli->query("SHOW COLUMNS FROM cached_studies LIKE 'instance%'");
$hasInstanceCount = false;
$hasInstancesCount = false;

while ($row = $result->fetch_assoc()) {
    echo "Found column: {$row['Field']}\n";
    if ($row['Field'] === 'instance_count') $hasInstanceCount = true;
    if ($row['Field'] === 'instances_count') $hasInstancesCount = true;
}

// Fix column name if needed
if ($hasInstancesCount && !$hasInstanceCount) {
    echo "\n<span class='warning'>⚠ Found 'instances_count' column, need to add 'instance_count' for compatibility</span>\n";
    echo "Adding instance_count column...\n";
    $mysqli->query("ALTER TABLE cached_studies ADD COLUMN instance_count INT DEFAULT 0 AFTER series_count");
    $mysqli->query("UPDATE cached_studies SET instance_count = instances_count");
    echo "<span class='success'>✓ Added instance_count column and copied data</span>\n";
} elseif ($hasInstanceCount && !$hasInstancesCount) {
    echo "\n<span class='warning'>⚠ Found 'instance_count' column, adding 'instances_count' as well</span>\n";
    $mysqli->query("ALTER TABLE cached_studies ADD COLUMN instances_count INT DEFAULT 0 AFTER series_count");
    $mysqli->query("UPDATE cached_studies SET instances_count = instance_count");
    echo "<span class='success'>✓ Added instances_count column and copied data</span>\n";
} else {
    echo "<span class='success'>✓ Both column variations exist</span>\n";
}

// Step 2: Check for duplicate studies
echo "\n=== STEP 2: Checking for Duplicate Studies ===\n";
$result = $mysqli->query("
    SELECT study_instance_uid, COUNT(*) as count 
    FROM cached_studies 
    GROUP BY study_instance_uid 
    HAVING count > 1
");

$duplicates = [];
while ($row = $result->fetch_assoc()) {
    $duplicates[] = $row;
    echo "<span class='warning'>⚠ Found {$row['count']} entries for study UID: {$row['study_instance_uid']}</span>\n";
}

if (count($duplicates) > 0) {
    echo "\n<span class='info'>Removing duplicates, keeping the most recent entry...</span>\n";
    foreach ($duplicates as $dup) {
        // Keep the most recent entry, delete others
        $mysqli->query("
            DELETE FROM cached_studies 
            WHERE study_instance_uid = '{$dup['study_instance_uid']}'
            AND id NOT IN (
                SELECT * FROM (
                    SELECT id FROM cached_studies 
                    WHERE study_instance_uid = '{$dup['study_instance_uid']}'
                    ORDER BY last_synced DESC 
                    LIMIT 1
                ) AS temp
            )
        ");
        echo "  <span class='success'>✓ Cleaned up duplicates for {$dup['study_instance_uid']}</span>\n";
    }
} else {
    echo "<span class='success'>✓ No duplicates found</span>\n";
}

// Step 3: Ensure study_instance_uid is unique
echo "\n=== STEP 3: Setting Unique Constraint ===\n";
$result = $mysqli->query("SHOW INDEX FROM cached_studies WHERE Key_name = 'idx_study_uid_unique'");
if ($result->num_rows == 0) {
    echo "Adding unique index on study_instance_uid...\n";
    $mysqli->query("ALTER TABLE cached_studies ADD UNIQUE INDEX idx_study_uid_unique (study_instance_uid)");
    echo "<span class='success'>✓ Added unique index on study_instance_uid</span>\n";
} else {
    echo "<span class='success'>✓ Unique index already exists</span>\n";
}

// Step 4: Re-sync with Orthanc to ensure data consistency
echo "\n=== STEP 4: Re-syncing with Orthanc ===\n";
echo "<span class='info'>Fetching data from Orthanc...</span>\n";

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

$patients = callOrthanc('/patients');

if (!$patients) {
    echo "<span class='error'>✗ Failed to connect to Orthanc!</span>\n";
    echo "URL: " . ORTHANC_URL . "\n";
    exit;
}

echo "<span class='success'>✓ Connected to Orthanc, found " . count($patients) . " patients</span>\n\n";

$studiesProcessed = 0;
$studiesAdded = 0;
$studiesUpdated = 0;

foreach ($patients as $patientOrthancId) {
    $patientData = callOrthanc("/patients/$patientOrthancId");
    
    if (!$patientData) continue;
    
    $patientId = $patientData['MainDicomTags']['PatientID'] ?? 'UNKNOWN';
    $patientName = $patientData['MainDicomTags']['PatientName'] ?? 'Unknown';
    
    echo "Processing Patient: <span class='info'>$patientName</span> (ID: $patientId)\n";
    
    // Ensure patient exists - check which columns are available
    $patientCheck = $mysqli->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cached_patients' AND COLUMN_NAME IN ('studies_count', 'last_study_date')");
    $hasStudiesCount = false;
    $hasLastStudyDate = false;
    while ($col = $patientCheck->fetch_assoc()) {
        if ($col['COLUMN_NAME'] == 'studies_count') $hasStudiesCount = true;
        if ($col['COLUMN_NAME'] == 'last_study_date') $hasLastStudyDate = true;
    }
    
    // Build INSERT based on available columns
    if ($hasStudiesCount && $hasLastStudyDate) {
        $stmt = $mysqli->prepare("INSERT IGNORE INTO cached_patients (orthanc_id, patient_id, patient_name, studies_count, last_study_date) VALUES (?, ?, ?, 0, CURDATE())");
        $stmt->bind_param('sss', $patientOrthancId, $patientId, $patientName);
    } elseif ($hasStudiesCount) {
        $stmt = $mysqli->prepare("INSERT IGNORE INTO cached_patients (orthanc_id, patient_id, patient_name, studies_count) VALUES (?, ?, ?, 0)");
        $stmt->bind_param('sss', $patientOrthancId, $patientId, $patientName);
    } elseif ($hasLastStudyDate) {
        $stmt = $mysqli->prepare("INSERT IGNORE INTO cached_patients (orthanc_id, patient_id, patient_name, last_study_date) VALUES (?, ?, ?, CURDATE())");
        $stmt->bind_param('sss', $patientOrthancId, $patientId, $patientName);
    } else {
        $stmt = $mysqli->prepare("INSERT IGNORE INTO cached_patients (orthanc_id, patient_id, patient_name) VALUES (?, ?, ?)");
        $stmt->bind_param('sss', $patientOrthancId, $patientId, $patientName);
    }
    $stmt->execute();
    $stmt->close();
    
    $studies = $patientData['Studies'] ?? [];
    
    foreach ($studies as $studyOrthancId) {
        $studyData = callOrthanc("/studies/$studyOrthancId");
        
        if (!$studyData) continue;
        
        $studyUID = $studyData['MainDicomTags']['StudyInstanceUID'] ?? null;
        
        if (!$studyUID) {
            echo "  <span class='warning'>⚠ Skipping study without UID</span>\n";
            continue;
        }
        
        $studyDate = $studyData['MainDicomTags']['StudyDate'] ?? null;
        $studyTime = $studyData['MainDicomTags']['StudyTime'] ?? null;
        $studyDesc = $studyData['MainDicomTags']['StudyDescription'] ?? 'PACS Study';
        $accessionNumber = $studyData['MainDicomTags']['AccessionNumber'] ?? null;
        
        // Get modality from first series
        $modality = 'CT'; // default
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
        
        // Check if study exists by study_instance_uid (this is the KEY fix!)
        $stmt = $mysqli->prepare("SELECT study_instance_uid FROM cached_studies WHERE study_instance_uid = ?");
        $stmt->bind_param('s', $studyUID);
        $stmt->execute();
        $result = $stmt->get_result();
        $existingStudy = $result->fetch_assoc();
        $stmt->close();
        
        // Check if table has patient_cache_id or last_synced or last_cached columns
        static $tableStructure = null;
        if ($tableStructure === null) {
            $tableStructure = [];
            $colResult = $mysqli->query("SHOW COLUMNS FROM cached_studies");
            while ($col = $colResult->fetch_assoc()) {
                $tableStructure[$col['Field']] = true;
            }
        }
        
        $hasPatientCacheId = isset($tableStructure['patient_cache_id']);
        $hasLastSynced = isset($tableStructure['last_synced']);
        $hasLastCached = isset($tableStructure['last_cached']);
        $timestampCol = $hasLastSynced ? 'last_synced' : ($hasLastCached ? 'last_cached' : null);
        
        if ($existingStudy) {
            // Update existing study
            $updateFields = "orthanc_id = ?, patient_id = ?, study_date = ?, study_time = ?, study_description = ?, accession_number = ?, modality = ?, series_count = ?, instance_count = ?, instances_count = ?";
            if ($timestampCol) {
                $updateFields .= ", $timestampCol = NOW()";
            }
            
            $stmt = $mysqli->prepare("UPDATE cached_studies SET $updateFields WHERE study_instance_uid = ?");
            $stmt->bind_param('sssssssiiss', 
                $studyOrthancId, 
                $patientId, 
                $studyDate, 
                $studyTime, 
                $studyDesc, 
                $accessionNumber, 
                $modality, 
                $seriesCount, 
                $instanceCount,
                $instanceCount,
                $studyUID
            );
            $stmt->execute();
            $stmt->close();
            
            $studiesUpdated++;
            echo "  <span class='info'>↻ Updated: $studyDesc ($instanceCount images)</span>\n";
        } else {
            // Insert new study - build query based on available columns
            $insertCols = "study_instance_uid, orthanc_id, patient_id, study_date, study_time, study_description, accession_number, modality, series_count, instance_count, instances_count";
            $insertVals = "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?";
            $bindTypes = 'ssssssssiii';
            $bindParams = [$studyUID, $studyOrthancId, $patientId, $studyDate, $studyTime, $studyDesc, $accessionNumber, $modality, $seriesCount, $instanceCount, $instanceCount];
            
            if ($timestampCol) {
                $insertCols .= ", $timestampCol";
                $insertVals .= ", NOW()";
            }
            
            $stmt = $mysqli->prepare("INSERT INTO cached_studies ($insertCols) VALUES ($insertVals)");
            $stmt->bind_param($bindTypes, ...$bindParams);
            $stmt->execute();
            $stmt->close();
            
            $studiesAdded++;
            echo "  <span class='success'>✓ Added: $studyDesc ($instanceCount images)</span>\n";
        }
        
        $studiesProcessed++;
    }
    
    echo "\n";
}

// Step 5: Verify results
echo "=== STEP 5: Verification ===\n";
$result = $mysqli->query("SELECT COUNT(*) as count FROM cached_studies");
$row = $result->fetch_assoc();
echo "Total studies in database: <strong>{$row['count']}</strong>\n";

$result = $mysqli->query("
    SELECT patient_id, COUNT(*) as study_count 
    FROM cached_studies 
    GROUP BY patient_id 
    ORDER BY study_count DESC
");

echo "\nStudies per patient:\n";
while ($row = $result->fetch_assoc()) {
    echo "  Patient {$row['patient_id']}: {$row['study_count']} studies\n";
}

echo "\n=== SUMMARY ===\n";
echo "<span class='success'>Studies Processed: $studiesProcessed</span>\n";
echo "<span class='success'>Studies Added: $studiesAdded</span>\n";
echo "<span class='info'>Studies Updated: $studiesUpdated</span>\n";

echo "\n<span class='success'>✓✓✓ FIX COMPLETE ✓✓✓</span>\n";
echo "\nNow check your studies page - each study should appear separately!\n";
echo "\n<a href='pages/studies.html?patient_id=0' style='color:#0af;'>→ Go to Studies Page</a>\n";

$mysqli->close();
echo "</pre></body></html>";
?>
