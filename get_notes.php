<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$imageId = $_GET['imageId'] ?? '';
$originalFilename = $_GET['filename'] ?? '';

if (empty($imageId)) {
    echo json_encode(['success' => false, 'message' => 'No image ID provided']);
    exit;
}

$notesDir = "notes";

// Try to find notes file by original filename first
if (!empty($originalFilename)) {
    $baseFilename = pathinfo($originalFilename, PATHINFO_FILENAME);
    $notesFile = $notesDir . "/notes_" . preg_replace('/[^a-zA-Z0-9_-]/', '_', $baseFilename) . ".json";
} else {
    $notesFile = $notesDir . "/notes_" . md5($imageId) . ".json";
}

if (file_exists($notesFile)) {
    $notes = json_decode(file_get_contents($notesFile), true);
    echo json_encode(['success' => true, 'notes' => $notes]);
} else {
    echo json_encode(['success' => false, 'message' => 'No notes found']);
}
?>