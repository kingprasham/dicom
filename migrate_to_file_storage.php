<?php
// Memory-efficient migration script for DICOM files
ini_set('memory_limit', '256M'); // Increase memory limit temporarily
ini_set('max_execution_time', 0); // Remove time limit
set_time_limit(0);

require_once 'db_connect.php';

echo "Starting memory-efficient migration to file storage system...\n";

// Create dicom_files directory if it doesn't exist
$uploadDir = 'dicom_files/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
    echo "Created directory: $uploadDir\n";
}

// Get total count first
$countSql = "SELECT COUNT(*) as total FROM dicom_files WHERE (file_path IS NULL OR file_path = '') AND file_data IS NOT NULL";
$countResult = $mysqli->query($countSql);
$totalFiles = $countResult->fetch_assoc()['total'];

echo "Found $totalFiles files to migrate\n";

if ($totalFiles == 0) {
    echo "No files need migration. Exiting.\n";
    exit();
}

$migrated = 0;
$errors = 0;
$batchSize = 5; // Process 5 files at a time to manage memory

// Process files in small batches to avoid memory issues
for ($offset = 0; $offset < $totalFiles; $offset += $batchSize) {
    echo "\nProcessing batch: " . ($offset + 1) . " to " . min($offset + $batchSize, $totalFiles) . "\n";
    
    // Get a small batch of files
    $sql = "SELECT id, file_name FROM dicom_files 
            WHERE (file_path IS NULL OR file_path = '') 
            AND file_data IS NOT NULL 
            LIMIT $batchSize OFFSET $offset";
    
    $result = $mysqli->query($sql);
    
    if (!$result) {
        echo "Query failed: " . $mysqli->error . "\n";
        continue;
    }
    
    while ($row = $result->fetch_assoc()) {
        $fileId = $row['id'];
        $fileName = $row['file_name'];
        
        echo "Processing: $fileName... ";
        
        try {
            // Get file data separately to manage memory
            $dataSql = "SELECT file_data FROM dicom_files WHERE id = ?";
            $dataStmt = $mysqli->prepare($dataSql);
            $dataStmt->bind_param("s", $fileId);
            $dataStmt->execute();
            $dataResult = $dataStmt->get_result();
            $dataRow = $dataResult->fetch_assoc();
            
            if (!$dataRow || empty($dataRow['file_data'])) {
                throw new Exception("No file data found");
            }
            
            $fileData = $dataRow['file_data'];
            
            // Clean up memory immediately
            $dataStmt->close();
            unset($dataResult, $dataRow);
            
            // Generate file path
            $filePath = $uploadDir . $fileId . '.dcm';
            
            // Decode base64 in chunks to avoid memory issues
            $binaryData = base64_decode($fileData);
            
            // Clear the base64 data from memory immediately
            unset($fileData);
            
            if ($binaryData === false) {
                throw new Exception("Failed to decode base64 data");
            }
            
            // Write to file
            if (file_put_contents($filePath, $binaryData) === false) {
                throw new Exception("Failed to write file: $filePath");
            }
            
            $fileSize = filesize($filePath);
            
            // Clear binary data from memory
            unset($binaryData);
            
            // Update database record (remove file_data to save space)
            $updateSql = "UPDATE dicom_files SET file_path = ?, file_size = ?, file_data = NULL WHERE id = ?";
            $updateStmt = $mysqli->prepare($updateSql);
            $updateStmt->bind_param("sis", $filePath, $fileSize, $fileId);
            
            if (!$updateStmt->execute()) {
                throw new Exception("Failed to update database: " . $updateStmt->error);
            }
            
            $updateStmt->close();
            
            $migrated++;
            echo "SUCCESS ($migrated/$totalFiles)\n";
            
            // Force garbage collection to free memory
            if (function_exists('gc_collect_cycles')) {
                gc_collect_cycles();
            }
            
        } catch (Exception $e) {
            $errors++;
            echo "ERROR: " . $e->getMessage() . "\n";
            
            // Clean up any partial file
            if (isset($filePath) && file_exists($filePath)) {
                unlink($filePath);
            }
        }
        
        // Small delay to prevent overwhelming the system
        usleep(100000); // 0.1 second delay
    }
    
    $result->close();
    
    // Memory status report
    $memoryUsage = memory_get_usage(true);
    $memoryPeak = memory_get_peak_usage(true);
    echo "Memory usage: " . round($memoryUsage/1024/1024, 2) . "MB, Peak: " . round($memoryPeak/1024/1024, 2) . "MB\n";
}

echo "\n" . str_repeat("=", 50) . "\n";
echo "MIGRATION COMPLETED!\n";
echo "Successfully migrated: $migrated files\n";
echo "Errors: $errors files\n";
echo "Total processed: " . ($migrated + $errors) . "/$totalFiles files\n";

if ($migrated > 0) {
    echo "\nSpace saved by removing base64 data from database!\n";
    
    // Optional: Clean up any remaining NULL file_data entries
    echo "\nCleaning up database...\n";
    $cleanupSql = "UPDATE dicom_files SET file_data = NULL WHERE file_path IS NOT NULL AND file_data IS NOT NULL";
    if ($mysqli->query($cleanupSql)) {
        echo "Database cleanup completed.\n";
    }
    
    // Show storage statistics
    $statsSql = "SELECT 
        COUNT(*) as total_files,
        COUNT(CASE WHEN file_path IS NOT NULL THEN 1 END) as files_on_disk,
        COUNT(CASE WHEN file_data IS NOT NULL THEN 1 END) as files_in_db,
        SUM(file_size) as total_size_bytes
        FROM dicom_files";
    
    $statsResult = $mysqli->query($statsSql);
    if ($statsResult) {
        $stats = $statsResult->fetch_assoc();
        echo "\nSTORAGE STATISTICS:\n";
        echo "Total files: " . $stats['total_files'] . "\n";
        echo "Files on disk: " . $stats['files_on_disk'] . "\n";
        echo "Files still in DB: " . $stats['files_in_db'] . "\n";
        echo "Total disk space used: " . round($stats['total_size_bytes']/1024/1024, 2) . " MB\n";
    }
    
    echo "\nYour DICOM viewer is now optimized for ultra-fast performance!\n";
}

$mysqli->close();
?>