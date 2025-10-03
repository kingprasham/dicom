<?php
/**
 * Orthanc Study Inspector
 * Shows what studies are actually in Orthanc for comparison
 */

require_once __DIR__ . '/config.php';

header('Content-Type: text/html; charset=utf-8');

echo "<!DOCTYPE html><html><head><title>Orthanc Inspector</title>";
echo "<style>
body{background:#000;color:#0f0;font-family:monospace;padding:20px;}
.success{color:#0f0;font-weight:bold;}
.error{color:#f00;font-weight:bold;}
.info{color:#0af;}
.warning{color:#ff0;}
table{border-collapse:collapse;margin:20px 0;background:#111;width:100%;}
th,td{border:1px solid #333;padding:10px;text-align:left;}
th{background:#222;color:#0af;}
tr:hover{background:#1a1a1a;}
.uid{font-size:10px;font-family:monospace;}
</style></head><body>";

echo "<h1>🔍 Orthanc Study Inspector</h1>";
echo "<pre>\n";

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

echo "Orthanc URL: <span class='info'>" . ORTHANC_URL . "</span>\n";
echo "Connecting to Orthanc...\n\n";

$patients = callOrthanc('/patients');

if (!$patients) {
    echo "<span class='error'>✗ Failed to connect to Orthanc!</span>\n";
    echo "Make sure Orthanc is running at " . ORTHANC_URL . "\n";
    exit;
}

echo "<span class='success'>✓ Connected! Found " . count($patients) . " patients</span>\n\n";

$totalStudies = 0;
$patientStudies = [];

foreach ($patients as $patientOrthancId) {
    $patientData = callOrthanc("/patients/$patientOrthancId");
    
    if (!$patientData) continue;
    
    $patientId = $patientData['MainDicomTags']['PatientID'] ?? 'UNKNOWN';
    $patientName = $patientData['MainDicomTags']['PatientName'] ?? 'Unknown';
    $studies = $patientData['Studies'] ?? [];
    
    if (!isset($patientStudies[$patientId])) {
        $patientStudies[$patientId] = [
            'name' => $patientName,
            'orthanc_id' => $patientOrthancId,
            'studies' => []
        ];
    }
    
    foreach ($studies as $studyOrthancId) {
        $studyData = callOrthanc("/studies/$studyOrthancId");
        
        if (!$studyData) continue;
        
        $studyUID = $studyData['MainDicomTags']['StudyInstanceUID'] ?? 'UNKNOWN';
        $studyDesc = $studyData['MainDicomTags']['StudyDescription'] ?? 'No Description';
        $studyDate = $studyData['MainDicomTags']['StudyDate'] ?? 'Unknown';
        $studyTime = $studyData['MainDicomTags']['StudyTime'] ?? 'Unknown';
        
        $seriesCount = count($studyData['Series'] ?? []);
        $instanceCount = 0;
        
        foreach ($studyData['Series'] ?? [] as $seriesId) {
            $seriesData = callOrthanc("/series/$seriesId");
            if ($seriesData) {
                $instanceCount += count($seriesData['Instances'] ?? []);
            }
        }
        
        $patientStudies[$patientId]['studies'][] = [
            'orthanc_id' => $studyOrthancId,
            'study_uid' => $studyUID,
            'description' => $studyDesc,
            'date' => $studyDate,
            'time' => $studyTime,
            'series' => $seriesCount,
            'images' => $instanceCount
        ];
        
        $totalStudies++;
    }
}

echo "=== ORTHANC CONTENTS ===\n";
echo "Total Patients: " . count($patientStudies) . "\n";
echo "Total Studies: $totalStudies\n\n";

echo "</pre>";

foreach ($patientStudies as $patientId => $data) {
    echo "<h2 style='color:#0af;'>Patient: {$data['name']} (ID: $patientId)</h2>";
    echo "<p style='color:#666;'>Orthanc ID: {$data['orthanc_id']}</p>";
    echo "<p style='color:#fff;'>Studies in Orthanc: <strong>" . count($data['studies']) . "</strong></p>";
    
    if (count($data['studies']) > 0) {
        echo "<table>";
        echo "<tr>";
        echo "<th>#</th>";
        echo "<th>Description</th>";
        echo "<th>Date</th>";
        echo "<th>Time</th>";
        echo "<th>Series</th>";
        echo "<th>Images</th>";
        echo "<th>Study Instance UID</th>";
        echo "<th>Orthanc ID</th>";
        echo "</tr>";
        
        foreach ($data['studies'] as $index => $study) {
            echo "<tr>";
            echo "<td>" . ($index + 1) . "</td>";
            echo "<td>{$study['description']}</td>";
            echo "<td>{$study['date']}</td>";
            echo "<td>{$study['time']}</td>";
            echo "<td>{$study['series']}</td>";
            echo "<td><span class='success'>{$study['images']}</span></td>";
            echo "<td class='uid'>" . substr($study['study_uid'], 0, 50) . "...</td>";
            echo "<td class='uid'>{$study['orthanc_id']}</td>";
            echo "</tr>";
        }
        
        echo "</table>";
    }
}

echo "<pre>\n";
echo "=== COMPARISON ===\n";
echo "Studies in Orthanc for Patient '0': ";

if (isset($patientStudies['0'])) {
    $orthancCount = count($patientStudies['0']['studies']);
    echo "<strong>$orthancCount</strong>\n";
    
    require_once __DIR__ . '/includes/db.php';
    $result = $mysqli->query("SELECT COUNT(*) as count FROM cached_studies WHERE patient_id = '0'");
    $row = $result->fetch_assoc();
    $dbCount = $row['count'];
    
    echo "Studies in Database for Patient '0': <strong>$dbCount</strong>\n\n";
    
    if ($orthancCount == $dbCount) {
        echo "<span class='success'>✓ MATCH! Counts are equal.</span>\n";
    } else {
        echo "<span class='warning'>⚠ MISMATCH! Orthanc has $orthancCount but database has $dbCount</span>\n";
        echo "\n<span class='info'>RECOMMENDATION:</span>\n";
        echo "Run sync_orthanc.php to update the database\n";
    }
    
    // Show detailed comparison
    if ($orthancCount > 1) {
        echo "\n=== DETAILED STUDY UIDs ===\n";
        echo "Studies in Orthanc:\n";
        foreach ($patientStudies['0']['studies'] as $index => $study) {
            echo "  " . ($index + 1) . ". " . substr($study['study_uid'], 0, 60) . "... (" . $study['images'] . " images)\n";
        }
        
        echo "\nStudies in Database:\n";
        $result = $mysqli->query("SELECT study_instance_uid, instance_count FROM cached_studies WHERE patient_id = '0'");
        $index = 1;
        while ($row = $result->fetch_assoc()) {
            echo "  $index. " . substr($row['study_instance_uid'], 0, 60) . "... (" . $row['instance_count'] . " images)\n";
            $index++;
        }
    }
    
    $mysqli->close();
} else {
    echo "<span class='warning'>0 (Patient '0' not found in Orthanc)</span>\n";
}

echo "\n<a href='verify_fix.php' style='color:#0af;'>→ Run Verification</a> | ";
echo "<a href='sync_orthanc.php' style='color:#0af;'>→ Sync from Orthanc</a> | ";
echo "<a href='" . ORTHANC_URL . "' target='_blank' style='color:#0af;'>→ Open Orthanc Web UI</a>\n";

echo "</pre></body></html>";
?>
