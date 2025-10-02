<?php
/**
 * Direct API Test for Report
 */

// Simulate session validation
$_SESSION['user_id'] = 1;
$_SESSION['username'] = 'test';

// Directly test the API
$orthancId = '31b02d85-5d02d762-934e2a0d-f741b6a9-48e69a67';

echo "<h2>Testing API with Orthanc ID: $orthancId</h2>";

// Call the API
$url = 'http://localhost/dicom/php/api/get_study_report.php?study_orthanc_id=' . urlencode($orthancId);
echo "<p>API URL: <a href='$url' target='_blank'>$url</a></p>";

// Use cURL to test
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_COOKIE, session_name() . '=' . session_id());
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "<h3>Response (HTTP $httpCode):</h3>";
echo "<pre style='background: #000; color: #0f0; padding: 20px;'>";
echo htmlspecialchars($response);
echo "</pre>";

$data = json_decode($response, true);
if ($data) {
    echo "<h3>Parsed JSON:</h3>";
    echo "<pre style='background: #000; color: #0f0; padding: 20px;'>";
    print_r($data);
    echo "</pre>";
}
?>
