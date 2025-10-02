<?php
/**
 * Debug: Test Report File Search Patterns
 */

$orthancId = '31b02d85-5d02d762-934e2a0d-f741b6a9-48e69a67';
$reportDir = __DIR__ . '/reports';

echo "<pre style='background: #000; color: #0f0; padding: 20px; font-family: monospace;'>";
echo "=== TESTING FILE SEARCH PATTERNS ===\n\n";
echo "Orthanc ID: $orthancId\n";
echo "Report Dir: $reportDir\n";
echo "Dir Exists: " . (is_dir($reportDir) ? 'YES' : 'NO') . "\n\n";

if (!is_dir($reportDir)) {
    echo "ERROR: Reports directory does not exist!\n";
    exit;
}

// List all files
echo "--- ALL FILES IN DIRECTORY ---\n";
$allFiles = scandir($reportDir);
foreach ($allFiles as $file) {
    if ($file != '.' && $file != '..') {
        echo "  $file\n";
    }
}

echo "\n--- TESTING GLOB PATTERNS ---\n\n";

// Pattern 1
$pattern1 = $reportDir . '/' . $orthancId . '*_report.json';
echo "Pattern 1: " . $pattern1 . "\n";
$files1 = glob($pattern1);
echo "Matches: " . count($files1) . "\n";
if (!empty($files1)) {
    foreach ($files1 as $f) {
        echo "  FOUND: " . basename($f) . "\n";
    }
}
echo "\n";

// Pattern 2
$pattern2 = $reportDir . '/*' . $orthancId . '*.json';
echo "Pattern 2: " . $pattern2 . "\n";
$files2 = glob($pattern2);
echo "Matches: " . count($files2) . "\n";
if (!empty($files2)) {
    foreach ($files2 as $f) {
        if (strpos(basename($f), 'backup_') !== 0) {
            echo "  FOUND (non-backup): " . basename($f) . "\n";
        } else {
            echo "  FOUND (backup): " . basename($f) . "\n";
        }
    }
}
echo "\n";

// Filter out backups from pattern 2
$files2Filtered = array_filter($files2, function($f) {
    return strpos(basename($f), 'backup_') !== 0;
});
echo "After filtering backups: " . count($files2Filtered) . " files\n";
if (!empty($files2Filtered)) {
    echo "First file: " . basename($files2Filtered[array_key_first($files2Filtered)]) . "\n";
}

echo "\n--- EXPECTED FILENAME ---\n";
$expectedFile = $reportDir . '/' . $orthancId . '_Unknown_Study_report.json';
echo "Expected: " . basename($expectedFile) . "\n";
echo "Exists: " . (file_exists($expectedFile) ? 'YES' : 'NO') . "\n";

if (file_exists($expectedFile)) {
    echo "\n--- FILE CONTENT ---\n";
    $content = file_get_contents($expectedFile);
    $data = json_decode($content, true);
    if ($data) {
        echo "ImageId: " . $data['imageId'] . "\n";
        echo "Patient: " . $data['patientName'] . "\n";
        echo "Physician: " . $data['reportingPhysician'] . "\n";
        echo "Template: " . $data['templateKey'] . "\n";
    } else {
        echo "ERROR: Invalid JSON\n";
    }
}

echo "\n=== CONCLUSION ===\n";
if (!empty($files2Filtered)) {
    echo "✓ Report file CAN be found using Pattern 2\n";
    echo "✓ API should work if it's using this pattern\n";
} else {
    echo "✗ No report file found with any pattern\n";
}

echo "</pre>";
?>
