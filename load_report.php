<?php
// load_report.php - FIXED VERSION

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

try {
    // MODIFIED: Get both imageId and studyUID
    $imageId = $_GET['imageId'] ?? '';
    $studyUID = $_GET['studyUID'] ?? '';
    
    if (empty($imageId) && empty($studyUID)) {
        throw new Exception('Image ID or Study UID is required');
    }
    
    $reportsDir = 'reports/';
    
    if (!is_dir($reportsDir)) {
        echo json_encode(['success' => true, 'exists' => false, 'message' => 'No reports directory found']);
        exit();
    }
    
    $reportFile = null;

    // --- NEW: Primary search method using Study UID ---
    if (!empty($studyUID)) {
        $filepathByStudy = $reportsDir . $studyUID . '_report.json';
        if (file_exists($filepathByStudy)) {
            $reportFile = $filepathByStudy;
        }
    }
    
    // --- FALLBACK: Original search method using Image ID ---
    if (!$reportFile && !empty($imageId)) {
        $files = glob($reportsDir . $imageId . '*_report.json');
        if (!empty($files)) {
            $reportFile = $files[0];
        }
    }
    
    if (!$reportFile) {
        echo json_encode(['success' => true, 'exists' => false, 'message' => 'No report found for this study']);
        exit();
    }
    
    // Read and return the found report
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
    echo json_encode(['success' => false, 'message' => 'Failed to load report: ' . $e->getMessage()]);
}
?>