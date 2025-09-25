<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

// Get the JSON data from the request body
$json_data = file_get_contents('php://input');
$data = json_decode($json_data);

// Basic validation
if (!$data || !isset($data->dicomFileId) || !isset($data->type) || !isset($data->value) || !isset($data->coordinates)) {
    http_response_code(400);
    echo json_encode(['message' => 'Invalid measurement data provided.']);
    exit();
}

// Sanitize data
$dicomFileId = $mysqli->real_escape_string($data->dicomFileId);
$type = $mysqli->real_escape_string($data->type);
$value = $mysqli->real_escape_string($data->value);
// Encode coordinates back to JSON for database storage
$coordinates = json_encode($data->coordinates);

// Prepare and execute the SQL statement to prevent SQL injection
$sql = "INSERT INTO measurements (dicom_file_id, type, value, coordinates) VALUES (?, ?, ?, ?)";
$stmt = $mysqli->prepare($sql);
if ($stmt === false) {
    http_response_code(500);
    echo json_encode(['message' => 'Failed to prepare the SQL statement: ' . $mysqli->error]);
    exit();
}

$stmt->bind_param("ssss", $dicomFileId, $type, $value, $coordinates);

if ($stmt->execute()) {
    http_response_code(201); // Created
    echo json_encode(['message' => 'Measurement saved successfully.', 'id' => $stmt->insert_id]);
} else {
    http_response_code(500);
    echo json_encode(['message' => 'Failed to save measurement: ' . $stmt->error]);
}

$stmt->close();
$mysqli->close();
?>