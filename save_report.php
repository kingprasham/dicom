<?php
// save_report.php - CLEANED VERSION

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

try {
    // Get JSON input
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) {
        throw new Exception('Invalid JSON data received');
    }
    
    // Prioritize StudyInstanceUID as the main identifier for the report file
    $studyUID = $data['studyInstanceUID'] ?? null;
    $imageId = $data['imageId'] ?? null;

    if (empty($studyUID)) {
        throw new Exception('StudyInstanceUID is required to save a report');
    }
    
    // Create reports directory if it doesn't exist
    $reportsDir = 'reports/';
    if (!is_dir($reportsDir)) {
        if (!mkdir($reportsDir, 0755, true)) {
            throw new Exception('Failed to create reports directory. Please check folder permissions.');
        }
    }
    
    // The filename is now based on the StudyInstanceUID, making it universally findable.
    $filename = $studyUID . '_report.json';
    $filepath = $reportsDir . $filename;
    
    // Prepare report data with all relevant metadata
    $reportData = [
        'imageId' => $imageId,
        'studyInstanceUID' => $studyUID,
        'seriesInstanceUID' => $data['seriesInstanceUID'] ?? null,
        'patientName' => $data['patientName'] ?? 'Unknown',
        'studyDescription' => $data['studyDescription'] ?? 'Study',
        'templateKey' => $data['templateKey'] ?? 'custom',
        'reportingPhysician' => $data['reportingPhysician'] ?? '',
        'reportDateTime' => $data['reportDateTime'] ?? date('c'),
        'sections' => $data['sections'] ?? [],
        'lastModified' => date('c'),
        'isAutoSave' => $data['isAutoSave'] ?? false,
        'version' => 1
    ];
    
    // Check if report already exists and increment version
    if (file_exists($filepath)) {
        $existingData = json_decode(file_get_contents($filepath), true);
        if ($existingData && isset($existingData['version'])) {
            $reportData['version'] = $existingData['version'] + 1;
            
            if (!isset($reportData['previousVersions'])) {
                $reportData['previousVersions'] = [];
            }
            
            $existingData['versionTimestamp'] = $existingData['lastModified'];
            $reportData['previousVersions'][] = $existingData;
            
            if (count($reportData['previousVersions']) > 10) {
                $reportData['previousVersions'] = array_slice($reportData['previousVersions'], -10);
            }
        }
    }
    
    // Save report to file
    $jsonData = json_encode($reportData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
    if (file_put_contents($filepath, $jsonData) === false) {
        throw new Exception('Failed to save report file. Please check folder permissions.');
    }
    
    // Create backup copy with timestamp
    $backupFilename = $reportsDir . 'backup_' . $studyUID . '_' . date('Y-m-d_H-i-s') . '.json';
    file_put_contents($backupFilename, $jsonData);
    
    echo json_encode([
        'success' => true,
        'message' => 'Report saved successfully',
        'filename' => $filename,
        'filepath' => $filepath,
        'version' => $reportData['version'],
        'timestamp' => $reportData['lastModified']
    ]);
    
} catch (Exception $e) {
    error_log('Save report error: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to save report: ' . $e->getMessage()
    ]);
}
?>