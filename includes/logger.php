<?php
// includes/logger.php - HIPAA compliant access logging

define('PACS_ACCESS', true);
require_once __DIR__ . '/db.php';

class AccessLogger {
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    public function logAccess($userId, $action, $patientId = null, $studyUid = null) {
        $conn = $this->db->getConnection();
        $stmt = $conn->prepare(
            "INSERT INTO study_access_log (user_id, patient_id, study_instance_uid, action, ip_address, user_agent) 
             VALUES (?, ?, ?, ?, ?, ?)"
        );
        
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? '';
        $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);
        
        $stmt->bind_param("isssss", $userId, $patientId, $studyUid, $action, $ipAddress, $userAgent);
        $stmt->execute();
        $stmt->close();
    }
    
    public function getAccessHistory($userId = null, $limit = 100) {
        $conn = $this->db->getConnection();
        
        if ($userId) {
            $stmt = $conn->prepare(
                "SELECT * FROM study_access_log 
                 WHERE user_id = ? 
                 ORDER BY accessed_at DESC 
                 LIMIT ?"
            );
            $stmt->bind_param("ii", $userId, $limit);
        } else {
            $stmt = $conn->prepare(
                "SELECT * FROM study_access_log 
                 ORDER BY accessed_at DESC 
                 LIMIT ?"
            );
            $stmt->bind_param("i", $limit);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        $logs = $result->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        
        return $logs;
    }
}

$logger = new AccessLogger($db);