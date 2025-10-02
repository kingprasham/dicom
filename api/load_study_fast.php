<?php
/**
 * Fast Study Loader - uses mysqli
 * Loads all instances for a study in ONE request
 */

header('Content-Type: application/json');

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/session.php';

// Validate session
$session = new SessionManager($mysqli);
if (!$session->validateSession()) {
    http_response_code(401);
    die(json_encode(['error' => 'Unauthorized - Please login']));
}

$studyUID = $_GET['studyUID'] ?? '';

if (empty($studyUID)) {
    http_response_code(400);
    die(json_encode(['error' => 'Study UID required']));
}

try {
    // Get study from cache
    $stmt = $mysqli->prepare("
        SELECT orthanc_id, patient_id 
        FROM cached_studies 
        WHERE study_instance_uid = ?
    ");
    $stmt->bind_param('s', $studyUID);
    $stmt->execute();
    $result = $stmt->get_result();
    $study = $result->fetch_assoc();
    $stmt->close();
    
    if (!$study) {
        // Search Orthanc if not in cache
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, ORTHANC_URL . "/tools/find");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'Level' => 'Study',
            'Query' => ['StudyInstanceUID' => $studyUID]
        ]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_USERPWD, ORTHANC_USERNAME . ':' . ORTHANC_PASSWORD);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            throw new Exception('Study not found in Orthanc');
        }
        
        $studyIds = json_decode($response, true);
        if (empty($studyIds)) {
            throw new Exception('Study not found');
        }
        
        $orthancStudyId = $studyIds[0];
    } else {
        $orthancStudyId = $study['orthanc_id'];
    }
    
    // Use Orthanc bulk endpoint for FAST loading
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, ORTHANC_URL . "/studies/$orthancStudyId/instances");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERPWD, ORTHANC_USERNAME . ':' . ORTHANC_PASSWORD);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        throw new Exception('Failed to load instances from Orthanc');
    }
    
    $instances = json_decode($response, true);
    
    if (empty($instances)) {
        throw new Exception('No instances found in study');
    }
    
    // Get patient information from the first instance
    $patientName = 'Anonymous';
    if (!empty($instances)) {
        // Fetch detailed tags for the first instance to get patient info
        $firstInstanceId = $instances[0]['ID'];
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, ORTHANC_URL . "/instances/$firstInstanceId/simplified-tags");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERPWD, ORTHANC_USERNAME . ':' . ORTHANC_PASSWORD);
        $tagResponse = curl_exec($ch);
        curl_close($ch);
        
        if ($tagResponse) {
            $tags = json_decode($tagResponse, true);
            $patientName = $tags['PatientName'] ?? 'Anonymous';
        }
    }
    
    // Format for viewer
    $imageData = [];
    foreach ($instances as $instance) {
        $tags = $instance['MainDicomTags'] ?? [];
        $instanceNumber = intval($tags['InstanceNumber'] ?? 0);
        $imageData[] = [
            'imageId' => 'orthanc:' . $instance['ID'],
            'instanceId' => $instance['ID'],
            'instanceNumber' => $instanceNumber,
            'fileName' => 'image-' . str_pad($instanceNumber, 6, '0', STR_PAD_LEFT) . '.dcm',
            'patientName' => $patientName,
            'seriesInstanceUID' => $instance['ParentSeries'] ?? '',
            'sopInstanceUID' => $tags['SOPInstanceUID'] ?? '',
            'seriesDescription' => $tags['SeriesDescription'] ?? 'Unknown',
            'seriesNumber' => intval($tags['SeriesNumber'] ?? 0)
        ];
    }
    
    // Sort by series number first, then by instance number within series
    usort($imageData, function($a, $b) {
        // Compare series numbers first
        $seriesCompare = $a['seriesNumber'] - $b['seriesNumber'];
        if ($seriesCompare !== 0) {
            return $seriesCompare;
        }
        // If same series, sort by instance number
        return $a['instanceNumber'] - $b['instanceNumber'];
    });
    
    echo json_encode([
        'success' => true,
        'studyUID' => $studyUID,
        'orthancId' => $orthancStudyId,
        'patientName' => $patientName,
        'imageCount' => count($imageData),
        'images' => $imageData
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'details' => DEBUG_MODE ? $e->getTraceAsString() : null
    ]);
}
