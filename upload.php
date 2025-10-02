<?php
/**
 * DICOM File Upload Handler - OPTIMIZED & SECURE VERSION
 * 
 * Security improvements:
 * - File size limits
 * - DICOM validation
 * - Better error handling
 * - Sanitized inputs
 */

header('Content-Type: application/json');
require_once 'db_connect.php';

// Configuration
define('MAX_FILE_SIZE', 100 * 1024 * 1024); // 100MB limit
define('UPLOAD_DIR', 'dicom_files/');
define('ALLOWED_EXTENSIONS', ['dcm', 'dicom']);

// Create upload directory if needed
if (!is_dir(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0750, true);
}

// Input validation
if (!isset($_FILES['dicomFile']) || !isset($_POST['dicomTagsJson'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing file or DICOM tags.']);
    exit;
}

$file = $_FILES['dicomFile'];
$tagsJson = $_POST['dicomTagsJson'];
$tags = json_decode($tagsJson, true);

// Validate file upload
if ($file['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'File upload error: ' . $file['error']]);
    exit;
}

// Validate JSON
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON tags.']);
    exit;
}

// Validate file size
if ($file['size'] > MAX_FILE_SIZE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'File too large. Max: ' . (MAX_FILE_SIZE / 1024 / 1024) . 'MB']);
    exit;
}

// Validate file extension
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (!in_array($ext, ALLOWED_EXTENSIONS)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid file type. Only .dcm or .dicom allowed.']);
    exit;
}

// Validate DICOM file (check for DICM signature at byte 128)
$handle = @fopen($file['tmp_name'], 'rb');
if ($handle) {
    fseek($handle, 128);
    $signature = fread($handle, 4);
    fclose($handle);
    
    if ($signature !== 'DICM') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Not a valid DICOM file (missing DICM signature).']);
        exit;
    }
}

// Check for existing file using SOPInstanceUID
$sopInstanceUID = $tags['sopInstanceUID'] ?? null;

if ($sopInstanceUID) {
    $stmt = $mysqli->prepare("SELECT id, file_name, patient_name, study_description, series_description, is_starred FROM dicom_files WHERE sop_instance_uid = ? LIMIT 1");
    $stmt->bind_param("s", $sopInstanceUID);
    $stmt->execute();
    $result = $stmt->get_result();
    $existingFile = $result->fetch_assoc();
    $stmt->close();

    if ($existingFile) {
        // File already exists
        $existingFile['is_starred'] = (int)$existingFile['is_starred'];
        echo json_encode($existingFile);
        exit;
    }
}

// Process new upload
try {
    $fileId = uniqid('dcm_', true);
    $fileName = basename($file['name']); // Sanitize filename
    $fileSize = $file['size'];
    $filePath = UPLOAD_DIR . $fileId . '.dcm';

    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        throw new Exception('Failed to move uploaded file.');
    }

    // Set secure file permissions
    chmod($filePath, 0640);

    // Prepare data for insertion
    $patientName = isset($tags['patientName']) ? substr($tags['patientName'], 0, 255) : 'Unknown';
    $studyDesc = isset($tags['studyDescription']) ? substr($tags['studyDescription'], 0, 255) : '';
    $seriesDesc = isset($tags['seriesDescription']) ? substr($tags['seriesDescription'], 0, 255) : '';
    $studyUID = isset($tags['studyInstanceUID']) ? substr($tags['studyInstanceUID'], 0, 255) : '';
    $seriesUID = isset($tags['seriesInstanceUID']) ? substr($tags['seriesInstanceUID'], 0, 255) : '';

    // Insert into database
    $sql = "INSERT INTO dicom_files (id, file_name, file_path, file_size, patient_name, study_description, series_description, study_instance_uid, series_instance_uid, sop_instance_uid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        unlink($filePath); // Clean up file
        throw new Exception('Database prepare failed: ' . $mysqli->error);
    }
    
    $stmt->bind_param("sssissssss", $fileId, $fileName, $filePath, $fileSize, $patientName, $studyDesc, $seriesDesc, $studyUID, $seriesUID, $sopInstanceUID);

    if (!$stmt->execute()) {
        unlink($filePath); // Clean up file if DB insert fails
        throw new Exception('Database execute failed: ' . $stmt->error);
    }
    
    $stmt->close();

    // Return success response
    echo json_encode([
        'id' => $fileId,
        'file_name' => $fileName,
        'patient_name' => $patientName,
        'study_description' => $studyDesc,
        'series_description' => $seriesDesc,
        'is_starred' => 0
    ]);

} catch (Exception $e) {
    error_log("Upload error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
} finally {
    if (isset($mysqli) && $mysqli instanceof mysqli) {
        $mysqli->close();
    }
}
?>