<?php
/**
 * Test login credentials
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/includes/db.php';

echo "========================================\n";
echo "Login Test Script\n";
echo "========================================\n\n";

$username = 'admin';
$password = 'admin123';

echo "Testing login for: $username\n";
echo "Password: $password\n\n";

// Get user from database
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
    echo "❌ User not found in database!\n\n";
    echo "Creating admin user...\n";
    
    // Create admin user
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $mysqli->prepare("
        INSERT INTO users (username, password_hash, full_name, email, role, is_active)
        VALUES (?, ?, 'System Administrator', 'admin@hospital.com', 'admin', 1)
    ");
    $stmt->bind_param("ss", $username, $passwordHash);
    
    if ($stmt->execute()) {
        echo "✓ Admin user created successfully!\n\n";
        echo "You can now login with:\n";
        echo "Username: admin\n";
        echo "Password: admin123\n";
    } else {
        echo "❌ Failed to create user: " . $mysqli->error . "\n";
    }
    $stmt->close();
    exit;
}

echo "✓ User found in database\n";
echo "ID: " . $user['id'] . "\n";
echo "Full Name: " . $user['full_name'] . "\n";
echo "Role: " . $user['role'] . "\n";
echo "Active: " . ($user['is_active'] ? 'Yes' : 'No') . "\n\n";

if (!$user['is_active']) {
    echo "❌ User account is disabled!\n\n";
    echo "Enabling account...\n";
    $mysqli->query("UPDATE users SET is_active = 1 WHERE username = 'admin'");
    echo "✓ Account enabled\n\n";
}

// Test password
echo "Testing password...\n";
if (password_verify($password, $user['password_hash'])) {
    echo "✓ Password is correct!\n\n";
    echo "Login should work. If it doesn't, check:\n";
    echo "1. Browser console for JavaScript errors\n";
    echo "2. Network tab to see the actual response\n";
    echo "3. Clear browser cache and cookies\n";
} else {
    echo "❌ Password verification failed!\n\n";
    echo "Resetting password...\n";
    
    $newHash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $mysqli->prepare("UPDATE users SET password_hash = ? WHERE username = ?");
    $stmt->bind_param("ss", $newHash, $username);
    
    if ($stmt->execute()) {
        echo "✓ Password reset successfully!\n\n";
        echo "Try logging in again with:\n";
        echo "Username: admin\n";
        echo "Password: admin123\n";
    } else {
        echo "❌ Failed to reset password: " . $mysqli->error . "\n";
    }
    $stmt->close();
}

echo "\n========================================\n";
echo "Test Complete\n";
echo "========================================\n";
