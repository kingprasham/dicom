<?php
// Enhanced error reporting and debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

function debug_log($message) {
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] DEBUG: $message", 3, 'upload_debug.log');
}

function processUploadedFile($file, $fileName, $patientName, $studyDescription, $seriesDescription, $mysqli) {
    // Create efficient file storage directory
    $uploadDir = 'dicom_files/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
        debug_log("Created directory: $uploadDir");
    }
    
    // Generate UUID for database
    $uuid = sprintf('%08x-%04x-%04x-%04x-%012x',
        mt_rand(), mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff), mt_rand()
    );
    
    // Use UUID as filename to avoid conflicts
    $filePath = $uploadDir . $uuid . '.dcm';
    
    debug_log("Moving uploaded file to: " . $filePath);
    debug_log("Source file: " . $file['tmp_name'] . " (size: " . filesize($file['tmp_name']) . ")");
    
    // Read file content and encode as base64 for database storage
    $fileContent = file_get_contents($file['tmp_name']);
    if ($fileContent === false) {
        throw new Exception('Failed to read uploaded file');
    }
    
    $base64Data = base64_encode($fileContent);
    $fileSize = strlen($fileContent);
    
    // Also store on disk for fast access
    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        debug_log("ERROR: Failed to move file from " . $file['tmp_name'] . " to " . $filePath);
        throw new Exception('Failed to store DICOM file');
    }
    
    debug_log("File moved successfully. New size: " . $fileSize . " bytes");
    
    // Insert into database with both file path AND base64 data for maximum compatibility
    $sql = "INSERT INTO dicom_files (id, file_name, file_path, file_data, patient_name, study_description, series_description, file_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = $mysqli->prepare($sql);
    
    if (!$stmt) {
        // Clean up file on prepare error
        unlink($filePath);
        throw new Exception('Failed to prepare SQL statement: ' . $mysqli->error);
    }
    
    $stmt->bind_param("sssssssi", $uuid, $fileName, $filePath, $base64Data, $patientName, $studyDescription, $seriesDescription, $fileSize);
    
    if (!$stmt->execute()) {
        // Clean up file on database error
        unlink($filePath);
        $stmt->close();
        throw new Exception('Database insert failed: ' . $stmt->error);
    }
    
    $stmt->close();
    debug_log("Database insert successful, ID: " . $uuid);
    
    return [
        'id' => $uuid,
        'file_path' => $filePath,
        'file_size' => $fileSize,
        'file_name' => $fileName,
        'patient_name' => $patientName,
        'study_description' => $studyDescription,
        'series_description' => $seriesDescription
    ];
}

debug_log("=== UPLOAD PROCESS STARTED ===");

// Set the content type to JSON for API-like responses
header('Content-Type: application/json');

try {
    require_once 'db_connect.php';
} catch (Exception $e) {
    debug_log("ERROR: Failed to include database connection: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection error: ' . $e->getMessage()]);
    exit();
}

// Check if the request is a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Only POST method is accepted.']);
    exit();
}

// Check if a file was uploaded successfully
if (!isset($_FILES['dicomFile'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No file uploaded.']);
    exit();
}

$file = $_FILES['dicomFile'];

// Enhanced error checking for file upload
switch ($file['error']) {
    case UPLOAD_ERR_OK:
        break;
    case UPLOAD_ERR_NO_FILE:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No file was uploaded.']);
        exit();
    case UPLOAD_ERR_INI_SIZE:
    case UPLOAD_ERR_FORM_SIZE:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'File too large.']);
        exit();
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'File upload error: ' . $file['error']]);
        exit();
}

// Validate file exists and is readable
if (!file_exists($file['tmp_name']) || !is_readable($file['tmp_name'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Uploaded file is not accessible.']);
    exit();
}

try {
    debug_log("Starting ultra-fast file processing");
    
    $fileName = $file['name'];
    debug_log("Processing file: " . $fileName);
    
    // Check database connection
    if (!isset($mysqli) || $mysqli->connect_error) {
        throw new Exception('Database connection not available: ' . ($mysqli->connect_error ?? 'Unknown error'));
    }
    
    // Set default values
    $patientName = 'Unknown Patient';
    $studyDescription = 'DICOM Study';
    $seriesDescription = 'DICOM Series';
    
    // Process form data if provided
    if (isset($_POST['patientName']) && !empty($_POST['patientName'])) {
        $patientName = $_POST['patientName'];
    }
    if (isset($_POST['studyDescription']) && !empty($_POST['studyDescription'])) {
        $studyDescription = $_POST['studyDescription'];
    }
    if (isset($_POST['seriesDescription']) && !empty($_POST['seriesDescription'])) {
        $seriesDescription = $_POST['seriesDescription'];
    }
    
    debug_log("Metadata: Patient='$patientName', Study='$studyDescription', Series='$seriesDescription'");
    
    // Process file with new ultra-fast method
    $result = processUploadedFile($file, $fileName, $patientName, $studyDescription, $seriesDescription, $mysqli);
    
    debug_log("File processing completed successfully");
    
    // Success response
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'File uploaded successfully',
        'id' => $result['id'],
        'file_name' => $result['file_name'],
        'patient_name' => $result['patient_name'],
        'study_description' => $result['study_description'],
        'series_description' => $result['series_description'],
        'file_size' => $result['file_size'],
        'upload_time' => date('Y-m-d H:i:s')
    ]);
    
    debug_log("=== UPLOAD PROCESS COMPLETED SUCCESSFULLY ===");
    
} catch (Exception $e) {
    debug_log("EXCEPTION CAUGHT: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Upload failed: ' . $e->getMessage()
    ]);
    
    debug_log("=== UPLOAD PROCESS FAILED ===");
    
} finally {
    if (isset($mysqli) && $mysqli instanceof mysqli) {
        $mysqli->close();
        debug_log("Database connection closed");
    }
}
?>