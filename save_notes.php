<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['imageId'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid input - imageId required']);
    exit;
}

// Debug logging
function debug_log($message) {
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] SAVE_NOTES: $message", 3, 'notes_debug.log');
}

debug_log("Save notes request received for imageId: " . $input['imageId']);

// Create notes directory if it doesn't exist
$notesDir = "notes";
if (!is_dir($notesDir)) {
    if (!mkdir($notesDir, 0755, true)) {
        debug_log("ERROR: Failed to create notes directory");
        echo json_encode(['success' => false, 'message' => 'Failed to create notes directory']);
        exit;
    }
    debug_log("Created notes directory: $notesDir");
}

// Get the image details from database to create consistent filename
$imageId = $input['imageId'];
$originalFilename = $input['originalFilename'] ?? '';

debug_log("Original filename from input: " . $originalFilename);

// Try to get more details from database if available
try {
    require_once 'db_connect.php';
    
    $stmt = $mysqli->prepare("SELECT file_name, original_filename FROM dicom_files WHERE id = ?");
    if ($stmt) {
        $stmt->bind_param("s", $imageId);
        $stmt->execute();
        $result = $stmt->get_result();
        $fileInfo = $result->fetch_assoc();
        $stmt->close();
        
        if ($fileInfo) {
            // Use database filename if available
            if (!empty($fileInfo['original_filename'])) {
                $originalFilename = $fileInfo['original_filename'];
            } elseif (!empty($fileInfo['file_name'])) {
                $originalFilename = $fileInfo['file_name'];
            }
            debug_log("Got filename from database: " . $originalFilename);
        }
    }
} catch (Exception $e) {
    debug_log("Warning: Could not query database for filename: " . $e->getMessage());
}

// Create a consistent filename based on imageId (most reliable)
$notesFile = $notesDir . "/notes_" . $imageId . ".json";

debug_log("Notes file path: " . $notesFile);

// Save notes with comprehensive metadata
$noteData = [
    'imageId' => $imageId,
    'originalFilename' => $originalFilename,
    'timestamp' => date('c'),
    'lastModified' => date('c'),
    'reportingPhysician' => $input['reportingPhysician'] ?? '',
    'clinicalHistory' => $input['clinicalHistory'] ?? '',
    'technique' => $input['technique'] ?? '',
    'findings' => $input['findings'] ?? '',
    'impression' => $input['impression'] ?? '',
    'recommendations' => $input['recommendations'] ?? '',
    'patientId' => $input['patientId'] ?? '',
    'studyDate' => $input['studyDate'] ?? '',
    'version' => '1.0'
];

debug_log("Attempting to save notes data: " . json_encode($noteData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

$jsonData = json_encode($noteData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

if (file_put_contents($notesFile, $jsonData) !== false) {
    debug_log("SUCCESS: Notes saved to file: " . $notesFile);
    echo json_encode([
        'success' => true, 
        'message' => 'Notes saved successfully', 
        'filename' => basename($notesFile),
        'filepath' => $notesFile,
        'imageId' => $imageId
    ]);
} else {
    debug_log("ERROR: Failed to save notes to file: " . $notesFile);
    debug_log("Directory writable: " . (is_writable($notesDir) ? 'YES' : 'NO'));
    debug_log("Directory exists: " . (is_dir($notesDir) ? 'YES' : 'NO'));
    
    echo json_encode([
        'success' => false, 
        'message' => 'Failed to save notes to file system',
        'debug_info' => [
            'notesDir' => $notesDir,
            'notesFile' => $notesFile,
            'dirExists' => is_dir($notesDir),
            'dirWritable' => is_writable($notesDir)
        ]
    ]);
}
?>