<?php
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
    
    // Validate required fields
    if (!isset($data['imageId']) || empty($data['imageId'])) {
        throw new Exception('Image ID is required');
    }
    
    // Create reports directory if it doesn't exist
    $reportsDir = 'reports/';
    if (!is_dir($reportsDir)) {
        if (!mkdir($reportsDir, 0755, true)) {
            throw new Exception('Failed to create reports directory');
        }
    }
    
    // Get image info from database for better file naming
    require_once 'db_connect.php';
    
    $stmt = $mysqli->prepare("SELECT patient_name, study_description, file_name FROM dicom_files WHERE id = ?");
    $stmt->bind_param("s", $data['imageId']);
    $stmt->execute();
    $result = $stmt->get_result();
    $imageInfo = $result->fetch_assoc();
    $stmt->close();
    
    // Create filename based on image ID and patient info
    $patientName = $imageInfo['patient_name'] ?? 'Unknown';
    $studyDesc = $imageInfo['study_description'] ?? 'Study';
    
    // Clean filename
    $cleanPatientName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $patientName);
    $cleanStudyDesc = preg_replace('/[^a-zA-Z0-9_-]/', '_', $studyDesc);
    
    $filename = $data['imageId'] . '_' . $cleanPatientName . '_' . $cleanStudyDesc . '_report.json';
    $filepath = $reportsDir . $filename;
    
    // Prepare report data with metadata
    $reportData = [
        'imageId' => $data['imageId'],
        'patientName' => $data['patientName'] ?? $patientName,
        'studyDescription' => $data['studyDescription'] ?? $studyDesc,
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
            
            // Store previous version in history
            if (!isset($reportData['previousVersions'])) {
                $reportData['previousVersions'] = [];
            }
            
            // Add current data as previous version
            $existingData['versionTimestamp'] = $existingData['lastModified'];
            $reportData['previousVersions'][] = $existingData;
            
            // Keep only last 10 versions
            if (count($reportData['previousVersions']) > 10) {
                $reportData['previousVersions'] = array_slice($reportData['previousVersions'], -10);
            }
        }
    }
    
    // Save report to file
    $jsonData = json_encode($reportData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
    if (file_put_contents($filepath, $jsonData) === false) {
        throw new Exception('Failed to save report file');
    }
    
    // Create backup copy with timestamp
    $backupFilename = $reportsDir . 'backup_' . $data['imageId'] . '_' . date('Y-m-d_H-i-s') . '.json';
    file_put_contents($backupFilename, $jsonData);
    
    $mysqli->close();
    
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