<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
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
    $imageId = $_GET['imageId'] ?? '';
    
    if (empty($imageId)) {
        throw new Exception('Image ID is required');
    }
    
    $reportsDir = 'reports/';
    
    if (!is_dir($reportsDir)) {
        echo json_encode([
            'success' => false,
            'message' => 'No reports directory found'
        ]);
        exit();
    }
    
    // Get image info for better matching
    require_once 'db_connect.php';
    
    $stmt = $mysqli->prepare("SELECT patient_name, study_description, file_name FROM dicom_files WHERE id = ?");
    $stmt->bind_param("s", $imageId);
    $stmt->execute();
    $result = $stmt->get_result();
    $imageInfo = $result->fetch_assoc();
    $stmt->close();
    $mysqli->close();
    
    // Try multiple filename patterns to find the report
    $possibleFilenames = [];
    
    if ($imageInfo) {
        $cleanPatientName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $imageInfo['patient_name']);
        $cleanStudyDesc = preg_replace('/[^a-zA-Z0-9_-]/', '_', $imageInfo['study_description']);
        
        // Most likely filename pattern
        $possibleFilenames[] = $imageId . '_' . $cleanPatientName . '_' . $cleanStudyDesc . '_report.json';
    }
    
    // Fallback patterns
    $possibleFilenames[] = $imageId . '_report.json';
    $possibleFilenames[] = 'report_' . $imageId . '.json';
    
    // Search for files that start with the image ID
    $files = glob($reportsDir . $imageId . '*_report.json');
    foreach ($files as $file) {
        $possibleFilenames[] = basename($file);
    }
    
    // Try to find the report file
    $reportFile = null;
    foreach ($possibleFilenames as $filename) {
        $filepath = $reportsDir . $filename;
        if (file_exists($filepath)) {
            $reportFile = $filepath;
            break;
        }
    }
    
    if (!$reportFile) {
        echo json_encode([
            'success' => false,
            'message' => 'No report found for this image'
        ]);
        exit();
    }
    
    // Load and parse the report
    $reportContent = file_get_contents($reportFile);
    
    if ($reportContent === false) {
        throw new Exception('Failed to read report file');
    }
    
    $reportData = json_decode($reportContent, true);
    
    if (!$reportData) {
        throw new Exception('Invalid JSON in report file');
    }
    
    // Ensure the report belongs to the requested image
    if ($reportData['imageId'] !== $imageId) {
        throw new Exception('Report image ID mismatch');
    }
    
    echo json_encode([
        'success' => true,
        'report' => $reportData,
        'filename' => basename($reportFile),
        'lastModified' => $reportData['lastModified'] ?? null,
        'version' => $reportData['version'] ?? 1
    ]);
    
} catch (Exception $e) {
    error_log('Load report error: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to load report: ' . $e->getMessage()
    ]);
}
?>