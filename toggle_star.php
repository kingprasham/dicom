<?php
// File: toggle_star.php

header('Content-Type: application/json');
require_once 'db_connect.php'; // Make sure this path is correct

// Get input from the frontend
$input = json_decode(file_get_contents('php://input'), true);
$fileId = $input['id'] ?? '';
$isStarred = isset($input['is_starred']) ? (int)$input['is_starred'] : 0;

if (empty($fileId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'File ID is required']);
    exit;
}

// Validate isStarred is either 0 or 1
if ($isStarred !== 0 && $isStarred !== 1) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid starred status provided']);
    exit;
}

try {
    $stmt = $mysqli->prepare("UPDATE dicom_files SET is_starred = ? WHERE id = ?");
    if (!$stmt) {
        throw new Exception('Database statement preparation failed: ' . $mysqli->error);
    }

    $stmt->bind_param("is", $isStarred, $fileId);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Star status updated.']);
    } else {
        throw new Exception('Database query execution failed: ' . $stmt->error);
    }

    $stmt->close();
    $mysqli->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>