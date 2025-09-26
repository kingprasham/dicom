<?php
header('Content-Type: application/json');
ini_set('display_errors', 0);
ini_set('log_errors', 1);

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE || !isset($input['imageId'])) {
        throw new Exception('Invalid JSON or missing imageId.');
    }

    require_once 'db_connect.php';
    
    // Get the SeriesInstanceUID from the DB using the imageId
    $stmt = $mysqli->prepare("SELECT series_instance_uid FROM dicom_files WHERE id = ? LIMIT 1");
    $stmt->bind_param("s", $input['imageId']);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$result || empty($result['series_instance_uid'])) {
        throw new Exception('Could not find a SeriesInstanceUID for the given image.');
    }
    $seriesInstanceUID = $result['series_instance_uid'];
    
    // Use a sanitized SeriesInstanceUID as the unique filename
    $safeIdentifier = preg_replace('/[^a-zA-Z0-9.-_]/', '_', $seriesInstanceUID);
    $notesDir = "notes";
    if (!is_dir($notesDir)) mkdir($notesDir, 0775, true);
    
    $notesFile = $notesDir . "/notes_" . $safeIdentifier . ".json";
    
    // Versioning logic (remains the same)
    $history = [];
    if (file_exists($notesFile)) {
        $existingData = json_decode(file_get_contents($notesFile), true);
        if (!empty($existingData) && is_array($existingData)) {
            $history = $existingData['previousVersions'] ?? [];
            unset($existingData['previousVersions']);
            $history[] = $existingData;
        }
    }
    
    $input['previousVersions'] = array_slice($history, -10); // Keep last 10 versions
    $input['currentTimestamp'] = (new DateTime())->format(DateTime::ATOM);
    
    // Save the updated notes file
    if (file_put_contents($notesFile, json_encode($input, JSON_PRETTY_PRINT)) === false) {
        throw new Exception('Failed to write notes to file.');
    }

    echo json_encode(['success' => true, 'message' => 'Notes saved successfully using Series UID.']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>