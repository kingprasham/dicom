<?php
// check_report.php - FIXED VERSION

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
        echo json_encode(['success' => false, 'message' => 'Image ID or Study UID is required']);
        exit();
    }
    
    $reportsDir = 'reports/';
    
    if (!is_dir($reportsDir)) {
        echo json_encode(['success' => true, 'exists' => false, 'message' => 'No reports directory']);
        exit();
    }
    
    $reportExists = false;
    $foundFile = null;
    $lastModified = null;

    // --- NEW: Primary search method using Study UID ---
    // This is the correct way to find the report now.
    if (!empty($studyUID)) {
        $filepathByStudy = $reportsDir . $studyUID . '_report.json';
        if (file_exists($filepathByStudy)) {
            $reportExists = true;
            $foundFile = basename($filepathByStudy);
            $lastModified = filemtime($filepathByStudy);
        }
    }

    // --- FALLBACK: Original search method using Image ID (for older reports) ---
    if (!$reportExists && !empty($imageId)) {
        $files = glob($reportsDir . $imageId . '*_report.json');
        if (!empty($files)) {
            $reportExists = true;
            $foundFile = basename($files[0]);
            $lastModified = filemtime($files[0]);
        }
    }
    
    echo json_encode([
        'success' => true,
        'exists' => $reportExists,
        'filename' => $foundFile,
        'lastModified' => $lastModified ? date('c', $lastModified) : null
    ]);
    
} catch (Exception $e) {
    error_log('Check report error: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error checking report: ' . $e->getMessage()]);
}
?>