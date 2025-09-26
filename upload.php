<?php
// File: upload.php

header('Content-Type: application/json');
require_once 'db_connect.php'; // Ensure this path is correct

// --- Configuration ---
$uploadDir = 'dicom_files/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// --- Input Validation ---
if (!isset($_FILES['dicomFile']) || !isset($_POST['dicomTagsJson'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing file or DICOM tags.']);
    exit;
}

$file = $_FILES['dicomFile'];
$tagsJson = $_POST['dicomTagsJson'];
$tags = json_decode($tagsJson, true);

if ($file['error'] !== UPLOAD_ERR_OK || json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'File upload error or invalid JSON tags.']);
    exit;
}

// --- Check for Existing File using SOPInstanceUID ---
$sopInstanceUID = $tags['sopInstanceUID'] ?? null;

if ($sopInstanceUID) {
    $stmt = $mysqli->prepare("SELECT id, file_name, patient_name, study_description, series_description, is_starred FROM dicom_files WHERE sop_instance_uid = ? LIMIT 1");
    $stmt->bind_param("s", $sopInstanceUID);
    $stmt->execute();
    $result = $stmt->get_result();
    $existingFile = $result->fetch_assoc();
    $stmt->close();

    if ($existingFile) {
        // File already exists, return its data (including star status) and stop.
        // We need to ensure the is_starred value is an integer for JavaScript.
        $existingFile['is_starred'] = (int)$existingFile['is_starred'];
        echo json_encode($existingFile);
        exit;
    }
}

// --- File Does Not Exist: Proceed with New Upload ---
try {
    $fileId = uniqid('dcm_', true);
    $fileName = $file['name'];
    $fileSize = $file['size'];
    $filePath = $uploadDir . $fileId . '.dcm';

    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        throw new Exception('Failed to move uploaded file.');
    }

    // Prepare data for insertion
    $patientName = $tags['patientName'] ?? 'Unknown';
    $studyDesc = $tags['studyDescription'] ?? '';
    $seriesDesc = $tags['seriesDescription'] ?? '';
    $studyUID = $tags['studyInstanceUID'] ?? '';
    $seriesUID = $tags['seriesInstanceUID'] ?? '';

    $sql = "INSERT INTO dicom_files (id, file_name, file_path, file_size, patient_name, study_description, series_description, study_instance_uid, series_instance_uid, sop_instance_uid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        throw new Exception('DB prepare failed: ' . $mysqli->error);
    }
    
    $stmt->bind_param("sssissssss", $fileId, $fileName, $filePath, $fileSize, $patientName, $studyDesc, $seriesDesc, $studyUID, $seriesUID, $sopInstanceUID);

    if (!$stmt->execute()) {
        unlink($filePath); // Clean up file if DB insert fails
        throw new Exception('DB execute failed: ' . $stmt->error);
    }
    
    $stmt->close();

    // Return data for the newly created record
    echo json_encode([
        'id' => $fileId,
        'file_name' => $fileName,
        'patient_name' => $patientName,
        'study_description' => $studyDesc,
        'series_description' => $seriesDesc,
        'is_starred' => 0 // A new file is never starred
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
} finally {
    if (isset($mysqli) && $mysqli instanceof mysqli) {
        $mysqli->close();
    }
}
?>