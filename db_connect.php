<?php
// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// Function to log debug information for database connection
function db_debug_log($message) {
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] DB_DEBUG: $message", 3, 'db_debug.log');
}

db_debug_log("=== DATABASE CONNECTION ATTEMPT ===");

// --- Database Credentials ---
// Replace these with your actual database details
$db_host = 'localhost';       
$db_user = 'root';                 
$db_pass = '';   
$db_name = 'dicom';                 
$db_port = 3306;

db_debug_log("Connection parameters: Host=$db_host, User=$db_user, Database=$db_name, Port=$db_port");

// Check if the database extension is loaded
if (!extension_loaded('mysqli')) {
    db_debug_log("ERROR: MySQLi extension is not loaded");
    die("MySQLi extension is not loaded. Please install or enable the MySQLi extension.");
}
db_debug_log("MySQLi extension is loaded");

try {
    // --- Create Connection ---
    db_debug_log("Creating MySQLi connection");
    $mysqli = new mysqli($db_host, $db_user, $db_pass, $db_name, $db_port);
    
    // --- Check Connection ---
    if ($mysqli->connect_error) {
        db_debug_log("ERROR: Connection failed - " . $mysqli->connect_error);
        db_debug_log("Error number: " . $mysqli->connect_errno);
        // Stop execution and display an error message if the connection fails
        die("Connection failed: " . $mysqli->connect_error);
    }
    
    db_debug_log("Database connection established successfully");
    
    // Set character set to utf8mb4 for full Unicode support
    $charset_result = $mysqli->set_charset("utf8mb4");
    if ($charset_result) {
        db_debug_log("Character set set to utf8mb4 successfully");
    } else {
        db_debug_log("WARNING: Failed to set character set to utf8mb4: " . $mysqli->error);
    }
    
    // Test the connection with a simple query
    db_debug_log("Testing connection with simple query");
    $result = $mysqli->query("SELECT 1 as test");
    if (!$result) {
        db_debug_log("ERROR: Test query failed: " . $mysqli->error);
        die("Database test query failed: " . $mysqli->error);
    } else {
        $test_row = $result->fetch_assoc();
        db_debug_log("Test query successful: " . print_r($test_row, true));
        $result->close();
    }
    
    // Check if the dicom_files table exists
    db_debug_log("Checking if dicom_files table exists");
    $table_check = $mysqli->query("SHOW TABLES LIKE 'dicom_files'");
    if ($table_check && $table_check->num_rows > 0) {
        db_debug_log("dicom_files table exists");
        $table_check->close();
        
        // Get table structure
        db_debug_log("Getting table structure");
        $structure_result = $mysqli->query("DESCRIBE dicom_files");
        if ($structure_result) {
            $structure = [];
            while ($row = $structure_result->fetch_assoc()) {
                $structure[] = $row;
            }
            db_debug_log("Table structure: " . print_r($structure, true));
            $structure_result->close();
        }
    } else {
        db_debug_log("WARNING: dicom_files table does not exist");
        echo "<!-- WARNING: dicom_files table does not exist -->";
    }
    
    db_debug_log("=== DATABASE CONNECTION SUCCESSFUL ===");
    
} catch (Exception $e) {
    db_debug_log("EXCEPTION in database connection: " . $e->getMessage());
    db_debug_log("Stack trace: " . $e->getTraceAsString());
    die("Database connection exception: " . $e->getMessage());
}
?>