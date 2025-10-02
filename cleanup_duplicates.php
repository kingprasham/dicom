<?php
/**
 * Clean Up Duplicate Studies - FIXED VERSION
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/includes/db.php';

$orthancId = '31b02d85-5d02d762-934e2a0d-f741b6a9-48e69a67';

echo "<pre style='background: #000; color: #0f0; padding: 20px; font-family: monospace;'>";
echo "=== CLEANING UP DUPLICATE STUDIES ===\n\n";

// Find all studies with this orthanc_id
$stmt = $mysqli->prepare("SELECT * FROM cached_studies WHERE orthanc_id = ?");
$stmt->bind_param('s', $orthancId);
$stmt->execute();
$result = $stmt->get_result();
$studies = $result->fetch_all(MYSQLI_ASSOC);
$stmt->close();

echo "Found " . count($studies) . " studies with orthanc_id: $orthancId\n\n";

if (count($studies) > 1) {
    echo "Duplicates found! Keeping the first one and deleting others...\n\n";
    
    // Use study_instance_uid as identifier since there's no id column
    $keepUID = $studies[0]['study_instance_uid'];
    echo "Keeping study UID: $keepUID\n";
    
    foreach (array_slice($studies, 1) as $study) {
        echo "Deleting duplicate study UID: {$study['study_instance_uid']}\n";
        $stmt = $mysqli->prepare("DELETE FROM cached_studies WHERE study_instance_uid = ?");
        $stmt->bind_param('s', $study['study_instance_uid']);
        $stmt->execute();
        $stmt->close();
    }
    
    echo "\n✓ Duplicates removed!\n";
} else {
    echo "No duplicates found.\n";
}

echo "\n=== CURRENT STUDIES ===\n";
$result = $mysqli->query("SELECT orthanc_id, study_instance_uid, patient_id, study_description FROM cached_studies LIMIT 10");
if ($result) {
    $count = 0;
    while ($row = $result->fetch_assoc()) {
        $count++;
        echo "$count. Orthanc: " . substr($row['orthanc_id'], 0, 25) . "...\n";
        echo "   Study UID: " . substr($row['study_instance_uid'], 0, 30) . "...\n";
        echo "   Patient: {$row['patient_id']} | Desc: {$row['study_description']}\n\n";
    }
    echo "Total: $count studies\n";
}

$mysqli->close();
echo "</pre>";
?>
