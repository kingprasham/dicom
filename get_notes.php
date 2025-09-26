<?php
header('Content-Type: application/json');
ini_set('display_errors', 0);
ini_set('log_errors', 1);

$imageId = $_GET['imageId'] ?? '';

if (empty($imageId)) {
    http_response_code(400);
    exit(json_encode(['success' => false, 'message' => 'No image ID provided']));
}

try {
    require_once 'db_connect.php';
    
    // Get the SeriesInstanceUID from the DB using the imageId
    $stmt = $mysqli->prepare("SELECT series_instance_uid FROM dicom_files WHERE id = ? LIMIT 1");
    $stmt->bind_param("s", $imageId);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    
    if ($result && !empty($result['series_instance_uid'])) {
        $seriesInstanceUID = $result['series_instance_uid'];
        $safeIdentifier = preg_replace('/[^a-zA-Z0-9.-_]/', '_', $seriesInstanceUID);
        $notesFile = "notes/notes_" . $safeIdentifier . ".json";

        if (file_exists($notesFile)) {
            $notesContent = file_get_contents($notesFile);
            $notesData = json_decode($notesContent, true);
            if ($notesData) {
                exit(json_encode(['success' => true, 'notes' => $notesData]));
            }
        }
    }
    
    echo json_encode(['success' => false, 'message' => 'No notes found for this series.']);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
?>