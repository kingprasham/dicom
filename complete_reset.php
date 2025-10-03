<?php
/**
 * Complete System Reset
 * Clears ALL data from both Database AND Orthanc
 * USE WITH CAUTION - THIS DELETES EVERYTHING!
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/includes/db.php';

header('Content-Type: text/html; charset=utf-8');

echo "<!DOCTYPE html><html><head><title>Complete System Reset</title>";
echo "<style>
body{background:#000;color:#0f0;font-family:monospace;padding:20px;}
.success{color:#0f0;font-weight:bold;}
.error{color:#f00;font-weight:bold;}
.info{color:#0af;}
.warning{color:#ff0;font-size:1.2em;padding:20px;border:3px solid #ff0;margin:20px 0;}
.button{display:inline-block;padding:15px 30px;margin:10px;background:#f00;color:#fff;
        text-decoration:none;border:none;cursor:pointer;font-size:1.1em;font-weight:bold;
        border-radius:5px;}
.button:hover{background:#c00;}
.button-cancel{background:#666;}
.button-cancel:hover{background:#444;}
</style></head><body>";

echo "<h1>⚠️ COMPLETE SYSTEM RESET ⚠️</h1>";

// Check if confirmation given
if (!isset($_GET['confirm']) || $_GET['confirm'] !== 'yes') {
    echo "<div class='warning'>";
    echo "<h2 style='color:#ff0;'>⚠️ WARNING ⚠️</h2>";
    echo "<p>This will <strong>PERMANENTLY DELETE</strong>:</p>";
    echo "<ul style='font-size:1.1em;line-height:2;'>";
    echo "<li>All studies from Orthanc PACS server</li>";
    echo "<li>All patients from Orthanc</li>";
    echo "<li>All DICOM files stored in Orthanc</li>";
    echo "<li>All cached studies from database</li>";
    echo "<li>All cached patients from database</li>";
    echo "<li>All cached series from database</li>";
    echo "</ul>";
    echo "<p style='color:#f00;font-size:1.2em;'>THIS CANNOT BE UNDONE!</p>";
    echo "<p>Your uploaded DICOM files in <code>C:/DICOM_INCOMING</code> will NOT be deleted.</p>";
    echo "<p>After reset, you can re-upload and re-process them.</p>";
    echo "</div>";
    
    echo "<h2 style='color:#0af;'>Are you absolutely sure?</h2>";
    echo "<form method='get' style='margin:30px 0;'>";
    echo "<input type='hidden' name='confirm' value='yes'>";
    echo "<button type='submit' class='button'>YES - DELETE EVERYTHING</button>";
    echo "<a href='fix_dashboard.html' class='button button-cancel'>NO - CANCEL</a>";
    echo "</form>";
    
    echo "</body></html>";
    exit;
}

echo "<pre>\n";
echo "<span class='warning'>🔥 DELETION IN PROGRESS 🔥</span>\n\n";

// Function to call Orthanc API
function callOrthanc($endpoint, $method = 'GET', $data = null) {
    $url = ORTHANC_URL . $endpoint;
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERPWD, ORTHANC_USERNAME . ':' . ORTHANC_PASSWORD);
    curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    if ($method === 'DELETE') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
    } elseif ($method === 'POST' && $data) {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode >= 200 && $httpCode < 300) {
        return json_decode($response, true);
    }
    
    return null;
}

// Step 1: Clear Orthanc
echo "=== STEP 1: Clearing Orthanc PACS Server ===\n";
echo "Connecting to Orthanc at " . ORTHANC_URL . "...\n";

$patients = callOrthanc('/patients');

if ($patients === null) {
    echo "<span class='error'>✗ Failed to connect to Orthanc!</span>\n";
    echo "Make sure Orthanc is running at " . ORTHANC_URL . "\n";
    echo "\nDatabase cleanup will continue...\n\n";
} else {
    echo "<span class='success'>✓ Connected to Orthanc</span>\n";
    echo "Found " . count($patients) . " patients\n\n";
    
    $deletedCount = 0;
    foreach ($patients as $patientId) {
        $result = callOrthanc("/patients/$patientId", 'DELETE');
        if ($result !== null) {
            $deletedCount++;
            echo "  <span class='success'>✓ Deleted patient: $patientId</span>\n";
        } else {
            echo "  <span class='warning'>⚠ Failed to delete patient: $patientId</span>\n";
        }
    }
    
    echo "\n<span class='success'>✓ Deleted $deletedCount patients from Orthanc</span>\n";
    
    // Verify Orthanc is empty
    $patientsAfter = callOrthanc('/patients');
    if ($patientsAfter && count($patientsAfter) === 0) {
        echo "<span class='success'>✓ Orthanc is now empty</span>\n";
    } else {
        echo "<span class='warning'>⚠ Some data may remain in Orthanc</span>\n";
    }
}

// Step 2: Clear Database
echo "\n=== STEP 2: Clearing Database ===\n";

// Clear cached_series
echo "\nClearing cached_series table...\n";
$result = $mysqli->query("DELETE FROM cached_series");
if ($result) {
    echo "<span class='success'>✓ Cleared cached_series (affected rows: " . $mysqli->affected_rows . ")</span>\n";
} else {
    echo "<span class='error'>✗ Error: " . $mysqli->error . "</span>\n";
}

// Clear cached_studies
echo "\nClearing cached_studies table...\n";
$result = $mysqli->query("DELETE FROM cached_studies");
if ($result) {
    echo "<span class='success'>✓ Cleared cached_studies (affected rows: " . $mysqli->affected_rows . ")</span>\n";
} else {
    echo "<span class='error'>✗ Error: " . $mysqli->error . "</span>\n";
}

// Clear cached_patients
echo "\nClearing cached_patients table...\n";
$result = $mysqli->query("DELETE FROM cached_patients");
if ($result) {
    echo "<span class='success'>✓ Cleared cached_patients (affected rows: " . $mysqli->affected_rows . ")</span>\n";
} else {
    echo "<span class='error'>✗ Error: " . $mysqli->error . "</span>\n";
}

// Clear dicom_files (if you want to clear this too)
echo "\nClearing dicom_files table...\n";
$result = $mysqli->query("DELETE FROM dicom_files");
if ($result) {
    echo "<span class='success'>✓ Cleared dicom_files (affected rows: " . $mysqli->affected_rows . ")</span>\n";
} else {
    echo "<span class='error'>✗ Error: " . $mysqli->error . "</span>\n";
}

// Clear study_access_log
echo "\nClearing study_access_log table...\n";
$result = $mysqli->query("DELETE FROM study_access_log");
if ($result) {
    echo "<span class='success'>✓ Cleared study_access_log (affected rows: " . $mysqli->affected_rows . ")</span>\n";
} else {
    echo "<span class='error'>✗ Error: " . $mysqli->error . "</span>\n";
}

// Step 3: Verify
echo "\n=== STEP 3: Verification ===\n";

$tables = ['cached_patients', 'cached_studies', 'cached_series', 'dicom_files', 'study_access_log'];
$allEmpty = true;

foreach ($tables as $table) {
    $result = $mysqli->query("SELECT COUNT(*) as count FROM $table");
    $row = $result->fetch_assoc();
    if ($row['count'] == 0) {
        echo "<span class='success'>✓ $table: 0 rows</span>\n";
    } else {
        echo "<span class='warning'>⚠ $table: {$row['count']} rows remaining</span>\n";
        $allEmpty = false;
    }
}

// Step 4: Summary
echo "\n=== SUMMARY ===\n";
if ($allEmpty) {
    echo "<span class='success' style='font-size:1.5em;'>✓✓✓ COMPLETE RESET SUCCESSFUL ✓✓✓</span>\n";
    echo "\nYour system is now clean!\n";
    echo "\n<span class='info'>Next Steps:</span>\n";
    echo "1. Place DICOM folders in <code>C:/DICOM_INCOMING/processed</code>\n";
    echo "2. They will be automatically sent to Orthanc\n";
    echo "3. Run sync_orthanc.php to populate the database\n";
    echo "4. View studies in the web interface\n";
} else {
    echo "<span class='warning'>⚠ Some data may remain in database</span>\n";
    echo "You may need to manually check the tables.\n";
}

echo "\n<a href='fix_dashboard.html' style='color:#0af;'>→ Back to Dashboard</a> | ";
echo "<a href='inspect_orthanc.php' style='color:#0af;'>→ Verify Orthanc is Empty</a> | ";
echo "<a href='verify_fix.php' style='color:#0af;'>→ Verify Database</a>\n";

$mysqli->close();
echo "</pre></body></html>";
?>
