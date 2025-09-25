<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db_connect.php';

// Function to log debug information
function debug_log($message) {
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] GET_DICOM_DEBUG: $message", 3, 'get_dicom_debug.log');
}

debug_log("=== GET DICOM PROCESS STARTED ===");

if (!isset($_GET['id']) || empty($_GET['id'])) {
    debug_log("ERROR: No ID provided in GET parameters");
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'File ID is required']);
    exit();
}

$fileId = $_GET['id'];
debug_log("Requested file ID: " . $fileId);

try {
    // Check if database connection exists and is valid
    if (!isset($mysqli) || $mysqli->connect_error) {
        throw new Exception('Database connection not available: ' . ($mysqli->connect_error ?? 'Unknown error'));
    }
    debug_log("Database connection verified");

    // **FIXED**: Use string parameter binding for UUID
    $sql = "SELECT id, file_name, file_data, patient_name, study_description, series_description, uploaded_at FROM dicom_files WHERE id = ?";
    
    $stmt = $mysqli->prepare($sql);
    if ($stmt === false) {
        throw new Exception('Failed to prepare SQL statement: ' . $mysqli->error);
    }
    debug_log("SQL statement prepared successfully");

    // **FIXED**: Use 's' for string binding since UUID is varchar
    $stmt->bind_param("s", $fileId);
    debug_log("Parameter bound successfully");

    if (!$stmt->execute()) {
        throw new Exception('Failed to execute SQL statement: ' . $stmt->error);
    }
    debug_log("SQL statement executed successfully");

    $result = $stmt->get_result();
    $file = $result->fetch_assoc();

    if (!$file) {
        debug_log("ERROR: File not found with ID: " . $fileId);
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'File not found']);
        $stmt->close();
        exit();
    }

    debug_log("File found: " . $file['file_name']);
    debug_log("File data length: " . strlen($file['file_data']));

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

    debug_log("File data returned successfully");
    $stmt->close();

} catch (Exception $e) {
    debug_log("EXCEPTION CAUGHT: " . $e->getMessage());
    
    if (isset($stmt) && $stmt !== false) {
        $stmt->close();
    }
    
    error_log('Get DICOM Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error retrieving file: ' . $e->getMessage()
    ]);
    
    debug_log("=== GET DICOM PROCESS FAILED ===");
} finally {
    if (isset($mysqli) && $mysqli instanceof mysqli) {
        $mysqli->close();
        debug_log("Database connection closed");
    }
}

debug_log("=== GET DICOM PROCESS COMPLETED ===");
?>