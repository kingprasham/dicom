<?php
/**
 * Configuration file for PACS Integration
 */

// Database Configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'dicom');
define('DB_USER', 'root');
define('DB_PASS', '');

// Orthanc Configuration
define('ORTHANC_URL', 'http://localhost:8042');
define('ORTHANC_USERNAME', 'orthanc');
define('ORTHANC_PASSWORD', 'orthanc');

// Session Configuration
define('SESSION_LIFETIME', 8 * 3600); // 8 hours
define('SESSION_NAME', 'PACS_SESSION');

// Application Configuration
define('APP_NAME', 'PACS Viewer');
define('ITEMS_PER_PAGE', 50);

// Timezone
date_default_timezone_set('Asia/Kolkata');

// Security
define('PASSWORD_MIN_LENGTH', 8);
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOCKOUT_DURATION', 900); // 15 minutes

// Performance
define('CACHE_TTL', 300); // 5 minutes
define('MAX_UPLOAD_SIZE', 50 * 1024 * 1024); // 50MB

// Debugging (DISABLE IN PRODUCTION)
define('DEBUG_MODE', true);
define('LOG_QUERIES', false);
define('LOG_ACCESS', true);
