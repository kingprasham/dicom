<?php
/**
 * Get Study Report API
 * Returns report data for a specific study
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
    $studyOrthancId = $_GET['study_orthanc_id'] ?? '';
    $studyUID = $_GET['study_uid'] ?? '';
    
    if (empty($studyOrthancId) && empty($studyUID)) {
        throw new Exception('Study ID required');
    }
    
    // Log for debugging
    error_log("=== GET STUDY REPORT ===");
    error_log("Orthanc ID: " . $studyOrthancId);
    error_log("Study UID: " . $studyUID);
    
    // If we have study UID but not orthanc ID, try to get it from cached_studies
    if (empty($studyOrthancId) && !empty($studyUID)) {
        $stmt = $mysqli->prepare("SELECT orthanc_id FROM cached_studies WHERE study_instance_uid = ? LIMIT 1");
        $stmt->bind_param('s', $studyUID);
        $stmt->execute();
        $result = $stmt->get_result();
        $cached = $result->fetch_assoc();
        $stmt->close();
        
        if ($cached) {
            $studyOrthancId = $cached['orthanc_id'];
            error_log("Found Orthanc ID from cached_studies: " . $studyOrthancId);
        }
    }
    
    // METHOD 1: Check database table 'medical_reports' if it exists
    $tableCheck = $mysqli->query("SHOW TABLES LIKE 'medical_reports'");
    if ($tableCheck->num_rows > 0) {
        $sql = "SELECT 
                    r.id,
                    r.study_orthanc_id,
                    r.study_instance_uid,
                    r.patient_id,
                    r.patient_name,
                    r.report_content,
                    r.report_file_path,
                    r.template_key,
                    r.reporting_physician,
                    r.referring_physician,
                    r.report_status,
                    r.report_date,
                    r.created_at,
                    r.updated_at,
                    u1.full_name as created_by_name,
                    u2.full_name as updated_by_name
                FROM medical_reports r
                LEFT JOIN users u1 ON r.created_by = u1.id
                LEFT JOIN users u2 ON r.updated_by = u2.id
                WHERE " . (!empty($studyOrthancId) ? "r.study_orthanc_id = ?" : "r.study_instance_uid = ?") . "
                ORDER BY r.updated_at DESC
                LIMIT 1";
        
        $stmt = $mysqli->prepare($sql);
        $searchParam = !empty($studyOrthancId) ? $studyOrthancId : $studyUID;
        $stmt->bind_param('s', $searchParam);
        $stmt->execute();
        $result = $stmt->get_result();
        $report = $result->fetch_assoc();
        $stmt->close();
        
        if ($report) {
            error_log("Found report in database");
            
            // If report content is in file, load it
            if (!empty($report['report_file_path']) && file_exists($report['report_file_path'])) {
                $fileContent = file_get_contents($report['report_file_path']);
                $reportData = json_decode($fileContent, true);
                if ($reportData) {
                    $report['report_content'] = $reportData;
                }
            } else if (!empty($report['report_content'])) {
                // Try to decode if it's JSON
                $decoded = json_decode($report['report_content'], true);
                if ($decoded) {
                    $report['report_content'] = $decoded;
                }
            }
            
            echo json_encode([
                'success' => true,
                'exists' => true,
                'report' => $report,
                'source' => 'database'
            ]);
            exit();
        }
    }
    
    // METHOD 2: Search file system using Orthanc ID
    // The imageId in saved reports is actually the Orthanc ID!
    $reportDir = __DIR__ . '/../reports';
    
    if (!is_dir($reportDir)) {
        error_log("Reports directory does not exist: " . $reportDir);
        echo json_encode([
            'success' => true,
            'exists' => false,
            'message' => 'No reports directory found'
        ]);
        exit();
    }
    
    $reportFile = null;
    
    // NEW ENHANCED SEARCH LOGIC:
    // Get all report files (excluding backups)
    $allReportFiles = glob($reportDir . '/*.json');
    $allReportFiles = array_filter($allReportFiles, function($f) {
        return strpos(basename($f), 'backup_') !== 0;
    });
    
    error_log("Total report files found: " . count($allReportFiles));
    
    // Search through each report file to match by imageId
    foreach ($allReportFiles as $file) {
        $content = @file_get_contents($file);
        if ($content) {
            $reportData = @json_decode($content, true);
            if ($reportData && isset($reportData['imageId'])) {
                $fileImageId = $reportData['imageId'];
                
                // Check if this report matches our Orthanc ID
                if (!empty($studyOrthancId) && $fileImageId === $studyOrthancId) {
                    $reportFile = $file;
                    error_log("Found report by imageId match: " . basename($file));
                    error_log("Matched Orthanc ID: $studyOrthancId");
                    break;
                }
            }
        }
    }
    
    // If still not found, try pattern matching as fallback
    if (!$reportFile && !empty($studyOrthancId)) {
        error_log("Trying pattern-based search with Orthanc ID: " . $studyOrthancId);
        
        // Pattern 1: orthancId_*_report.json
        $pattern1 = $reportDir . '/' . $studyOrthancId . '*_report.json';
        $files1 = glob($pattern1);
        error_log("Pattern 1: $pattern1 - Found: " . count($files1));
        
        if (!empty($files1)) {
            $reportFile = $files1[0];
            error_log("Found report file: " . basename($reportFile));
        }
        
        // Pattern 2: *orthancId*.json (contains orthanc ID anywhere)
        if (!$reportFile) {
            $pattern2 = $reportDir . '/*' . $studyOrthancId . '*.json';
            $files2 = glob($pattern2);
            error_log("Pattern 2: $pattern2 - Found: " . count($files2));
            
            // Filter out backup files
            $files2 = array_filter($files2, function($f) {
                return strpos(basename($f), 'backup_') !== 0;
            });
            
            if (!empty($files2)) {
                $reportFile = $files2[0];
                error_log("Found report file: " . basename($reportFile));
            }
        }
    }
    
    // Try finding by Study UID if Orthanc ID search failed
    if (!$reportFile && !empty($studyUID)) {
        error_log("Searching by Study UID: " . $studyUID);
        $pattern = $reportDir . '/*' . $studyUID . '*.json';
        $files = glob($pattern);
        
        $files = array_filter($files, function($f) {
            return strpos(basename($f), 'backup_') !== 0;
        });
        
        if (!empty($files)) {
            $reportFile = $files[0];
            error_log("Found report file by UID: " . basename($reportFile));
        }
    }
    
    // If we found a report file, load and return it
    if ($reportFile && file_exists($reportFile)) {
        error_log("Loading report from file: " . $reportFile);
        
        $fileContent = file_get_contents($reportFile);
        $reportData = json_decode($fileContent, true);
        
        if (!$reportData) {
            throw new Exception('Invalid JSON in report file');
        }
        
        error_log("Report loaded successfully");
        
        // Convert file-based report to expected format
        $formattedReport = [
            'report_content' => [
                'indication' => $reportData['sections']['indication'] ?? '',
                'technique' => $reportData['sections']['technique'] ?? '',
                'findings' => is_array($reportData['sections']['findings'] ?? null) 
                    ? implode("\n\n", array_map(function($k, $v) {
                        return ucfirst(str_replace('_', ' ', $k)) . ": " . $v;
                    }, array_keys($reportData['sections']['findings']), $reportData['sections']['findings']))
                    : ($reportData['sections']['findings'] ?? ''),
                'impression' => $reportData['sections']['impression'] ?? ''
            ],
            'report_status' => 'final',
            'reporting_physician' => $reportData['reportingPhysician'] ?? 'Unknown',
            'report_date' => isset($reportData['reportDateTime']) 
                ? date('Y-m-d', strtotime($reportData['reportDateTime'])) 
                : date('Y-m-d'),
            'created_at' => isset($reportData['reportDateTime']) 
                ? date('Y-m-d H:i:s', strtotime($reportData['reportDateTime'])) 
                : date('Y-m-d H:i:s'),
            'template_key' => $reportData['templateKey'] ?? 'Unknown',
            'patient_name' => $reportData['patientName'] ?? '',
            'study_description' => $reportData['studyDescription'] ?? '',
            'study_orthanc_id' => $reportData['imageId'] ?? $studyOrthancId,
            'version' => $reportData['version'] ?? 1,
            'last_modified' => $reportData['lastModified'] ?? null
        ];
        
        echo json_encode([
            'success' => true,
            'exists' => true,
            'report' => $formattedReport,
            'source' => 'file_system',
            'file_path' => basename($reportFile)
        ]);
        exit();
    }
    
    // No report found
    error_log("No report found anywhere");
    error_log("Searched Orthanc ID: " . $studyOrthancId);
    error_log("Searched Study UID: " . $studyUID);
    error_log("Report directory: " . $reportDir);
    
    echo json_encode([
        'success' => true,
        'exists' => false,
        'message' => 'No report found for this study',
        'debug' => [
            'searched_orthanc_id' => $studyOrthancId,
            'searched_study_uid' => $studyUID,
            'report_dir' => $reportDir,
            'report_dir_exists' => is_dir($reportDir)
        ]
    ]);
    
} catch (Exception $e) {
    error_log("ERROR in get_study_report.php: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => DEBUG_MODE ? $e->getTraceAsString() : null
    ]);
}
