<?php
/**
 * Test session status
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/session.php';

header('Content-Type: application/json');

$session = new SessionManager($mysqli);

echo json_encode([
    'php_session_id' => session_id(),
    'php_session_status' => session_status(),
    'session_data' => $_SESSION,
    'is_valid' => $session->validateSession(),
    'user_info' => $session->getUserInfo()
], JSON_PRETTY_PRINT);
