<?php
// Fixed get_report_summary.php - Resolves database connection issues

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
ini_set('log_errors', 1);

try {
    if (!isset($_GET['imageId']) || empty($_GET['imageId'])) {
        throw new Exception('Image ID is required');
    }

    $imageId = $_GET['imageId'];
    
    // Initialize default response
    $response = [
        'success' => false,
        'exists' => false
    ];
    
    // Check if database connection exists and is working
    if (file_exists('db_connect.php')) {
        require_once 'db_connect.php';
        
        if (isset($mysqli) && $mysqli instanceof mysqli && !$mysqli->connect_error) {
            try {
                // Test connection before using it
                if ($mysqli->ping()) {
                    $stmt = $mysqli->prepare("SELECT template_key, reporting_physician, updated_at, report_file_path FROM medical_reports WHERE image_id = ? ORDER BY updated_at DESC LIMIT 1");
                    if ($stmt) {
                        $stmt->bind_param("s", $imageId);
                        if ($stmt->execute()) {
                            $result = $stmt->get_result()->fetch_assoc();
                            
                            if ($result) {
                                // Calculate word count from report file if it exists
                                $wordCount = 0;
                                if (!empty($result['report_file_path']) && file_exists($result['report_file_path'])) {
                                    $reportContent = file_get_contents($result['report_file_path']);
                                    if ($reportContent !== false) {
                                        $reportData = json_decode($reportContent, true);
                                        
                                        if ($reportData && isset($reportData['sections'])) {
                                            $allText = '';
                                            foreach ($reportData['sections'] as $section) {
                                                if (is_array($section)) {
                                                    $allText .= ' ' . implode(' ', $section);
                                                } else {
                                                    $allText .= ' ' . $section;
                                                }
                                            }
                                            $wordCount = str_word_count(strip_tags($allText));
                                        }
                                    }
                                }

                                $response = [
                                    'success' => true,
                                    'exists' => true,
                                    'template' => $result['template_key'] ?: 'Unknown',
                                    'physician' => $result['reporting_physician'] ?: 'Not specified',
                                    'date' => $result['updated_at'] ?: date('Y-m-d H:i:s'),
                                    'wordCount' => $wordCount
                                ];
                            }
                        }
                        $stmt->close();
                    }
                }
            } catch (Exception $dbError) {
                error_log("Database error in get_report_summary: " . $dbError->getMessage());
                // Continue to file system check
            }
        }
    }
    
    // If not found in database, try file system search
    if (!$response['exists'] && is_dir('reports')) {
        try {
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator('reports', RecursiveDirectoryIterator::SKIP_DOTS)
            );
            $regex = new RegexIterator(
                $iterator, 
                '/.*' . preg_quote($imageId, '/') . '.*\.json$/i', 
                RecursiveRegexIterator::GET_MATCH
            );
            
            foreach ($regex as $file) {
                $filePath = $file[0];
                if (is_file($filePath)) {
                    $reportContent = file_get_contents($filePath);
                    if ($reportContent !== false) {
                        $reportData = json_decode($reportContent, true);
                        
                        if ($reportData && isset($reportData['imageId']) && $reportData['imageId'] === $imageId) {
                            // Calculate word count
                            $allText = '';
                            if (isset($reportData['sections'])) {
                                foreach ($reportData['sections'] as $section) {
                                    if (is_array($section)) {
                                        $allText .= ' ' . implode(' ', $section);
                                    } else {
                                        $allText .= ' ' . $section;
                                    }
                                }
                            }
                            $wordCount = str_word_count(strip_tags($allText));
                            
                            $response = [
                                'success' => true,
                                'exists' => true,
                                'template' => $reportData['templateKey'] ?? 'Unknown',
                                'physician' => $reportData['reportingPhysician'] ?? 'Not specified',
                                'date' => $reportData['modified'] ?? date('Y-m-d H:i:s'),
                                'wordCount' => $wordCount
                            ];
                            break;
                        }
                    }
                }
            }
        } catch (Exception $fsError) {
            error_log("File system error in get_report_summary: " . $fsError->getMessage());
        }
    }

    echo json_encode($response);

} catch (Exception $e) {
    error_log("Get report summary error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'exists' => false,
        'message' => $e->getMessage()
    ]);
} finally {
    // Only close if connection exists and is still open
    if (isset($mysqli) && $mysqli instanceof mysqli) {
        try {
            if ($mysqli->ping()) {
                $mysqli->close();
            }
        } catch (Exception $closeError) {
            // Ignore close errors
        }
    }
}
?>