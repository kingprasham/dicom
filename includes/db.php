<?php
/**
 * Database connection using mysqli
 */

require_once __DIR__ . '/../config.php';

try {
    // Create mysqli connection
    $mysqli = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    // Check connection
    if ($mysqli->connect_error) {
        throw new Exception('Connection failed: ' . $mysqli->connect_error);
    }
    
    // Set charset
    $mysqli->set_charset("utf8mb4");
    
    // Test connection
    if (!$mysqli->ping()) {
        throw new Exception('Database connection lost');
    }
    
} catch (Exception $e) {
    error_log('[PACS DB Error] ' . $e->getMessage());
    
    if (defined('DEBUG_MODE') && DEBUG_MODE) {
        die(json_encode([
            'error' => 'Database connection failed',
            'details' => $e->getMessage()
        ]));
    } else {
        die(json_encode(['error' => 'Service temporarily unavailable']));
    }
}
