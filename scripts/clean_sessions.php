<?php
/**
 * Clean expired sessions
 * Run via cron: 0 2 * * * /usr/bin/php /path/to/clean_sessions.php
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/db.php';

echo "Starting session cleanup...\n";

try {
    // Delete expired sessions
    $stmt = $pdo->prepare("DELETE FROM sessions WHERE expires_at < NOW()");
    $stmt->execute();
    $deletedCount = $stmt->rowCount();
    
    echo "Deleted $deletedCount expired sessions\n";
    
    // Also delete very old access logs (older than 1 year)
    $stmt = $pdo->prepare("DELETE FROM study_access_log WHERE access_time < DATE_SUB(NOW(), INTERVAL 1 YEAR)");
    $stmt->execute();
    $deletedLogs = $stmt->rowCount();
    
    echo "Deleted $deletedLogs old access logs\n";
    
    echo "Cleanup completed successfully\n";
    
} catch (Exception $e) {
    echo "Error during cleanup: " . $e->getMessage() . "\n";
    exit(1);
}
