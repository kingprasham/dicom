<?php
/**
 * COMPLETE SYSTEM RESET
 * WARNING: This will delete ALL data!
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/includes/db.php';

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>System Reset</title>
    <style>
        body { background: #000; color: #f00; font-family: monospace; padding: 40px; }
        .warning { 
            background: #300; 
            border: 3px solid #f00; 
            padding: 30px; 
            margin: 20px 0;
            font-size: 18px;
        }
        .btn-danger {
            background: #f00;
            color: #000;
            padding: 20px 40px;
            font-size: 20px;
            font-weight: bold;
            border: none;
            cursor: pointer;
            margin: 20px;
        }
        .btn-cancel {
            background: #666;
            color: #fff;
            padding: 20px 40px;
            font-size: 20px;
            border: none;
            cursor: pointer;
        }
        .success { color: #0f0; }
        pre { background: #111; padding: 20px; color: #0f0; }
    </style>
</head>
<body>

<h1>⚠️ COMPLETE SYSTEM RESET ⚠️</h1>

<?php
if (!isset($_POST['confirm'])) {
    ?>
    <div class="warning">
        <h2>WARNING: THIS WILL DELETE EVERYTHING!</h2>
        <p>This action will:</p>
        <ul>
            <li>Delete ALL patients from database</li>
            <li>Delete ALL studies from database</li>
            <li>Delete ALL series from database</li>
            <li>Delete ALL reports (files)</li>
            <li>Delete ALL prescriptions</li>
            <li>Delete ALL DICOM file records</li>
            <li><strong>NOTE: Orthanc data must be cleaned separately</strong></li>
        </ul>
        <p><strong>THIS CANNOT BE UNDONE!</strong></p>
    </div>
    
    <form method="post">
        <p>Type "DELETE EVERYTHING" to confirm:</p>
        <input type="text" name="confirmation" size="30" style="padding: 10px; font-size: 16px;">
        <br><br>
        <button type="submit" name="confirm" value="1" class="btn-danger">
            🗑️ DELETE EVERYTHING
        </button>
        <button type="button" class="btn-cancel" onclick="window.history.back()">
            ← Cancel
        </button>
    </form>
    <?php
} else {
    if ($_POST['confirmation'] !== 'DELETE EVERYTHING') {
        echo "<p style='color: #ff0;'>❌ Confirmation text incorrect. No changes made.</p>";
        echo "<p><a href='reset_system.php' style='color: #0af;'>← Go Back</a></p>";
        exit;
    }
    
    echo "<h2 style='color: #0f0;'>🗑️ DELETING ALL DATA...</h2>";
    echo "<pre>\n";

    // === FIX START ===
    // Temporarily disable foreign key checks to allow truncation in any order.
    $mysqli->query("SET FOREIGN_KEY_CHECKS=0;");
    echo "Temporarily disabled foreign key checks...\n\n";
    // === FIX END ===
    
    // Truncate tables
    $tables = [
        'cached_series',        // Added this table to the list
        'cached_studies',
        'cached_patients', 
        'prescriptions',
        'dicom_files',
        'study_access_log'
    ];
    
    foreach ($tables as $table) {
        // Check if table exists
        $result = $mysqli->query("SHOW TABLES LIKE '$table'");
        if ($result->num_rows > 0) {
            echo "Cleaning table: $table ... ";
            if ($mysqli->query("TRUNCATE TABLE `$table`")) {
                echo "✓ Done\n";
            } else {
                echo "✗ FAILED: " . $mysqli->error . "\n";
            }
        } else {
            echo "Table `$table` doesn't exist, skipping\n";
        }
    }

    // === FIX START ===
    // Re-enable foreign key checks.
    $mysqli->query("SET FOREIGN_KEY_CHECKS=1;");
    echo "\nRe-enabled foreign key checks.\n";
    // === FIX END ===
    
    // Delete report files
    echo "\nDeleting report files...\n";
    $reportDir = __DIR__ . '/reports';
    if (is_dir($reportDir)) {
        $files = glob($reportDir . '/*.json');
        $count = 0;
        foreach ($files as $file) {
            if (is_file($file) && unlink($file)) {
                $count++;
            }
        }
        echo "Deleted $count report files ✓\n";
    } else {
        echo "Reports directory doesn't exist\n";
    }
    
    // Show final count
    echo "\n=== VERIFICATION ===\n";
    foreach ($tables as $table) {
        $result = $mysqli->query("SELECT COUNT(*) as count FROM `$table`");
        if ($result) {
            $row = $result->fetch_assoc();
            echo "$table: {$row['count']} rows\n";
        }
    }
    
    echo "\n";
    echo "✅ ✅ ✅ SYSTEM RESET COMPLETE ✅ ✅ ✅\n";
    echo "</pre>";
    
    echo "<div class='warning' style='border-color: #0f0; background: #030; color: #0f0;'>";
    echo "<h2>Next Steps:</h2>";
    echo "<ol>";
    echo "<li><strong>Clean Orthanc manually:</strong>";
    echo "<ul>";
    echo "<li>Stop Orthanc service</li>";
    echo "<li>Delete contents of: <code>C:\\OrthancStorage\\</code> and <code>C:\\OrthancIndex\\</code></li>";
    echo "<li>Start Orthanc service</li>";
    echo "</ul></li>";
    echo "<li>Add new DICOM files to <code>C:\\DICOM_INCOMING\\</code></li>";
    echo "<li>Wait for the automated tasks to run</li>";
    echo "</ol>";
    echo "</div>";
    
    echo "<p><a href='quick_fix.php' style='color: #0af; font-size: 20px;'>→ Go to Dashboard</a></p>";
}

$mysqli->close();
?>

</body>
</html>