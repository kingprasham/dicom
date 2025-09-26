<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db_connect.php';

if (!isset($_GET['id']) || empty($_GET['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'File ID is required']);
    exit();
}

$fileId = $_GET['id'];

try {
    // Check if database connection exists and is valid
    if (!isset($mysqli) || $mysqli->connect_error) {
        throw new Exception('Database connection not available: ' . ($mysqli->connect_error ?? 'Unknown error'));
    }

    $sql = "SELECT id, file_name, file_data, patient_name, study_description, series_description, uploaded_at FROM dicom_files WHERE id = ?";
    
    $stmt = $mysqli->prepare($sql);
    if ($stmt === false) {
        throw new Exception('Failed to prepare SQL statement: ' . $mysqli->error);
    }

    $stmt->bind_param("s", $fileId);

    if (!$stmt->execute()) {
        throw new Exception('Failed to execute SQL statement: ' . $stmt->error);
    }

    $result = $stmt->get_result();
    $file = $result->fetch_assoc();

    if (!$file) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'File not found']);
        $stmt->close();
        exit();
    }

    // Return the file data
    echo json_encode([
        'success' => true,
        'id' => $file['id'],
        'file_name' => $file['file_name'],
        'patient_name' => $file['patient_name'],
        'study_description' => $file['study_description'],
        'series_description' => $file['series_description'],
        'upload_time' => $file['uploaded_at'],
        'file_data' => $file['file_data']
    ]);

    $stmt->close();

} catch (Exception $e) {
    if (isset($stmt) && $stmt !== false) {
        $stmt->close();
    }
    
    error_log('Get DICOM Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error retrieving file: ' . $e->getMessage()
    ]);
} finally {
    if (isset($mysqli) && $mysqli instanceof mysqli) {
        $mysqli->close();
    }
}
?>