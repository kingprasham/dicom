<?php
// api/orthanc_proxy.php - Secure proxy to Orthanc with caching

define('PACS_ACCESS', true);
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/session.php';
require_once __DIR__ . '/../config.php';

header('Content-Type: application/json');

// Validate session
if (!$sessionManager->validateSession()) {
    http_response_code(401);
    die(json_encode(['error' => 'Unauthorized']));
}

class OrthancProxy {
    private $config;
    private $baseUrl;
    
    public function __construct($config) {
        $this->config = $config;
        $this->baseUrl = $config['orthanc_url'];
    }
    
    public function request($endpoint, $method = 'GET', $data = null) {
        $url = $this->baseUrl . $endpoint;
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
        
        // Add authentication if configured
        if (!empty($this->config['orthanc_user'])) {
            curl_setopt($ch, CURLOPT_USERPWD, 
                $this->config['orthanc_user'] . ':' . $this->config['orthanc_pass']
            );
        }
        
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if ($data) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
                curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            }
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error) {
            throw new Exception("Orthanc request failed: $error");
        }
        
        if ($httpCode !== 200) {
            throw new Exception("Orthanc returned HTTP $httpCode");
        }
        
        return json_decode($response, true);
    }
    
    public function getPatients() {
        return $this->request('/patients');
    }
    
    public function getPatientInfo($patientId) {
        return $this->request("/patients/$patientId");
    }
    
    public function getStudyInfo($studyId) {
        return $this->request("/studies/$studyId");
    }
    
    public function getStudyInstances($studyId) {
        return $this->request("/studies/$studyId/instances");
    }
    
    public function getInstanceFile($instanceId) {
        $url = $this->baseUrl . "/instances/$instanceId/file";
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_BINARYTRANSFER, true);
        
        if (!empty($this->config['orthanc_user'])) {
            curl_setopt($ch, CURLOPT_USERPWD, 
                $this->config['orthanc_user'] . ':' . $this->config['orthanc_pass']
            );
        }
        
        $data = curl_exec($ch);
        curl_close($ch);
        
        return $data;
    }
}

try {
    $action = $_GET['action'] ?? '';
    $orthanc = new OrthancProxy($config);
    
    switch ($action) {
        case 'patients':
            $patients = $orthanc->getPatients();
            echo json_encode(['success' => true, 'data' => $patients]);
            break;
            
        case 'patient':
            $patientId = $_GET['id'] ?? '';
            if (empty($patientId)) {
                throw new Exception('Patient ID required');
            }
            $patient = $orthanc->getPatientInfo($patientId);
            echo json_encode(['success' => true, 'data' => $patient]);
            break;
            
        case 'study':
            $studyId = $_GET['id'] ?? '';
            if (empty($studyId)) {
                throw new Exception('Study ID required');
            }
            $study = $orthanc->getStudyInfo($studyId);
            echo json_encode(['success' => true, 'data' => $study]);
            break;
            
        default:
            throw new Exception('Invalid action');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}