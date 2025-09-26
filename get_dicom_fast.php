<?php
header('Content-Type: application/json');
header('Cache-Control: max-age=3600, public');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle CORS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

$fileId = $_GET['id'] ?? '';
$format = $_GET['format'] ?? 'json';

if (empty($fileId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'File ID required']);
    exit;
}

try {
    require_once 'db_connect.php';
    
    if (!isset($mysqli) || $mysqli->connect_error) {
        throw new Exception('Database connection not available');
    }
    
    // For base64 format (MPR processing), try to get from database first for speed
    if ($format === 'base64') {
        $stmt = $mysqli->prepare("SELECT file_data, file_name, file_size, file_path FROM dicom_files WHERE id = ?");
        if (!$stmt) {
            throw new Exception('Failed to prepare statement: ' . $mysqli->error);
        }
        
        $stmt->bind_param("s", $fileId);
        
        if (!$stmt->execute()) {
            throw new Exception('Failed to execute query: ' . $stmt->error);
        }
        
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();
        
        if (!$row) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'File not found']);
            exit;
        }
        
        // If we have base64 data in database, return it directly (fastest)
        if (!empty($row['file_data'])) {
            echo json_encode([
                'success' => true,
                'file_data' => $row['file_data'],
                'file_name' => $row['file_name'] ?? 'unknown.dcm',
                'file_size' => strlen($row['file_data']),
                'format' => 'base64',
                'source' => 'database'
            ]);
            exit;
        }
        
        // Fallback to file system if no database cache
        if (!empty($row['file_path']) && file_exists($row['file_path'])) {
            $fileContent = file_get_contents($row['file_path']);
            if ($fileContent === false) {
                throw new Exception('Failed to read file content from disk');
            }
            
            $base64Data = base64_encode($fileContent);
            
            // Optionally update database cache for next time
            try {
                $updateStmt = $mysqli->prepare("UPDATE dicom_files SET file_data = ? WHERE id = ?");
                if ($updateStmt) {
                    $updateStmt->bind_param("ss", $base64Data, $fileId);
                    $updateStmt->execute();
                    $updateStmt->close();
                }
            } catch (Exception $cacheError) {
                // Cache update failed, but continue
            }
            
            echo json_encode([
                'success' => true,
                'file_data' => $base64Data,
                'file_name' => $row['file_name'] ?? 'unknown.dcm',
                'file_size' => strlen($fileContent),
                'format' => 'base64',
                'source' => 'filesystem'
            ]);
            exit;
        }
        
        // If we get here, file not found anywhere
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'File data not accessible']);
        exit;
    }
    
    // For other formats (arraybuffer, json), use filesystem approach
    // Get file info from database
    $stmt = $mysqli->prepare("SELECT file_path, file_name, file_size FROM dicom_files WHERE id = ?");
    if (!$stmt) {
        throw new Exception('Failed to prepare statement: ' . $mysqli->error);
    }
    
    $stmt->bind_param("s", $fileId);
    
    if (!$stmt->execute()) {
        throw new Exception('Failed to execute query: ' . $stmt->error);
    }
    
    $result = $stmt->get_result();
    $file = $result->fetch_assoc();
    $stmt->close();
    
    if (!$file) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'File not found']);
        exit;
    }
    
    // Check if file exists on disk
    if (!file_exists($file['file_path'])) {
        // Try to find it in database as fallback
        $stmt2 = $mysqli->prepare("SELECT file_data FROM dicom_files WHERE id = ?");
        if ($stmt2) {
            $stmt2->bind_param("s", $fileId);
            $stmt2->execute();
            $result2 = $stmt2->get_result();
            $fileData = $result2->fetch_assoc();
            $stmt2->close();
            
            if ($fileData && !empty($fileData['file_data'])) {
                echo json_encode([
                    'success' => true,
                    'file_data' => $fileData['file_data'],
                    'file_name' => $file['file_name'],
                    'format' => 'base64',
                    'source' => 'database_fallback'
                ]);
                exit;
            }
        }
        
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'File not found on disk']);
        exit;
    }
    
    // Handle different response formats
    if ($format === 'arraybuffer') {
        header('Content-Type: application/octet-stream');
        header('Content-Length: ' . filesize($file['file_path']));
        header('Content-Disposition: inline; filename="' . basename($file['file_name']) . '"');
        
        readfile($file['file_path']);
        
    } else {
        // Default JSON format with base64
        $fileSize = filesize($file['file_path']);
        $fileContent = file_get_contents($file['file_path']);
        
        if ($fileContent === false) {
            throw new Exception('Failed to read file content');
        }
        
        $base64Data = base64_encode($fileContent);
        
        echo json_encode([
            'success' => true,
            'file_data' => $base64Data,
            'file_name' => $file['file_name'],
            'file_size' => $fileSize,
            'format' => 'base64',
            'source' => 'filesystem'
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error: ' . $e->getMessage()
    ]);
    
} finally {
    if (isset($mysqli) && $mysqli instanceof mysqli) {
        $mysqli->close();
    }
}
?>