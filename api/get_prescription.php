<?php
/**
 * Get Study Prescription API
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
    $studyUID = $_GET['study_uid'] ?? '';
    
    if (empty($studyUID)) {
        throw new Exception('Study UID required');
    }
    
    $sql = "SELECT 
                p.*,
                u.full_name as created_by_name
            FROM prescriptions p
            LEFT JOIN users u ON p.created_by = u.id
            WHERE p.study_instance_uid = ?
            ORDER BY p.created_at DESC
            LIMIT 1";
    
    $stmt = $mysqli->prepare($sql);
    $stmt->bind_param('s', $studyUID);
    $stmt->execute();
    $result = $stmt->get_result();
    $prescription = $result->fetch_assoc();
    $stmt->close();
    
    if ($prescription) {
        echo json_encode([
            'success' => true,
            'exists' => true,
            'prescription' => $prescription
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'exists' => false,
            'message' => 'No prescription found'
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
