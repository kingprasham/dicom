<?php
/**
 * DICOM Viewer - Complete Data Cleanup Script
 * 
 * WARNING: This will permanently delete ALL data including:
 * - All DICOM files from database
 * - All physical files from dicom_files directory
 * - All medical notes
 * - All prescriptions
 * - All study reports
 * - All report JSON files
 * 
 * Usage: Navigate to http://localhost/dicom/php/cleanup_all_data.php?confirm=DELETE_ALL
 */

// Security: Only allow from localhost
if ($_SERVER['REMOTE_ADDR'] !== '127.0.0.1' && $_SERVER['REMOTE_ADDR'] !== '::1') {
    die('ERROR: This script can only be run from localhost for security reasons.');
}

// Require confirmation
if (!isset($_GET['confirm']) || $_GET['confirm'] !== 'DELETE_ALL') {
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <title>DICOM Data Cleanup</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
            .warning { background: #fff3cd; border: 2px solid #ffc107; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .danger { background: #f8d7da; border: 2px solid #dc3545; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .info { background: #d1ecf1; border: 2px solid #17a2b8; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            button { padding: 12px 24px; font-size: 16px; border-radius: 4px; border: none; cursor: pointer; margin-right: 10px; }
            .btn-danger { background: #dc3545; color: white; }
            .btn-secondary { background: #6c757d; color: white; }
            ul { line-height: 2; }
        </style>
    </head>
    <body>
        <h1>⚠️ DICOM Data Cleanup</h1>
        
        <div class="danger">
            <h2>🚨 DANGER - PERMANENT DATA DELETION</h2>
            <p><strong>This action CANNOT be undone!</strong></p>
        </div>

        <div class="info">
            <h3>What will be deleted:</h3>
            <ul>
                <li>All DICOM file records from database</li>
                <li>All physical DICOM files (.dcm)</li>
                <li>All medical notes</li>
                <li>All prescriptions</li>
                <li>All study reports (database + JSON files)</li>
            </ul>
        </div>

        <div class="warning">
            <h3>Before proceeding:</h3>
            <ul>
                <li>✅ Make sure you have backups if needed</li>
                <li>✅ Close all browser tabs with the DICOM viewer</li>
                <li>✅ Ensure no uploads are in progress</li>
            </ul>
        </div>

        <div style="margin-top: 30px;">
            <button class="btn-danger" onclick="if(confirm('Are you ABSOLUTELY SURE? This will delete ALL data!')) window.location.href='?confirm=DELETE_ALL'">
                🗑️ DELETE ALL DATA
            </button>
            <button class="btn-secondary" onclick="window.close()">
                ← Cancel
            </button>
        </div>
    </body>
    </html>
    <?php
    exit;
}

// Proceed with cleanup
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>Cleanup in Progress</title>
    <style>
        body { font-family: monospace; background: #1e1e1e; color: #0f0; padding: 20px; max-width: 1000px; margin: 0 auto; }
        .success { color: #0f0; }
        .error { color: #f00; }
        .info { color: #0ff; }
        .warning { color: #ff0; }
        pre { background: #000; padding: 20px; border-radius: 4px; overflow-x: auto; }
        .stats { background: #2d2d2d; padding: 15px; margin: 20px 0; border-left: 4px solid #0f0; }
    </style>
</head>
<body>
<h1>🧹 DICOM Data Cleanup - Running...</h1>
<pre>
<?php

$startTime = microtime(true);
$stats = [
    'files_deleted' => 0,
    'db_records_deleted' => 0,
    'reports_deleted' => 0,
    'errors' => 0
];

require_once 'db_connect.php';

echo "<span class='info'>==================================================</span>\n";
echo "<span class='info'>  DICOM VIEWER - COMPLETE DATA CLEANUP</span>\n";
echo "<span class='info'>  " . date('Y-m-d H:i:s') . "</span>\n";
echo "<span class='info'>==================================================</span>\n\n";

// Step 1: Get list of all files
echo "<span class='warning'>[STEP 1] Retrieving file list...</span>\n";
$result = $mysqli->query("SELECT id, file_path, file_name FROM dicom_files");

if ($result) {
    $files = [];
    while ($row = $result->fetch_assoc()) {
        $files[] = $row;
    }
    echo "<span class='success'>✓ Found " . count($files) . " files</span>\n\n";
} else {
    echo "<span class='error'>✗ Query failed: " . $mysqli->error . "</span>\n";
    $stats['errors']++;
    $files = [];
}

// Step 2: Delete physical files
echo "<span class='warning'>[STEP 2] Deleting physical files...</span>\n";
foreach ($files as $file) {
    if (file_exists($file['file_path'])) {
        if (unlink($file['file_path'])) {
            $stats['files_deleted']++;
            echo "<span class='success'>✓ {$file['file_name']}</span>\n";
        } else {
            echo "<span class='error'>✗ Failed: {$file['file_name']}</span>\n";
            $stats['errors']++;
        }
    }
}
echo "<span class='success'>Files deleted: {$stats['files_deleted']}</span>\n\n";

// Step 3: Delete report files
echo "<span class='warning'>[STEP 3] Deleting reports...</span>\n";
if (is_dir('reports')) {
    $reportFiles = glob('reports/*.json');
    foreach ($reportFiles as $reportFile) {
        if (unlink($reportFile)) {
            $stats['reports_deleted']++;
        }
    }
    echo "<span class='success'>Reports deleted: {$stats['reports_deleted']}</span>\n\n";
}

// Step 4: Clear database
echo "<span class='warning'>[STEP 4] Clearing database...</span>\n";
$tables = [
    'dicom_files' => 'DICOM files',
    'medical_notes' => 'Medical notes',
    'prescriptions' => 'Prescriptions',
    'study_reports' => 'Study reports'
];

foreach ($tables as $table => $description) {
    $tableCheck = $mysqli->query("SHOW TABLES LIKE '$table'");
    if ($tableCheck && $tableCheck->num_rows > 0) {
        $countResult = $mysqli->query("SELECT COUNT(*) as count FROM $table");
        $count = $countResult->fetch_assoc()['count'];
        
        if ($mysqli->query("TRUNCATE TABLE $table")) {
            $stats['db_records_deleted'] += $count;
            echo "<span class='success'>✓ $description: $count records</span>\n";
        } else {
            echo "<span class='error'>✗ Failed: $description</span>\n";
            $stats['errors']++;
        }
    }
}

echo "\n";

// Step 5: Clean orphaned files
echo "<span class='warning'>[STEP 5] Cleaning orphaned files...</span>\n";
if (is_dir('dicom_files')) {
    $orphanedFiles = glob('dicom_files/*.dcm');
    foreach ($orphanedFiles as $orphanedFile) {
        unlink($orphanedFile);
    }
    echo "<span class='success'>✓ Cleaned " . count($orphanedFiles) . " orphaned files</span>\n\n";
}

$executionTime = round(microtime(true) - $startTime, 2);

echo "<span class='info'>==================================================</span>\n";
echo "<span class='info'>  CLEANUP COMPLETE - {$executionTime}s</span>\n";
echo "<span class='info'>==================================================</span>\n\n";

?>
</pre>

<div class="stats">
    <h2>📊 Statistics</h2>
    <table style="width: 100%; color: #0f0;">
        <tr><td>Physical files deleted:</td><td><strong><?php echo $stats['files_deleted']; ?></strong></td></tr>
        <tr><td>Database records deleted:</td><td><strong><?php echo $stats['db_records_deleted']; ?></strong></td></tr>
        <tr><td>Report files deleted:</td><td><strong><?php echo $stats['reports_deleted']; ?></strong></td></tr>
        <tr><td>Errors:</td><td><strong style="color: <?php echo $stats['errors'] > 0 ? '#f00' : '#0f0'; ?>"><?php echo $stats['errors']; ?></strong></td></tr>
    </table>
</div>

<?php if ($stats['errors'] == 0): ?>
<div style="background: #1f3d1f; padding: 15px; margin: 20px 0; border-left: 4px solid #0f0;">
    <h3 style="color: #0f0;">✅ Success</h3>
    <p style="color: #fff;">All data has been deleted. System is clean.</p>
</div>
<?php endif; ?>

<div style="text-align: center; margin-top: 40px;">
    <button onclick="window.location.href='index.php'" style="padding: 12px 30px; font-size: 16px; background: #0f0; color: #000; border: none; border-radius: 4px; cursor: pointer;">
        Return to DICOM Viewer
    </button>
</div>

<?php $mysqli->close(); ?>
</body>
</html>
