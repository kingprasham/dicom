<?php
// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// Function to log debug information for database connection


// --- Database Credentials ---
// Replace these with your actual database details
$db_host = 'localhost';       
$db_user = 'root';                 
$db_pass = '';   
$db_name = 'dicom';                 
$db_port = 3306;


// Check if the database extension is loaded
if (!extension_loaded('mysqli')) {
    die("MySQLi extension is not loaded. Please install or enable the MySQLi extension.");
}

try {
    // --- Create Connection ---
    $mysqli = new mysqli($db_host, $db_user, $db_pass, $db_name, $db_port);
    
    // --- Check Connection ---
    if ($mysqli->connect_error) {
        // Stop execution and display an error message if the connection fails
        die("Connection failed: " . $mysqli->connect_error);
    }
    
    
    // Set character set to utf8mb4 for full Unicode support
    $charset_result = $mysqli->set_charset("utf8mb4");
    if ($charset_result) {
    } else {
    }
    
    // Test the connection with a simple query
    $result = $mysqli->query("SELECT 1 as test");
    if (!$result) {
        die("Database test query failed: " . $mysqli->error);
    } else {
        $test_row = $result->fetch_assoc();
        $result->close();
    }
    
    // Check if the dicom_files table exists
    $table_check = $mysqli->query("SHOW TABLES LIKE 'dicom_files'");
    if ($table_check && $table_check->num_rows > 0) {
        $table_check->close();
        
        // Get table structure
        $structure_result = $mysqli->query("DESCRIBE dicom_files");
        if ($structure_result) {
            $structure = [];
            while ($row = $structure_result->fetch_assoc()) {
                $structure[] = $row;
            }
            $structure_result->close();
        }
    } else {
        echo "<!-- WARNING: dicom_files table does not exist -->";
    }
    
    
} catch (Exception $e) {
    die("Database connection exception: " . $e->getMessage());
}
?>