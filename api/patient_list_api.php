<?php
/**
 * Patient List API - Enhanced with advanced filters
 */

header('Content-Type: application/json');

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/session.php';

// Validate session
$session = new SessionManager($mysqli);
if (!$session->validateSession()) {
    http_response_code(401);
    die(json_encode(['error' => 'Unauthorized - Please login']));
}

try {
    // Get filter parameters
    $search = $_GET['search'] ?? '';
    $name = $_GET['name'] ?? '';
    $patientId = $_GET['patientId'] ?? '';
    $dobFrom = $_GET['dobFrom'] ?? '';
    $dobTo = $_GET['dobTo'] ?? '';
    $sex = $_GET['sex'] ?? '';
    $minStudies = intval($_GET['minStudies'] ?? 0);
    $sortBy = $_GET['sortBy'] ?? 'name';
    
    $page = max(1, intval($_GET['page'] ?? 1));
    $perPage = min(100, max(10, intval($_GET['per_page'] ?? 50)));
    $offset = ($page - 1) * $perPage;
    
    // Build WHERE clause
    $whereClauses = [];
    $params = [];
    $types = '';
    
    // Quick search (searches both name and ID)
    if (!empty($search)) {
        $whereClauses[] = "(patient_name LIKE ? OR patient_id LIKE ?)";
        $searchParam = "%$search%";
        $params[] = $searchParam;
        $params[] = $searchParam;
        $types .= 'ss';
    }
    
    // Specific name filter
    if (!empty($name)) {
        $whereClauses[] = "patient_name LIKE ?";
        $params[] = "%$name%";
        $types .= 's';
    }
    
    // Specific patient ID filter
    if (!empty($patientId)) {
        $whereClauses[] = "patient_id LIKE ?";
        $params[] = "%$patientId%";
        $types .= 's';
    }
    
    // Date of birth range
    if (!empty($dobFrom)) {
        $whereClauses[] = "patient_birth_date >= ?";
        $params[] = $dobFrom;
        $types .= 's';
    }
    
    if (!empty($dobTo)) {
        $whereClauses[] = "patient_birth_date <= ?";
        $params[] = $dobTo;
        $types .= 's';
    }
    
    // Sex filter
    if (!empty($sex)) {
        $whereClauses[] = "patient_sex = ?";
        $params[] = $sex;
        $types .= 's';
    }
    
    // Minimum studies filter
    if ($minStudies > 0) {
        $whereClauses[] = "study_count >= ?";
        $params[] = $minStudies;
        $types .= 'i';
    }
    
    // Combine WHERE clauses
    $whereClause = !empty($whereClauses) ? 'WHERE ' . implode(' AND ', $whereClauses) : '';
    
    // Determine sort order
    $orderBy = match($sortBy) {
        'name' => 'patient_name ASC',
        'name_desc' => 'patient_name DESC',
        'date' => 'last_study_date DESC, patient_name ASC',
        'date_asc' => 'last_study_date ASC, patient_name ASC',
        'studies' => 'study_count DESC, patient_name ASC',
        default => 'patient_name ASC'
    };
    
    // Get total count
    $countSql = "SELECT COUNT(*) as total FROM cached_patients $whereClause";
    
    if (!empty($params)) {
        $stmt = $mysqli->prepare($countSql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $result = $stmt->get_result();
        $total = $result->fetch_assoc()['total'];
        $stmt->close();
    } else {
        $result = $mysqli->query($countSql);
        $total = $result->fetch_assoc()['total'];
    }
    
    // Get patients with filters
    $sql = "SELECT patient_id, patient_name, patient_sex, patient_birth_date, 
                   study_count, last_study_date, orthanc_id
            FROM cached_patients 
            $whereClause
            ORDER BY $orderBy
            LIMIT ? OFFSET ?";
    
    if (!empty($params)) {
        $stmt = $mysqli->prepare($sql);
        // Add LIMIT and OFFSET parameters
        $params[] = $perPage;
        $params[] = $offset;
        $types .= 'ii';
        $stmt->bind_param($types, ...$params);
    } else {
        $stmt = $mysqli->prepare($sql);
        $stmt->bind_param('ii', $perPage, $offset);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    $patients = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    
    echo json_encode([
        'success' => true,
        'data' => $patients,
        'pagination' => [
            'page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'total_pages' => ceil($total / $perPage)
        ],
        'filters_applied' => [
            'search' => $search,
            'name' => $name,
            'patientId' => $patientId,
            'dobFrom' => $dobFrom,
            'dobTo' => $dobTo,
            'sex' => $sex,
            'minStudies' => $minStudies,
            'sortBy' => $sortBy
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch patient list',
        'details' => DEBUG_MODE ? $e->getMessage() : null
    ]);
}
