// Web Worker for ultra-fast background image loading
let imageCache = new Map();
let loadingQueue = [];
let isLoading = false;
let maxCacheSize = 100; // Maximum number of images to cache

self.onmessage = function(e) {
    const { type, data } = e.data;
    
    switch (type) {
        case 'PRELOAD_SERIES':
            preloadImageSeries(data.fileIds, data.priority);
            break;
        case 'LOAD_IMAGE':
            loadSingleImage(data.fileId, data.urgent);
            break;
        case 'CLEAR_CACHE':
            clearCache();
            break;
        case 'SET_CACHE_SIZE':
            maxCacheSize = data.size;
            break;
    }
};

async function preloadImageSeries(fileIds, priority = 'normal') {
    console.log(`Worker: Starting preload of ${fileIds.length} images with ${priority} priority`);
    
    const batchSize = priority === 'urgent' ? 3 : 10; // Smaller batches for urgent
    const maxConcurrent = priority === 'urgent' ? 2 : 5;
    
    try {
        for (let i = 0; i < fileIds.length; i += batchSize) {
            const batch = fileIds.slice(i, i + batchSize);
            
            // Process batch with controlled concurrency
            const batchPromises = batch.map((fileId, index) => 
                loadImageDataWithDelay(fileId, index * 50) // Stagger requests by 50ms
            );
            
            const results = await Promise.allSettled(batchPromises);
            
            // Report progress
            self.postMessage({
                type: 'PROGRESS',
                loaded: Math.min(i + batchSize, fileIds.length),
                total: fileIds.length
            });
            
            // Add small delay between batches to prevent server overload
            if (i + batchSize < fileIds.length) {
                await sleep(priority === 'urgent' ? 100 : 200);
            }
        }
        
        self.postMessage({
            type: 'PRELOAD_COMPLETE',
            totalLoaded: imageCache.size
        });
        
    } catch (error) {
        self.postMessage({
            type: 'PRELOAD_ERROR',
            error: error.message
        });
    }
}

async function loadSingleImage(fileId, urgent = false) {
    if (imageCache.has(fileId)) {
        // Send cached image immediately
        const cachedData = imageCache.get(fileId);
        self.postMessage({
            type: 'IMAGE_LOADED',
            fileId: fileId,
            imageData: cachedData,
            fromCache: true
        });
        return;
    }
    
    try {
        const imageData = await loadImageData(fileId);
        
        self.postMessage({
            type: 'IMAGE_LOADED',
            fileId: fileId,
            imageData: imageData,
            fromCache: false
        });
        
    } catch (error) {
        self.postMessage({
            type: 'LOAD_ERROR',
            fileId: fileId,
            error: error.message
        });
    }
}

async function loadImageDataWithDelay(fileId, delay = 0) {
    if (delay > 0) {
        await sleep(delay);
    }
    return loadImageData(fileId);
}

// Add better error logging in the worker
async function loadImageData(fileId) {
    if (imageCache.has(fileId)) {
        return imageCache.get(fileId);
    }
    
    try {
        console.log(`Worker: Loading image with ID: ${fileId}`);
        
        // Use fetch with optimized settings
        const response = await fetch(`get_dicom_fast.php?id=${fileId}&format=base64`, {
            method: 'GET',
            cache: 'default',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'max-age=3600'
            }
        });
        
        console.log(`Worker: Response status for ${fileId}:`, response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Worker: Error response for ${fileId}:`, errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }
        
        const data = await response.json();
        
        if (!data.success || !data.file_data) {
            console.error(`Worker: Invalid response for ${fileId}:`, data);
            throw new Error('Invalid response format: ' + JSON.stringify(data));
        }
        
        // Cache management
        if (imageCache.size >= maxCacheSize) {
            const firstKey = imageCache.keys().next().value;
            imageCache.delete(firstKey);
        }
        
        imageCache.set(fileId, data.file_data);
        console.log(`Worker: Successfully loaded and cached image ${fileId}`);
        
        return data.file_data;
        
    } catch (error) {
        console.error(`Worker: Failed to load image ${fileId}:`, error);
        throw error;
    }
}

function clearCache() {
    imageCache.clear();
    self.postMessage({
        type: 'CACHE_CLEARED',
        message: 'Image cache cleared'
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Periodic cache cleanup
setInterval(() => {
    if (imageCache.size > maxCacheSize) {
        const entriesToRemove = imageCache.size - maxCacheSize;
        const keys = Array.from(imageCache.keys()).slice(0, entriesToRemove);
        keys.forEach(key => imageCache.delete(key));
        
        console.log(`Worker: Cleaned up cache, removed ${entriesToRemove} entries`);
    }
}, 30000); // Clean up every 30 seconds

// Handle worker errors
self.addEventListener('error', function(error) {
    console.error('Worker error:', error);
    self.postMessage({
        type: 'WORKER_ERROR',
        error: error.message
    });
});

console.log('Image loader worker initialized');