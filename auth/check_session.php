<?php
/**
 * Check session status - using mysqli
 */

header('Content-Type: application/json');

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/session.php';

$session = new SessionManager($mysqli);
$userInfo = $session->getUserInfo();

if ($userInfo) {
    echo json_encode([
        'success' => true,
        'authenticated' => true,
        'user' => $userInfo
    ]);
} else {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'authenticated' => false,
        'message' => 'Session expired or invalid'
    ]);
}
