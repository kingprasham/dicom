<?php
/**
 * Check Table Structure
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/includes/db.php';

echo "<pre style='background: #000; color: #0f0; padding: 20px; font-family: monospace;'>";

echo "=== CHECKING TABLE STRUCTURE ===\n\n";

// Check cached_studies
echo "--- cached_studies columns ---\n";
$result = $mysqli->query("DESCRIBE cached_studies");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        echo "{$row['Field']} - {$row['Type']} - {$row['Null']} - {$row['Key']}\n";
    }
} else {
    echo "ERROR: " . $mysqli->error . "\n";
}

echo "\n--- cached_patients columns ---\n";
$result = $mysqli->query("DESCRIBE cached_patients");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        echo "{$row['Field']} - {$row['Type']} - {$row['Null']} - {$row['Key']}\n";
    }
} else {
    echo "ERROR: " . $mysqli->error . "\n";
}

$mysqli->close();
echo "</pre>";
?>
