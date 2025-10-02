<?php
// get_report_summary.php - FIXED VERSION

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
    // MODIFIED: Get both imageId and the crucial studyUID
    $imageId = $_GET['imageId'] ?? '';
    $studyUID = $_GET['studyUID'] ?? '';

    if (empty($studyUID)) {
        throw new Exception('Study UID is required to find a report.');
    }

    $response = [
        'success' => true, // Assume success, but report may not exist
        'exists' => false
    ];
    
    $reportsDir = 'reports/';
    $reportFile = null;

    // --- NEW PRIMARY SEARCH by Study UID ---
    // This is the correct method that will find your saved reports.
    if (is_dir($reportsDir)) {
        $filePathByStudy = $reportsDir . $studyUID . '_report.json';
        if (file_exists($filePathByStudy)) {
            $reportFile = $filePathByStudy;
        }
    }

    // --- FALLBACK SEARCH by Image ID (for old reports, just in case) ---
    if (!$reportFile && !empty($imageId) && is_dir($reportsDir)) {
        $files = glob($reportsDir . $imageId . '*_report.json');
        if (!empty($files)) {
            $reportFile = $files[0];
        }
    }

    // If we found a file, parse it for the summary
    if ($reportFile) {
        $reportContent = file_get_contents($reportFile);
        $reportData = json_decode($reportContent, true);

        if ($reportData) {
            $allText = '';
            if (isset($reportData['sections'])) {
                foreach ($reportData['sections'] as $section) {
                    $allText .= is_array($section) ? implode(' ', $section) : ' ' . $section;
                }
            }
            
            $response['exists'] = true;
            $response['template'] = $reportData['templateKey'] ?? 'Unknown';
            $response['physician'] = $reportData['reportingPhysician'] ?? 'Not specified';
            $response['date'] = $reportData['lastModified'] ?? date('Y-m-d H:i:s');
            $response['wordCount'] = str_word_count(strip_tags($allText));
        }
    }

    echo json_encode($response);

} catch (Exception $e) {
    error_log("Get report summary error: " . $e->getMessage());
    http_response_code(500); // Internal server error for exceptions
    echo json_encode([
        'success' => false,
        'exists' => false,
        'message' => $e->getMessage()
    ]);
}
?>