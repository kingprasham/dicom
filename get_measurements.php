<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

// Get the file ID from the query parameter
$fileId = isset($_GET['id']) ? $_GET['id'] : '';

if (empty($fileId)) {
    http_response_code(400);
    echo json_encode(['message' => 'File ID is required.']);
    exit();
}

// Sanitize the input
$fileId = $mysqli->real_escape_string($fileId);

// Prepare and execute the SQL statement
$sql = "SELECT * FROM measurements WHERE dicom_file_id = ?";
$stmt = $mysqli->prepare($sql);
if ($stmt === false) {
    http_response_code(500);
    echo json_encode(['message' => 'Failed to prepare statement.']);
    exit();
}

$stmt->bind_param("s", $fileId);
$stmt->execute();
$result = $stmt->get_result();

$measurements = [];
while ($row = $result->fetch_assoc()) {
    // Decode the JSON coordinates back into an object/array for the frontend
    $row['coordinates'] = json_decode($row['coordinates']);
    $measurements[] = $row;
}

echo json_encode($measurements);

$stmt->close();
$mysqli->close();
?>