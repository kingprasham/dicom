<?php
require_once 'db_connect.php';

function generateThumbnailsForSeries($fileIds) {
    $thumbnails = [];
    $batchSize = 50; // Process in batches
    
    for ($i = 0; $i < count($fileIds); $i += $batchSize) {
        $batch = array_slice($fileIds, $i, $batchSize);
        $thumbnails = array_merge($thumbnails, processThumbnailBatch($batch));
    }
    
    return $thumbnails;
}

function processThumbnailBatch($fileIds) {
    $thumbnails = [];
    
    foreach ($fileIds as $fileId) {
        $thumbnailPath = generateFastThumbnail($fileId);
        if ($thumbnailPath) {
            $thumbnails[$fileId] = $thumbnailPath;
        }
    }
    
    return $thumbnails;
}

function generateFastThumbnail($fileId) {
    global $mysqli;
    
    try {
        // Get file path from database
        $stmt = $mysqli->prepare("SELECT file_path FROM dicom_files WHERE id = ?");
        $stmt->bind_param("s", $fileId);
        $stmt->execute();
        $result = $stmt->get_result();
        $file = $result->fetch_assoc();
        
        if (!$file || !file_exists($file['file_path'])) {
            return null;
        }
        
        $sourcePath = $file['file_path'];
        
        // Create thumbnails directory if it doesn't exist
        $thumbnailDir = 'thumbnails/';
        if (!is_dir($thumbnailDir)) {
            mkdir($thumbnailDir, 0755, true);
        }
        
        $thumbnailPath = $thumbnailDir . $fileId . '_thumb.jpg';
        
        // Check if thumbnail already exists
        if (file_exists($thumbnailPath)) {
            return $thumbnailPath;
        }
        
        // Try to generate thumbnail using different methods
        if (generateThumbnailWithImageMagick($sourcePath, $thumbnailPath)) {
            return $thumbnailPath;
        } elseif (generateThumbnailWithGD($sourcePath, $thumbnailPath)) {
            return $thumbnailPath;
        } else {
            // Fallback: create a placeholder thumbnail
            return createPlaceholderThumbnail($thumbnailPath);
        }
        
    } catch (Exception $e) {
        error_log("Thumbnail generation error for file $fileId: " . $e->getMessage());
        return null;
    }
}

function generateThumbnailWithImageMagick($sourcePath, $thumbnailPath) {
    // Try ImageMagick with dcm2pnm or convert
    $commands = [
        "dcm2pnm +oj +Wh 64 +Ww 64 '{$sourcePath}' '{$thumbnailPath}' 2>/dev/null",
        "convert '{$sourcePath}[0]' -resize 64x64 '{$thumbnailPath}' 2>/dev/null"
    ];
    
    foreach ($commands as $command) {
        exec($command, $output, $returnCode);
        if ($returnCode === 0 && file_exists($thumbnailPath)) {
            return true;
        }
    }
    
    return false;
}

function generateThumbnailWithGD($sourcePath, $thumbnailPath) {
    // Basic DICOM parsing for thumbnail generation
    try {
        $dicomData = file_get_contents($sourcePath);
        
        // Skip to pixel data (very basic implementation)
        $pixelDataPos = strpos($dicomData, pack('H*', '7FE00010'));
        if ($pixelDataPos === false) {
            return false;
        }
        
        // Create a simple grayscale thumbnail
        $thumbnail = imagecreatetruecolor(64, 64);
        $gray = imagecolorallocate($thumbnail, 128, 128, 128);
        imagefill($thumbnail, 0, 0, $gray);
        
        // Add some basic pattern to indicate DICOM file
        $white = imagecolorallocate($thumbnail, 255, 255, 255);
        imagestring($thumbnail, 2, 10, 25, 'DICOM', $white);
        
        return imagejpeg($thumbnail, $thumbnailPath, 80);
        
    } catch (Exception $e) {
        return false;
    }
}

function createPlaceholderThumbnail($thumbnailPath) {
    $thumbnail = imagecreatetruecolor(64, 64);
    $bg = imagecolorallocate($thumbnail, 64, 64, 64);
    $white = imagecolorallocate($thumbnail, 255, 255, 255);
    
    imagefill($thumbnail, 0, 0, $bg);
    imagestring($thumbnail, 2, 8, 20, 'DICOM', $white);
    imagestring($thumbnail, 1, 15, 35, 'FILE', $white);
    
    if (imagejpeg($thumbnail, $thumbnailPath, 80)) {
        imagedestroy($thumbnail);
        return $thumbnailPath;
    }
    
    imagedestroy($thumbnail);
    return null;
}

function getDicomFilePath($fileId) {
    global $mysqli;
    
    $stmt = $mysqli->prepare("SELECT file_path FROM dicom_files WHERE id = ?");
    $stmt->bind_param("s", $fileId);
    $stmt->execute();
    $result = $stmt->get_result();
    $file = $result->fetch_assoc();
    
    return $file ? $file['file_path'] : null;
}
?>