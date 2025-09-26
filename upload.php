<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['success' => false, 'message' => 'Only POST method is accepted.']));
}

if (!isset($_FILES['dicomFile']) || $_FILES['dicomFile']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    exit(json_encode(['success' => false, 'message' => 'File upload failed.']));
}

try {
    // --- Receive the file and the pre-parsed metadata ---
    $file = $_FILES['dicomFile'];
    $originalFileName = $file['name'];
    $tempFilePath = $file['tmp_name'];
    
    $tagsJson = $_POST['dicomTagsJson'] ?? '{}';
    $dicomTags = json_decode($tagsJson, true);

    if (json_last_error() !== JSON_ERROR_NONE || empty($dicomTags['seriesInstanceUID'])) {
        throw new Exception('Invalid or missing DICOM metadata received from client.');
    }

    require_once 'db_connect.php';

    // --- Store the File ---
    $uploadDir = 'dicom_files/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
    
    $uuid = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex(random_bytes(16)), 4));
    $filePath = $uploadDir . $uuid . '.dcm';
    $fileSize = filesize($tempFilePath);

    if (!move_uploaded_file($tempFilePath, $filePath)) {
        throw new Exception('Failed to move uploaded file to storage.');
    }
    
    // --- Save Record to Database using the PRE-PARSED METADATA ---
    $sql = "INSERT INTO dicom_files (
                id, file_name, file_path, file_size,
                patient_name, study_description, series_description,
                study_instance_uid, series_instance_uid, original_filename
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
    $stmt = $mysqli->prepare($sql);
    
    $stmt->bind_param(
        "sssissssss",
        $uuid, $originalFileName, $filePath, $fileSize,
        $dicomTags['patientName'],
        $dicomTags['studyDescription'],
        $dicomTags['seriesDescription'],
        $dicomTags['studyInstanceUID'],
        $dicomTags['seriesInstanceUID'],
        $originalFileName
    );

    if (!$stmt->execute()) {
        unlink($filePath); // Clean up if DB insert fails
        throw new Exception('Database insert failed: ' . $stmt->error);
    }
    $stmt->close();
    $mysqli->close();

    // --- Success ---
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'File uploaded and metadata processed successfully!',
        'id' => $uuid,
        'file_name' => $originalFileName,
        'patient_name' => $dicomTags['patientName'] ?? 'Unknown Patient',
        'study_description' => $dicomTags['studyDescription'] ?? 'DICOM Study',
        'series_description' => $dicomTags['seriesDescription'] ?? 'DICOM Series',
    ]);

} catch (Exception $e) {
    error_log("Upload Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>