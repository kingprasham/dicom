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
            'success' => true,
            'exists' => false,
            'message' => 'No reports directory found'
        ]);
        exit();
    }
    
    // Try to find report file
    $possibleFilenames = [];
    $possibleFilenames[] = $imageId . '_report.json';
    
    // Also search for any files with this image ID
    $files = glob($reportsDir . $imageId . '*_report.json');
    foreach ($files as $file) {
        $possibleFilenames[] = basename($file);
    }
    
    // Find the report file
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
            'success' => true,
            'exists' => false,
            'message' => 'No report found for this image'
        ]);
        exit();
    }
    
    // Read and return the report
    $reportContent = file_get_contents($reportFile);
    $reportData = json_decode($reportContent, true);
    
    if (!$reportData) {
        throw new Exception('Failed to parse report file');
    }
    
    echo json_encode([
        'success' => true,
        'exists' => true,
        'report' => $reportData,
        'filename' => basename($reportFile)
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
