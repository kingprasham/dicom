<?php
/**
 * Remote Sync Sender
 * Run this on hospital PC to push data to cloud
 * Usage: php remote_sync_sender.php
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/includes/db.php';

// Configuration
$remoteApiUrl = 'https://e-connect.in/dicom/api/remote_sync_receiver.php';
$apiKey = 'YOUR_SECRET_KEY_HERE_CHANGE_THIS'; // Must match receiver

echo "=== Remote Sync to Cloud ===\n";
echo "Target: $remoteApiUrl\n\n";

try {
    // Get all patients
    $patients = [];
    $result = $mysqli->query("SELECT * FROM cached_patients");
    while ($row = $result->fetch_assoc()) {
        $patients[] = $row;
    }
    
    echo "Patients to sync: " . count($patients) . "\n";
    
    // Get all studies
    $studies = [];
    $result = $mysqli->query("SELECT * FROM cached_studies");
    while ($row = $result->fetch_assoc()) {
        $studies[] = $row;
    }
    
    echo "Studies to sync: " . count($studies) . "\n\n";
    
    // Prepare data
    $data = [
        'patients' => $patients,
        'studies' => $studies
    ];
    
    // Send to remote server
    $ch = curl_init($remoteApiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-API-KEY: ' . $apiKey
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $result = json_decode($response, true);
        echo "✓ Sync successful!\n";
        echo "  Patients synced: " . $result['patients_synced'] . "\n";
        echo "  Studies synced: " . $result['studies_synced'] . "\n";
        echo "  Timestamp: " . $result['timestamp'] . "\n";
    } else {
        echo "✗ Sync failed! HTTP $httpCode\n";
        echo "Response: $response\n";
    }
    
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
}

$mysqli->close();
?>
