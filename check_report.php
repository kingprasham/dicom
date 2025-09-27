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
        echo json_encode([
            'success' => false,
            'message' => 'Image ID is required'
        ]);
        exit();
    }
    
    $reportsDir = 'reports/';
    
    if (!is_dir($reportsDir)) {
        echo json_encode([
            'success' => true,
            'exists' => false,
            'message' => 'No reports directory'
        ]);
        exit();
    }
    
    // Get image info for filename matching
    require_once 'db_connect.php';
    
    $stmt = $mysqli->prepare("SELECT patient_name, study_description FROM dicom_files WHERE id = ?");
    $stmt->bind_param("s", $imageId);
    $stmt->execute();
    $result = $stmt->get_result();
    $imageInfo = $result->fetch_assoc();
    $stmt->close();
    $mysqli->close();
    
    // Try multiple filename patterns
    $possibleFilenames = [];
    
    if ($imageInfo) {
        $cleanPatientName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $imageInfo['patient_name']);
        $cleanStudyDesc = preg_replace('/[^a-zA-Z0-9_-]/', '_', $imageInfo['study_description']);
        $possibleFilenames[] = $imageId . '_' . $cleanPatientName . '_' . $cleanStudyDesc . '_report.json';
    }
    
    $possibleFilenames[] = $imageId . '_report.json';
    $possibleFilenames[] = 'report_' . $imageId . '.json';
    
    // Also search for any files starting with the image ID
    $files = glob($reportsDir . $imageId . '*_report.json');
    foreach ($files as $file) {
        $possibleFilenames[] = basename($file);
    }
    
    // Check if any report file exists
    $reportExists = false;
    $foundFile = null;
    $lastModified = null;
    
    foreach ($possibleFilenames as $filename) {
        $filepath = $reportsDir . $filename;
        if (file_exists($filepath)) {
            $reportExists = true;
            $foundFile = $filename;
            $lastModified = filemtime($filepath);
            break;
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
    
    echo json_encode([
        'success' => false,
        'message' => 'Error checking report: ' . $e->getMessage()
    ]);
}
?>