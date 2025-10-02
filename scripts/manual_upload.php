<?php
// manual_upload.php - A script to scan a folder and push DICOM files to Orthanc

echo "========================================\n";
echo "Starting Manual DICOM Upload to Orthanc\n";
echo "========================================\n\n";

// --- CONFIGURATION ---
$orthancUrl = 'http://localhost:8042/instances';
$watchFolder = 'C:/DICOM_INCOMING';
$logFile = __DIR__ . '/uploaded_files.log';
// -------------------

if (!is_dir($watchFolder)) {
    die("ERROR: The folder to watch does not exist: $watchFolder\n");
}

// Load the list of already uploaded files
$uploadedFiles = [];
if (file_exists($logFile)) {
    $uploadedFiles = array_filter(explode("\n", file_get_contents($logFile)));
}
echo "Found " . count($uploadedFiles) . " previously uploaded files to skip.\n\n";

// Scan the directory recursively for all files
$iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($watchFolder));
$allFiles = iterator_to_array($iterator);
$newFilesFound = 0;

foreach ($allFiles as $file) {
    if ($file->isDir()){
        continue;
    }

    $filePath = str_replace('\\', '/', $file->getPathname());

    // Check if this file has already been uploaded
    if (in_array($filePath, $uploadedFiles)) {
        continue;
    }

    $newFilesFound++;
    echo "Found new file: " . $file->getFilename() . "\n";

    // Read file content
    $dicomData = file_get_contents($filePath);

    // Use cURL to send the file to Orthanc's REST API
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $orthancUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $dicomData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/dicom']);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    // Check the result
    if ($httpCode == 200) {
        echo "  => SUCCESS: Uploaded to Orthanc.\n";
        // Log the file path so we don't upload it again
        file_put_contents($logFile, $filePath . "\n", FILE_APPEND);
    } else {
        echo "  => FAILED: Orthanc returned HTTP code $httpCode.\n";
        echo "     Response: $response\n";
    }
}

if ($newFilesFound == 0) {
    echo "No new files to upload.\n";
}

echo "\n========================================\n";
echo "Upload script finished.\n";
echo "========================================\n";
?>