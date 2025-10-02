<?php
/**
 * PACS System Test Script
 * Run this to verify your installation
 */

echo "========================================\n";
echo "PACS Integration System Test\n";
echo "========================================\n\n";

$errors = 0;
$warnings = 0;

// Test 1: PHP Version
echo "[1] Checking PHP version... ";
if (version_compare(PHP_VERSION, '7.4.0', '>=')) {
    echo "✓ OK (" . PHP_VERSION . ")\n";
} else {
    echo "✗ FAIL (Need 7.4+, found " . PHP_VERSION . ")\n";
    $errors++;
}

// Test 2: Required Extensions
echo "[2] Checking PHP extensions... ";
$required = ['pdo', 'pdo_mysql', 'curl', 'json', 'mbstring'];
$missing = [];
foreach ($required as $ext) {
    if (!extension_loaded($ext)) {
        $missing[] = $ext;
    }
}
if (empty($missing)) {
    echo "✓ OK\n";
} else {
    echo "✗ FAIL (Missing: " . implode(', ', $missing) . ")\n";
    $errors++;
}

// Test 3: Database Connection
echo "[3] Testing database connection... ";
require_once __DIR__ . '/config.php';
try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    echo "✓ OK\n";
} catch (PDOException $e) {
    echo "✗ FAIL (" . $e->getMessage() . ")\n";
    $errors++;
    exit(1);
}

// Test 4: Database Tables
echo "[4] Checking database tables... ";
$requiredTables = ['users', 'sessions', 'cached_patients', 'cached_studies', 'cached_series', 'study_access_log'];
$existingTables = [];
$result = $pdo->query("SHOW TABLES");
while ($row = $result->fetch(PDO::FETCH_NUM)) {
    $existingTables[] = $row[0];
}
$missingTables = array_diff($requiredTables, $existingTables);
if (empty($missingTables)) {
    echo "✓ OK (Found " . count($existingTables) . " tables)\n";
} else {
    echo "✗ FAIL (Missing: " . implode(', ', $missingTables) . ")\n";
    echo "   Run: mysql -u root -p dicom < sql/schema.sql\n";
    $errors++;
}

// Test 5: Default Users
echo "[5] Checking default users... ";
$stmt = $pdo->query("SELECT COUNT(*) FROM users");
$userCount = $stmt->fetchColumn();
if ($userCount > 0) {
    echo "✓ OK ($userCount users found)\n";
} else {
    echo "⚠ WARNING (No users found)\n";
    $warnings++;
}

// Test 6: Orthanc Connection
echo "[6] Testing Orthanc connection... ";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, ORTHANC_URL . "/system");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
curl_setopt($ch, CURLOPT_USERPWD, ORTHANC_USERNAME . ':' . ORTHANC_PASSWORD);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    $info = json_decode($response, true);
    echo "✓ OK (Orthanc " . ($info['Version'] ?? 'unknown') . ")\n";
} else {
    echo "✗ FAIL (Cannot connect to Orthanc at " . ORTHANC_URL . ")\n";
    echo "   Check if Orthanc is running: systemctl status orthanc\n";
    $errors++;
}

// Test 7: Required Directories
echo "[7] Checking directories... ";
$dirs = ['api', 'auth', 'pages', 'scripts', 'includes', 'sql'];
$missingDirs = [];
foreach ($dirs as $dir) {
    if (!is_dir(__DIR__ . '/' . $dir)) {
        $missingDirs[] = $dir;
    }
}
if (empty($missingDirs)) {
    echo "✓ OK\n";
} else {
    echo "✗ FAIL (Missing: " . implode(', ', $missingDirs) . ")\n";
    $errors++;
}

// Test 8: Required Files
echo "[8] Checking critical files... ";
$files = [
    'api/patient_list_api.php',
    'api/study_list_api.php',
    'api/load_study_fast.php',
    'api/get_dicom_orthanc.php',
    'auth/login.php',
    'auth/logout.php',
    'auth/check_session.php',
    'pages/login.html',
    'pages/patients.html',
    'pages/studies.html',
    'scripts/orthanc_cache_sync.php',
    'includes/db.php',
    'includes/session.php'
];
$missingFiles = [];
foreach ($files as $file) {
    if (!file_exists(__DIR__ . '/' . $file)) {
        $missingFiles[] = $file;
    }
}
if (empty($missingFiles)) {
    echo "✓ OK\n";
} else {
    echo "⚠ WARNING (Missing: " . count($missingFiles) . " files)\n";
    foreach ($missingFiles as $file) {
        echo "   - $file\n";
    }
    $warnings++;
}

// Test 9: File Permissions
echo "[9] Checking file permissions... ";
$writableDirs = ['reports', 'notes', 'dicom_files'];
$permissionIssues = [];
foreach ($writableDirs as $dir) {
    if (is_dir(__DIR__ . '/' . $dir)) {
        if (!is_writable(__DIR__ . '/' . $dir)) {
            $permissionIssues[] = $dir;
        }
    }
}
if (empty($permissionIssues)) {
    echo "✓ OK\n";
} else {
    echo "⚠ WARNING (Not writable: " . implode(', ', $permissionIssues) . ")\n";
    echo "   Fix with: chmod 755 " . implode(' ', $permissionIssues) . "\n";
    $warnings++;
}

// Test 10: Cache Status
echo "[10] Checking cache status... ";
$stmt = $pdo->query("SELECT COUNT(*) FROM cached_patients");
$cachedPatients = $stmt->fetchColumn();
if ($cachedPatients > 0) {
    echo "✓ OK ($cachedPatients patients cached)\n";
} else {
    echo "⚠ WARNING (Cache empty - run sync script)\n";
    echo "   Run: php scripts/orthanc_cache_sync.php\n";
    $warnings++;
}

// Summary
echo "\n========================================\n";
echo "Test Summary\n";
echo "========================================\n";
echo "Errors: $errors\n";
echo "Warnings: $warnings\n";

if ($errors === 0 && $warnings === 0) {
    echo "\n✓ System is ready! All tests passed.\n";
    echo "\nNext steps:\n";
    echo "1. Access login page: http://localhost/dicom/php/pages/login.html\n";
    echo "2. Login with: admin / admin123\n";
    echo "3. Run cache sync: php scripts/orthanc_cache_sync.php\n";
    exit(0);
} elseif ($errors === 0) {
    echo "\n⚠ System has warnings but should work.\n";
    exit(0);
} else {
    echo "\n✗ System has errors. Please fix them before proceeding.\n";
    exit(1);
}
