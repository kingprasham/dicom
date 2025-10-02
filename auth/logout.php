<?php
/**
 * Logout endpoint - using mysqli
 */

header('Content-Type: application/json');

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/session.php';

$session = new SessionManager($mysqli);
$session->destroySession();

echo json_encode([
    'success' => true,
    'message' => 'Logged out successfully'
]);
