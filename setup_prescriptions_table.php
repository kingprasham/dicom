<?php
/**
 * Setup script to create prescriptions table
 * Run this once: http://localhost/dicom/php/setup_prescriptions_table.php
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/includes/db.php';

header('Content-Type: text/html; charset=utf-8');

echo "<!DOCTYPE html><html><head><title>Setup Prescriptions Table</title></head><body>";
echo "<h1>Creating prescriptions table...</h1>";

$sql = "CREATE TABLE IF NOT EXISTS prescriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    study_instance_uid VARCHAR(255) NOT NULL,
    patient_id VARCHAR(64),
    prescribing_physician VARCHAR(255) NOT NULL,
    prescription_data TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(50),
    UNIQUE KEY unique_study_prescription (study_instance_uid),
    INDEX idx_patient_id (patient_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

try {
    if ($mysqli->query($sql)) {
        echo "<p style='color: green;'><strong>✓ SUCCESS!</strong> The prescriptions table has been created successfully.</p>";
        
        // Verify the table was created
        $result = $mysqli->query("SHOW TABLES LIKE 'prescriptions'");
        if ($result && $result->num_rows > 0) {
            echo "<p>Table verified: 'prescriptions' exists in database 'dicom'</p>";
            
            // Show table structure
            $structure = $mysqli->query("DESCRIBE prescriptions");
            echo "<h2>Table Structure:</h2>";
            echo "<table border='1' cellpadding='5' cellspacing='0'>";
            echo "<tr><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th><th>Extra</th></tr>";
            while ($row = $structure->fetch_assoc()) {
                echo "<tr>";
                echo "<td>{$row['Field']}</td>";
                echo "<td>{$row['Type']}</td>";
                echo "<td>{$row['Null']}</td>";
                echo "<td>{$row['Key']}</td>";
                echo "<td>" . ($row['Default'] ?? 'NULL') . "</td>";
                echo "<td>{$row['Extra']}</td>";
                echo "</tr>";
            }
            echo "</table>";
        }
        
        echo "<hr><p><strong>You can now:</strong></p>";
        echo "<ul>";
        echo "<li>Go back to your DICOM viewer and try saving a prescription again</li>";
        echo "<li>This file can be deleted after successful setup</li>";
        echo "</ul>";
        
    } else {
        throw new Exception($mysqli->error);
    }
    
} catch (Exception $e) {
    echo "<p style='color: red;'><strong>✗ ERROR:</strong> " . htmlspecialchars($e->getMessage()) . "</p>";
    echo "<p>Please check:</p>";
    echo "<ul>";
    echo "<li>MySQL server is running (check XAMPP control panel)</li>";
    echo "<li>Database 'dicom' exists</li>";
    echo "<li>Database credentials in config.php are correct</li>";
    echo "</ul>";
}

$mysqli->close();

echo "</body></html>";
?>
