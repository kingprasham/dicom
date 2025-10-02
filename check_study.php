<?php
/**
 * Quick Check - What's in cached_studies for this report?
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/includes/db.php';

header('Content-Type: text/html; charset=utf-8');

echo "<pre style='background: #000; color: #0f0; padding: 20px;'>";
echo "<h2>Checking cached_studies for Orthanc ID: 31b02d85-5d02d762-934e2a0d-f741b6a9-48e69a67</h2>\n\n";

// Check by orthanc_id
$orthancId = '31b02d85-5d02d762-934e2a0d-f741b6a9-48e69a67';
$stmt = $mysqli->prepare("SELECT * FROM cached_studies WHERE orthanc_id = ?");
$stmt->bind_param('s', $orthancId);
$stmt->execute();
$result = $stmt->get_result();
$study = $result->fetch_assoc();
$stmt->close();

if ($study) {
    echo "✓ FOUND in cached_studies!\n\n";
    print_r($study);
} else {
    echo "✗ NOT FOUND in cached_studies by orthanc_id\n\n";
    
    // Try to find ANY studies
    echo "Looking for ANY studies in cached_studies...\n\n";
    $result = $mysqli->query("SELECT orthanc_id, study_instance_uid, patient_name, study_description FROM cached_studies LIMIT 5");
    while ($row = $result->fetch_assoc()) {
        echo "- Orthanc ID: {$row['orthanc_id']}\n";
        echo "  Study UID: {$row['study_instance_uid']}\n";
        echo "  Patient: {$row['patient_name']}\n";
        echo "  Study: {$row['study_description']}\n\n";
    }
}

echo "\n\nNow checking the report file...\n\n";
$reportFile = __DIR__ . '/reports/31b02d85-5d02d762-934e2a0d-f741b6a9-48e69a67_Unknown_Study_report.json';
if (file_exists($reportFile)) {
    echo "✓ Report file EXISTS\n";
    $content = file_get_contents($reportFile);
    $data = json_decode($content, true);
    echo "ImageId in report: {$data['imageId']}\n";
    echo "Patient: {$data['patientName']}\n";
    echo "Template: {$data['templateKey']}\n";
} else {
    echo "✗ Report file NOT FOUND\n";
}

$mysqli->close();
echo "</pre>";
?>
