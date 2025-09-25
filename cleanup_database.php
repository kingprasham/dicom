<?php
require_once 'db_connect.php';

echo "<h2>Database Cleanup Script</h2>";
echo "<p>This will remove records with missing files and preserve working ones.</p>";

// First, let's see what we're dealing with
$sql = "SELECT id, file_name, file_path, LENGTH(file_data) as data_length FROM dicom_files";
$result = $mysqli->query($sql);

$total = 0;
$working = 0;
$broken = 0;
$brokenIds = [];

while ($row = $result->fetch_assoc()) {
    $total++;
    
    if ($row['file_path'] && file_exists($row['file_path'])) {
        $working++;
        echo "<p style='color: green;'>✅ KEEP: " . htmlspecialchars($row['file_name']) . "</p>";
    } else {
        $broken++;
        $brokenIds[] = $row['id'];
        echo "<p style='color: red;'>❌ REMOVE: " . htmlspecialchars($row['file_name']) . " (missing file)</p>";
    }
}

echo "<hr>";
echo "<h3>Summary:</h3>";
echo "<p>Total records: $total</p>";
echo "<p>Working records: $working</p>";
echo "<p>Broken records: $broken</p>";

if ($broken > 0) {
    echo "<form method='POST'>";
    echo "<p><strong>Do you want to delete the $broken broken records?</strong></p>";
    echo "<button type='submit' name='cleanup' value='yes' style='background: red; color: white; padding: 10px 20px; border: none; border-radius: 4px;'>Yes, Delete Broken Records</button>";
    echo "<button type='submit' name='cleanup' value='no' style='background: gray; color: white; padding: 10px 20px; border: none; border-radius: 4px; margin-left: 10px;'>Cancel</button>";
    echo "</form>";
    
    if (isset($_POST['cleanup']) && $_POST['cleanup'] === 'yes') {
        echo "<hr><h3>Cleaning up...</h3>";
        
        $deleted = 0;
        foreach ($brokenIds as $id) {
            $deleteSql = "DELETE FROM dicom_files WHERE id = ?";
            $stmt = $mysqli->prepare($deleteSql);
            $stmt->bind_param("s", $id);
            
            if ($stmt->execute()) {
                $deleted++;
                echo "<p>Deleted record: $id</p>";
            } else {
                echo "<p style='color: red;'>Failed to delete: $id</p>";
            }
            $stmt->close();
        }
        
        echo "<h3 style='color: green;'>Cleanup completed!</h3>";
        echo "<p>Deleted $deleted broken records</p>";
        echo "<p>Remaining working records: $working</p>";
        
        // Also clean up any orphaned files in the dicom_files directory
        echo "<h3>Cleaning up orphaned files...</h3>";
        $filesDir = 'dicom_files/';
        if (is_dir($filesDir)) {
            $files = glob($filesDir . '*.dcm');
            $orphanedFiles = 0;
            
            foreach ($files as $file) {
                $fileName = basename($file, '.dcm');
                
                // Check if this file is referenced in the database
                $checkSql = "SELECT COUNT(*) as count FROM dicom_files WHERE file_path = ?";
                $stmt = $mysqli->prepare($checkSql);
                $stmt->bind_param("s", $file);
                $stmt->execute();
                $result = $stmt->get_result();
                $count = $result->fetch_assoc()['count'];
                $stmt->close();
                
                if ($count == 0) {
                    // Orphaned file - delete it
                    if (unlink($file)) {
                        echo "<p>Deleted orphaned file: " . basename($file) . "</p>";
                        $orphanedFiles++;
                    }
                }
            }
            
            echo "<p>Deleted $orphanedFiles orphaned files</p>";
        }
    }
} else {
    echo "<p style='color: green;'>All records are working correctly - no cleanup needed!</p>";
}

$mysqli->close();
?>