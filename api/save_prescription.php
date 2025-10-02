<?php
/**
 * Save Prescription API
 */

header('Content-Type: application/json');

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/session.php';

// Validate session
$session = new SessionManager($mysqli);
if (!$session->validateSession()) {
    http_response_code(401);
    die(json_encode(['success' => false, 'error' => 'Unauthorized']));
}

try {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) {
        throw new Exception('Invalid JSON data');
    }
    
    $studyUID = $data['study_uid'] ?? '';
    $prescribingPhysician = $data['prescribing_physician'] ?? '';
    $medications = $data['medications'] ?? [];
    $instructions = $data['instructions'] ?? '';
    
    if (empty($studyUID)) {
        throw new Exception('Study UID is required');
    }
    
    if (empty($prescribingPhysician)) {
        throw new Exception('Prescribing physician is required');
    }
    
    if (empty($medications)) {
        throw new Exception('At least one medication is required');
    }
    
    // Get study info (patient_id only, we don't need patient_name in DB)
    $stmt = $mysqli->prepare("SELECT patient_id FROM cached_studies WHERE study_instance_uid = ? LIMIT 1");
    $stmt->bind_param('s', $studyUID);
    $stmt->execute();
    $result = $stmt->get_result();
    $study = $result->fetch_assoc();
    $stmt->close();
    
    if (!$study) {
        // Study might not be in cache, use the UID directly
        $study = ['patient_id' => 'UNKNOWN'];
    }
    
    // Prepare prescription data
    $prescriptionData = [
        'prescribing_physician' => $prescribingPhysician,
        'medications' => $medications,
        'instructions' => $instructions,
        'created_at' => date('Y-m-d H:i:s'),
        'created_by' => $_SESSION['user_id'] ?? 'system'
    ];
    
    // Save to database (without patient_name column)
    $sql = "INSERT INTO prescriptions (
        study_instance_uid,
        patient_id,
        prescribing_physician,
        prescription_data,
        created_at,
        created_by
    ) VALUES (?, ?, ?, ?, NOW(), ?)
    ON DUPLICATE KEY UPDATE
        prescribing_physician = VALUES(prescribing_physician),
        prescription_data = VALUES(prescription_data),
        updated_at = NOW(),
        updated_by = VALUES(created_by)";
    
    $prescriptionJson = json_encode($prescriptionData);
    $userId = $_SESSION['user_id'] ?? 'system';
    
    $stmt = $mysqli->prepare($sql);
    $stmt->bind_param('sssss',
        $studyUID,
        $study['patient_id'],
        $prescribingPhysician,
        $prescriptionJson,
        $userId
    );
    
    if ($stmt->execute()) {
        $stmt->close();
        echo json_encode([
            'success' => true,
            'message' => 'Prescription saved successfully',
            'prescription_id' => $mysqli->insert_id
        ]);
    } else {
        throw new Exception('Failed to save prescription: ' . $stmt->error);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
