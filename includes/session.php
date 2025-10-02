<?php
/**
 * Session management using mysqli
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/db.php';

class SessionManager {
    private $mysqli;
    
    public function __construct($mysqli) {
        $this->mysqli = $mysqli;
        $this->initSession();
    }
    
    private function initSession() {
        ini_set('session.cookie_httponly', 1);
        ini_set('session.use_strict_mode', 1);
        ini_set('session.cookie_samesite', 'Strict');
        
        if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
            ini_set('session.cookie_secure', 1);
        }
        
        session_name(SESSION_NAME);
        
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        if (!isset($_SESSION['created'])) {
            $_SESSION['created'] = time();
        } elseif (time() - $_SESSION['created'] > 1800) {
            session_regenerate_id(true);
            $_SESSION['created'] = time();
        }
    }
    
    public function createSession($userId, $rememberMe = false) {
        $token = bin2hex(random_bytes(32));
        $lifetime = $rememberMe ? (30 * 24 * 3600) : SESSION_LIFETIME;
        $expiresAt = date('Y-m-d H:i:s', time() + $lifetime);
        
        $stmt = $this->mysqli->prepare("
            INSERT INTO sessions (user_id, session_token, ip_address, user_agent, expires_at) 
            VALUES (?, ?, ?, ?, ?)
        ");
        
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? '';
        $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);
        
        $stmt->bind_param("issss", $userId, $token, $ipAddress, $userAgent, $expiresAt);
        $stmt->execute();
        $stmt->close();
        
        $_SESSION['user_id'] = $userId;
        $_SESSION['token'] = $token;
        $_SESSION['expires_at'] = $expiresAt;
        
        // Update last login
        $stmt = $this->mysqli->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $stmt->close();
        
        return $token;
    }
    
    public function validateSession() {
        if (!isset($_SESSION['user_id']) || !isset($_SESSION['token'])) {
            return false;
        }
        
        $stmt = $this->mysqli->prepare("
            SELECT s.user_id, s.expires_at, u.is_active, u.username, u.full_name, u.role
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.session_token = ? AND s.user_id = ? AND s.expires_at > NOW()
        ");
        
        $stmt->bind_param("si", $_SESSION['token'], $_SESSION['user_id']);
        $stmt->execute();
        $result = $stmt->get_result();
        $session = $result->fetch_assoc();
        $stmt->close();
        
        if (!$session || !$session['is_active']) {
            $this->destroySession();
            return false;
        }
        
        $_SESSION['username'] = $session['username'];
        $_SESSION['full_name'] = $session['full_name'];
        $_SESSION['role'] = $session['role'];
        
        return true;
    }
    
    public function destroySession() {
        if (isset($_SESSION['token'])) {
            $stmt = $this->mysqli->prepare("DELETE FROM sessions WHERE session_token = ?");
            $stmt->bind_param("s", $_SESSION['token']);
            $stmt->execute();
            $stmt->close();
        }
        
        $_SESSION = [];
        session_destroy();
    }
    
    public function getUserId() {
        return $_SESSION['user_id'] ?? null;
    }
    
    public function getUserInfo() {
        if (!$this->validateSession()) {
            return null;
        }
        
        return [
            'user_id' => $_SESSION['user_id'] ?? null,
            'username' => $_SESSION['username'] ?? null,
            'full_name' => $_SESSION['full_name'] ?? null,
            'role' => $_SESSION['role'] ?? null
        ];
    }
}
