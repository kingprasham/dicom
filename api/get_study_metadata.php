<?php
/**
 * Get Study Metadata API
 * Returns doctor info and other metadata
 */

header('Content-Type: application/json');

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/session.php';

$session = new SessionManager($mysqli);
if (!$session->validateSession()) {
    http_response_code(401);
    die(json_encode(['success' => false, 'error' => 'Unauthorized']));
}

try {
    $studyOrthancId = $_GET['study_orthanc_id'] ?? '';
    
    if (empty($studyOrthancId)) {
        throw new Exception('Study ID required');
    }
    
    $sql = "SELECT * FROM study_metadata WHERE study_orthanc_id = ? LIMIT 1";
    
    $stmt = $mysqli->prepare($sql);
    $stmt->bind_param('s', $studyOrthancId);
    $stmt->execute();
    $result = $stmt->get_result();
    $metadata = $result->fetch_assoc();
    $stmt->close();
    
    if ($metadata) {
        echo json_encode([
            'success' => true,
            'exists' => true,
            'metadata' => $metadata
        ]);
    } else {
        // Try to get from Orthanc
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, ORTHANC_URL . "/studies/$studyOrthancId");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERPWD, ORTHANC_USERNAME . ':' . ORTHANC_PASSWORD);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200) {
            $studyData = json_decode($response, true);
            $mainTags = $studyData['MainDicomTags'] ?? [];
            
            echo json_encode([
                'success' => true,
                'exists' => true,
                'metadata' => [
                    'referring_physician' => $mainTags['ReferringPhysicianName'] ?? 'Not specified',
                    'performed_by' => $mainTags['PerformingPhysicianName'] ?? 'Not specified',
                    'department' => $mainTags['InstitutionName'] ?? 'Not specified'
                ]
            ]);
        } else {
            echo json_encode([
                'success' => true,
                'exists' => false,
                'message' => 'No metadata found'
            ]);
        }
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
