<?php
/**
 * Test Report Loading - Quick Diagnostic
 * Access: http://localhost/dicom/php/test_report_load.php?orthanc_id=YOUR_ORTHANC_ID
 */

header('Content-Type: text/html; charset=utf-8');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/includes/db.php';

$orthancId = $_GET['orthanc_id'] ?? '';

?>
<!DOCTYPE html>
<html>
<head>
    <title>Test Report Loading</title>
    <style>
        body { 
            font-family: monospace; 
            padding: 20px; 
            background: #1a1a1a; 
            color: #0f0; 
        }
        .success { color: #0f0; }
        .error { color: #f00; }
        .info { color: #0af; }
        pre { 
            background: #000; 
            padding: 10px; 
            border: 1px solid #444;
            overflow-x: auto;
        }
        input[type="text"] {
            width: 500px;
            padding: 8px;
            background: #000;
            color: #0f0;
            border: 1px solid #444;
            font-family: monospace;
        }
        button {
            padding: 8px 16px;
            background: #0af;
            color: #000;
            border: none;
            cursor: pointer;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <h1>🔍 Report Loading Test</h1>
    
    <form method="get">
        <p>
            <label>Enter Orthanc ID or Study UID:</label><br>
            <input type="text" name="orthanc_id" value="<?php echo htmlspecialchars($orthancId); ?>" placeholder="31b02d85-5d02d762-934e2a0d-f741b6a9-48e69a67">
            <button type="submit">Test Load</button>
        </p>
    </form>
    
    <?php if (!empty($orthancId)): ?>
        
        <h2>Step 1: Check if Study Exists in Database</h2>
        <?php
        $stmt = $mysqli->prepare("SELECT * FROM cached_studies WHERE orthanc_id = ? OR study_instance_uid = ? LIMIT 1");
        $stmt->bind_param('ss', $orthancId, $orthancId);
        $stmt->execute();
        $result = $stmt->get_result();
        $study = $result->fetch_assoc();
        $stmt->close();
        
        if ($study) {
            echo "<p class='success'>✓ Study found in cached_studies</p>";
            echo "<pre>" . print_r($study, true) . "</pre>";
            $actualOrthancId = $study['orthanc_id'];
            $studyUID = $study['study_instance_uid'];
        } else {
            echo "<p class='error'>✗ Study NOT found in cached_studies</p>";
            echo "<p class='info'>This could mean the study hasn't been cached yet.</p>";
            $actualOrthancId = $orthancId;
            $studyUID = null;
        }
        ?>
        
        <h2>Step 2: Check Reports Directory</h2>
        <?php
        $reportDir = __DIR__ . '/reports';
        
        if (!is_dir($reportDir)) {
            echo "<p class='error'>✗ Reports directory does not exist!</p>";
        } else {
            echo "<p class='success'>✓ Reports directory exists</p>";
            
            // List all report files
            $allFiles = glob($reportDir . '/*.json');
            $reportFiles = array_filter($allFiles, function($f) {
                return strpos(basename($f), 'backup_') !== 0;
            });
            
            echo "<p>Total report files: " . count($reportFiles) . "</p>";
            
            // Try to find report for this orthanc ID
            echo "<h3>Searching for Report...</h3>";
            
            $patterns = [
                $reportDir . '/' . $actualOrthancId . '*_report.json',
                $reportDir . '/*' . $actualOrthancId . '*.json'
            ];
            
            if ($studyUID) {
                $patterns[] = $reportDir . '/*' . $studyUID . '*.json';
            }
            
            $foundReport = null;
            
            foreach ($patterns as $i => $pattern) {
                echo "<p class='info'>Pattern " . ($i+1) . ": <code>" . basename(dirname($pattern)) . '/' . basename($pattern) . "</code></p>";
                $files = glob($pattern);
                $files = array_filter($files, function($f) {
                    return strpos(basename($f), 'backup_') !== 0;
                });
                
                if (!empty($files)) {
                    $foundReport = $files[0];
                    echo "<p class='success'>✓ FOUND: " . basename($foundReport) . "</p>";
                    break;
                }
                echo "<p>No matches</p>";
            }
            
            if ($foundReport) {
                echo "<h3>Report Content:</h3>";
                $content = file_get_contents($foundReport);
                $data = json_decode($content, true);
                echo "<pre>" . json_encode($data, JSON_PRETTY_PRINT) . "</pre>";
            } else {
                echo "<p class='error'>✗ No report file found for this study</p>";
                echo "<h3>Available Reports:</h3>";
                echo "<ul>";
                foreach (array_slice($reportFiles, 0, 10) as $file) {
                    echo "<li>" . basename($file) . "</li>";
                }
                echo "</ul>";
            }
        }
        ?>
        
        <h2>Step 3: Test API Call</h2>
        <?php
        $apiUrl = 'http://localhost/dicom/php/api/get_study_report.php?study_orthanc_id=' . urlencode($actualOrthancId);
        if ($studyUID) {
            $apiUrl .= '&study_uid=' . urlencode($studyUID);
        }
        
        echo "<p>API URL: <code>$apiUrl</code></p>";
        echo "<p><button onclick=\"testAPI()\">Call API Now</button></p>";
        
        echo "<div id='apiResult'></div>";
        ?>
        
        <script>
        function testAPI() {
            document.getElementById('apiResult').innerHTML = '<p class="info">Loading...</p>';
            
            fetch('<?php echo $apiUrl; ?>')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('apiResult').innerHTML = 
                        '<h3>API Response:</h3><pre>' + 
                        JSON.stringify(data, null, 2) + 
                        '</pre>';
                })
                .catch(error => {
                    document.getElementById('apiResult').innerHTML = 
                        '<p class="error">Error: ' + error.message + '</p>';
                });
        }
        </script>
        
        <h2>Step 4: Recommendations</h2>
        <?php
        if (isset($foundReport) && $foundReport) {
            echo "<p class='success'>✓ Report exists and should be loadable via API</p>";
            echo "<p class='info'>If it's still not showing on the studies page:</p>";
            echo "<ol>";
            echo "<li>Clear browser cache (Ctrl+F5)</li>";
            echo "<li>Check browser console for JavaScript errors (F12)</li>";
            echo "<li>Verify the orthanc_id being passed from studies page matches: <strong>" . htmlspecialchars($actualOrthancId) . "</strong></li>";
            echo "</ol>";
        } else {
            echo "<p class='error'>✗ No report found for this study</p>";
            echo "<p class='info'>Make sure you:</p>";
            echo "<ol>";
            echo "<li>Actually saved a report for this study in the viewer</li>";
            echo "<li>The imageId in the viewer matches the orthanc_id: <strong>" . htmlspecialchars($actualOrthancId) . "</strong></li>";
            echo "</ol>";
        }
        ?>
        
    <?php else: ?>
        <p class='info'>Enter an Orthanc ID or Study UID above to test report loading.</p>
        <p>Example Orthanc ID: <code>31b02d85-5d02d762-934e2a0d-f741b6a9-48e69a67</code></p>
    <?php endif; ?>
    
    <hr>
    <p><a href="debug_reports.php" style="color: #0af;">← Full Debug Tool</a> | <a href="pages/studies.html" style="color: #0af;">Studies Page →</a></p>
    
</body>
</html>

<?php
$mysqli->close();
?>
