<?php
/**
 * Login endpoint using mysqli
 */

header('Content-Type: application/json');

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/session.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die(json_encode(['success' => false, 'message' => 'Method not allowed']));
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $username = trim($input['username'] ?? '');
    $password = $input['password'] ?? '';
    $rememberMe = $input['rememberMe'] ?? false;
    
    if (empty($username) || empty($password)) {
        throw new Exception('Username and password are required');
    }
    
    // Get user
    $stmt = $mysqli->prepare("
        SELECT id, username, password_hash, full_name, role, is_active 
        FROM users 
        WHERE username = ?
    ");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();
    
    if (!$user) {
        sleep(1);
        throw new Exception('Invalid username or password');
    }
    
    if (!$user['is_active']) {
        throw new Exception('Account is disabled');
    }
    
    if (!password_verify($password, $user['password_hash'])) {
        sleep(1);
        throw new Exception('Invalid username or password');
    }
    
    // Create session
    $session = new SessionManager($mysqli);
    $token = $session->createSession($user['id'], $rememberMe);
    
    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'full_name' => $user['full_name'],
            'role' => $user['role']
        ],
        'redirect' => '../pages/patients.html'
    ]);
    
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
