<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/octet-stream');

$id = $_GET['id'] ?? '';
$format = $_GET['format'] ?? 'base64';

if (empty($id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No ID provided']);
    exit;
}

try {
    require_once 'db_connect.php';
    
    $stmt = $mysqli->prepare("SELECT file_path, file_data, file_name, original_filename FROM dicom_files WHERE id = ?");
    $stmt->bind_param("s", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    $file = $result->fetch_assoc();

    if (!$file) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'File not found']);
        exit;
    }

    if ($format === 'raw') {
        // Send raw DICOM file for download
        header('Content-Type: application/dicom');
        header('Content-Disposition: attachment; filename="' . ($file['original_filename'] ?: $file['file_name']) . '"');
        
        // Try file path first, then fall back to database blob
        if (file_exists($file['file_path'])) {
            readfile($file['file_path']);
        } else {
            echo base64_decode($file['file_data']);
        }
    } else {
        // Send base64 encoded for viewer
        header('Content-Type: application/json');
        
        if (file_exists($file['file_path'])) {
            $fileData = file_get_contents($file['file_path']);
            $base64Data = base64_encode($fileData);
        } else {
            $base64Data = $file['file_data'];
        }
        
        echo json_encode([
            'success' => true,
            'file_data' => $base64Data,
            'file_name' => $file['original_filename'] ?: $file['file_name']
        ]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>