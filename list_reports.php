<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

error_reporting(E_ALL);
ini_set('display_errors', 0);

try {
    $reportsDir = 'reports/';
    
    if (!is_dir($reportsDir)) {
        echo json_encode([
            'success' => true,
            'reports' => [],
            'message' => 'No reports directory found'
        ]);
        exit();
    }
    
    $reports = [];
    $files = glob($reportsDir . '*_report.json');
    
    foreach ($files as $filepath) {
        try {
            $content = file_get_contents($filepath);
            if ($content) {
                $reportData = json_decode($content, true);
                
                if ($reportData && isset($reportData['imageId'])) {
                    $reports[] = [
                        'imageId' => $reportData['imageId'],
                        'filename' => basename($filepath),
                        'patientName' => $reportData['patientName'] ?? 'Unknown',
                        'studyDescription' => $reportData['studyDescription'] ?? 'Study',
                        'reportingPhysician' => $reportData['reportingPhysician'] ?? 'Unknown',
                        'templateKey' => $reportData['templateKey'] ?? 'custom',
                        'lastModified' => $reportData['lastModified'] ?? filemtime($filepath),
                        'version' => $reportData['version'] ?? 1,
                        'filesize' => filesize($filepath)
                    ];
                }
            }
        } catch (Exception $e) {
            // Skip invalid files
            continue;
        }
    }
    
    // Sort by last modified date (newest first)
    usort($reports, function($a, $b) {
        return strtotime($b['lastModified']) - strtotime($a['lastModified']);
    });
    
    echo json_encode([
        'success' => true,
        'reports' => $reports,
        'count' => count($reports)
    ]);
    
} catch (Exception $e) {
    error_log('List reports error: ' . $e->getMessage());
    
    echo json_encode([
        'success' => false,
        'message' => 'Error listing reports: ' . $e->getMessage()
    ]);
}
?>