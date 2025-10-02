<?php
/**
 * Stream DICOM instance from Orthanc - uses mysqli for session
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/session.php';

// Check session
$session = new SessionManager($mysqli);
if (!$session->validateSession()) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$instanceId = $_GET['instanceId'] ?? '';

if (empty($instanceId)) {
    http_response_code(400);
    echo 'Instance ID required';
    exit;
}

try {
    // Stream directly from Orthanc
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, ORTHANC_URL . "/instances/$instanceId/file");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_BINARYTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERPWD, ORTHANC_USERNAME . ':' . ORTHANC_PASSWORD);
    
    $dicomData = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        http_response_code(404);
        echo 'DICOM file not found';
        exit;
    }
    
    // Stream to client
    header('Content-Type: application/dicom');
    header('Content-Length: ' . strlen($dicomData));
    header('Cache-Control: public, max-age=86400'); // Cache for 24 hours
    header('Content-Disposition: inline; filename="' . $instanceId . '.dcm"');
    echo $dicomData;
    
} catch (Exception $e) {
    http_response_code(500);
    echo 'Error: ' . $e->getMessage();
}
