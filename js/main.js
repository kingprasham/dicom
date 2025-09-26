// Replace the initialization section in main.js with this:

document.addEventListener('DOMContentLoaded', function () {
    // Initialize managers namespace
    window.DICOM_VIEWER.MANAGERS = {};

    try {
        // Initialize Cornerstone
        window.DICOM_VIEWER.CornerstoneInit.initialize();

        // Initialize managers
        window.DICOM_VIEWER.MANAGERS.enhancementManager = new window.DICOM_VIEWER.ImageEnhancementManager();
        window.DICOM_VIEWER.MANAGERS.viewportManager = new window.DICOM_VIEWER.MPRViewportManager();
        window.DICOM_VIEWER.MANAGERS.crosshairManager = new window.DICOM_VIEWER.CrosshairManager();
        window.DICOM_VIEWER.MANAGERS.mprManager = new window.DICOM_VIEWER.MPRManager();

        window.DICOM_VIEWER.MANAGERS.medicalNotes = new window.DICOM_VIEWER.MedicalNotesManager();


        console.log('Modern DICOM Viewer managers initialized');

        // Initialize viewports with default layout
        window.DICOM_VIEWER.MANAGERS.viewportManager.createViewports('2x2');

        // Initialize components
        window.DICOM_VIEWER.UploadHandler.initialize();
        window.DICOM_VIEWER.UIControls.initialize();
        window.DICOM_VIEWER.EventHandlers.initialize();

        // FIXED: Set initial active viewport with proper delay
        setTimeout(() => {
            const viewportManager = window.DICOM_VIEWER.MANAGERS.viewportManager;
            // Try to get 'original' viewport first, then fallback to first available
            let initialViewport = viewportManager.getViewport('original');
            if (!initialViewport) {
                const allViewports = viewportManager.getAllViewports();
                initialViewport = allViewports[0];
            }
            
            if (initialViewport) {
                viewportManager.setActiveViewport(initialViewport);
                console.log('Initial active viewport set successfully');
            } else {
                console.error('No viewports available for initial activation');
            }
        }, 800); // Increased delay to ensure viewports are fully ready

        // Initialize UI
        initializeUI();

        console.log('Enhanced DICOM Viewer fully initialized with modern controls');

    } catch (error) {
        console.error('Failed to initialize DICOM Viewer:', error);
        showErrorMessage('Failed to initialize DICOM Viewer: ' + error.message);
    }

    // Core application functions
    function initializeUI() {
        const toolsPanel = document.getElementById('tools-panel');
        const wlButton = toolsPanel.querySelector('[data-tool="Wwwc"]');
        if (wlButton) {
            window.DICOM_VIEWER.setActiveTool('Wwwc', wlButton);
        }

        ['mprAxial', 'mprSagittal', 'mprCoronal', 'mprAll'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = true;
        });

        setTimeout(() => {
            window.DICOM_VIEWER.showAISuggestion('Welcome to Enhanced DICOM Viewer! Upload DICOM files to start. MPR views will be automatically generated for multi-slice series.');
        }, 1000);

        console.log('Enhanced DICOM Viewer initialized with MPR support');
    }

    function showErrorMessage(message) {
        const viewportContainer = document.getElementById('viewport-container');
        viewportContainer.innerHTML = `
            <div class="d-flex justify-content-center align-items-center" style="grid-column: 1 / -1; grid-row: 1 / -1;">
                <div class="text-center">
                    <i class="bi bi-exclamation-triangle text-warning fs-1 mb-3"></i>
                    <div class="text-light h5">${message}</div>
                    <button class="btn btn-primary mt-3" onclick="location.reload()">Reload Page</button>
                </div>
            </div>
        `;
    }
});

// ===== GLOBAL UTILITY FUNCTIONS =====

// Enhanced loading indicator with multiple status support
window.DICOM_VIEWER.showLoadingIndicator = function(message, showInViewport = true) {
    const loadingProgress = document.getElementById('loadingProgress');
    
    if (loadingProgress) {
        loadingProgress.style.display = 'block';
        loadingProgress.querySelector('span').textContent = message;
    }

    // Also show loading message in viewport container for better visibility
    if (showInViewport) {
        const viewportContainer = document.getElementById('viewport-container');
        if (viewportContainer) {
            // Create or update loading overlay in viewport
            let viewportLoading = document.getElementById('viewport-loading-overlay');
            if (!viewportLoading) {
                viewportLoading = document.createElement('div');
                viewportLoading.id = 'viewport-loading-overlay';
                viewportLoading.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(2px);
                `;
                viewportContainer.appendChild(viewportLoading);
            }
            
            viewportLoading.innerHTML = `
                <div class="text-center text-white">
                    <div class="spinner-border mb-3" role="status" style="width: 3rem; height: 3rem;"></div>
                    <h5>${message}</h5>
                    <div class="progress mt-3" style="width: 300px; height: 8px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" 
                             role="progressbar" style="width: 100%"></div>
                    </div>
                </div>
            `;
            viewportLoading.style.display = 'flex';
        }
    }

    console.log('Loading indicator shown:', message);
};

window.DICOM_VIEWER.hideLoadingIndicator = function() {
    const loadingProgress = document.getElementById('loadingProgress');
    if (loadingProgress) {
        loadingProgress.style.display = 'none';
    }

    // Hide viewport loading overlay
    const viewportLoading = document.getElementById('viewport-loading-overlay');
    if (viewportLoading) {
        viewportLoading.style.display = 'none';
        // Remove it after a delay to prevent flashing
        setTimeout(() => {
            if (viewportLoading.parentNode) {
                viewportLoading.parentNode.removeChild(viewportLoading);
            }
        }, 300);
    }

    console.log('Loading indicator hidden');
};

// Enhanced loading with progress support
window.DICOM_VIEWER.updateLoadingProgress = function(message, progress = null) {
    const loadingProgress = document.getElementById('loadingProgress');
    if (loadingProgress) {
        loadingProgress.querySelector('span').textContent = message;
    }

    const viewportLoading = document.getElementById('viewport-loading-overlay');
    if (viewportLoading) {
        const messageElement = viewportLoading.querySelector('h5');
        const progressBar = viewportLoading.querySelector('.progress-bar');
        
        if (messageElement) {
            messageElement.textContent = message;
        }
        
        if (progressBar && progress !== null) {
            progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
            progressBar.textContent = `${Math.round(progress)}%`;
        }
    }
};

window.DICOM_VIEWER.showErrorMessage = function(message) {
    window.DICOM_VIEWER.hideLoadingIndicator();
    const viewportContainer = document.getElementById('viewport-container');
    viewportContainer.innerHTML = `
        <div class="d-flex justify-content-center align-items-center" style="grid-column: 1 / -1; grid-row: 1 / -1;">
            <div class="text-center">
                <i class="bi bi-exclamation-triangle text-warning fs-1 mb-3"></i>
                <div class="text-light h5">${message}</div>
                <button class="btn btn-primary mt-3" onclick="location.reload()">Reload Page</button>
            </div>
        </div>
    `;
};

window.DICOM_VIEWER.showAISuggestion = function(text) {
    const aiSuggestions = document.getElementById('aiSuggestions');
    const suggestionText = document.getElementById('suggestionText');

    if (aiSuggestions && suggestionText) {
        suggestionText.textContent = text;
        aiSuggestions.style.display = 'block';

        setTimeout(() => {
            aiSuggestions.style.display = 'none';
        }, 5000);
    }
};


//
// ➡️ PASTE THIS IN: main.js
//

// ENHANCED: Replace the entire loadImageSeries function in main.js with this robust version.
window.DICOM_VIEWER.loadImageSeries = async function(uploadedFiles) {
    console.log('=== ROBUST SERIES LOAD SEQUENCE INITIATED ===');
    const state = window.DICOM_VIEWER.STATE;

    // FIX: Stop any ongoing processes like cine playback.
    if (state.isPlaying) {
        window.DICOM_VIEWER.stopCine();
    }
    
    window.DICOM_VIEWER.showLoadingIndicator('Preparing new session...', false);
    await new Promise(resolve => setTimeout(resolve, 50)); // Allow UI to update.

    // --- AGGRESSIVE CLEANUP ---
    console.log('Step 1: Aggressive Cleanup of Previous State');

    // FIX: Dispose of the old MPR Manager instance completely to release the 3D volume from memory.
    if (window.DICOM_VIEWER.MANAGERS.mprManager) {
        window.DICOM_VIEWER.MANAGERS.mprManager.dispose();
        // Create a fresh, clean instance for the new series.
        window.DICOM_VIEWER.MANAGERS.mprManager = new window.DICOM_VIEWER.MPRManager();
        console.log('Old MPR Manager disposed. New instance created.');
    }

    // FIX: Purge Cornerstone's internal cache of all image objects. This is crucial for releasing memory.
    cornerstone.imageCache.purgeCache();
    console.log('Cornerstone image cache purged.');

    // FIX: Tell the Web Worker to clear its cache to prevent it from holding onto old images.
    if (window.DICOM_VIEWER.imageLoaderWorker) {
        window.DICOM_VIEWER.imageLoaderWorker.postMessage({ type: 'CLEAR_CACHE' });
        console.log('Instructed Web Worker to clear its cache.');
    }
    
    // FIX: Reset all relevant global state variables to their defaults.
    state.currentSeriesImages = [];
    state.mprViewports = {};
    state.currentSlicePositions = { axial: 0.5, sagittal: 0.5, coronal: 0.5 };
    state.totalImages = 0;
    state.currentImageIndex = 0;
    state.currentFileId = null;
    console.log('Global state has been reset.');

    // --- SETUP FOR NEW SERIES ---
    console.log('Step 2: Setting up for New Series');
    
    // Set new series data
    state.currentSeriesImages = uploadedFiles;
    state.totalImages = uploadedFiles.length;
    
    // Create a fresh set of viewports for the new session. This calls cleanup internally.
    window.DICOM_VIEWER.MANAGERS.viewportManager.createViewports('2x2');
    await new Promise(resolve => setTimeout(resolve, 100)); // Allow viewports to be created.

    // --- LOAD NEW DATA ---
    console.log('Step 3: Loading New Series Data');
    window.DICOM_VIEWER.populateSeriesList(uploadedFiles);

    if (uploadedFiles.length > 0) {
        state.currentFileId = uploadedFiles[0].id;
        console.log(`Auto-loading first image: ${state.currentFileId}`);

        // Set the primary viewport as active before loading.
        const primaryViewport = window.DICOM_VIEWER.MANAGERS.viewportManager.getViewport('original') || window.DICOM_VIEWER.MANAGERS.viewportManager.getAllViewports()[0];
        if (primaryViewport) {
            window.DICOM_VIEWER.MANAGERS.viewportManager.setActiveViewport(primaryViewport);
        }

        // Load the first image and update UI.
        await window.DICOM_VIEWER.loadCurrentImage();
        window.DICOM_VIEWER.setupImageNavigation();
        window.DICOM_VIEWER.updateImageCounter();
        window.DICOM_VIEWER.updateImageSlider();
        
        // Auto-select the first item in the series list.
        const firstSeriesItem = document.querySelector('.series-item');
        if (firstSeriesItem) firstSeriesItem.classList.add('selected');

        // Enable or disable MPR based on the number of images.
        const mprNav = document.getElementById('mprNavigation');
        const mprButtons = ['mprAxial', 'mprSagittal', 'mprCoronal', 'mprAll'];
        if (uploadedFiles.length > 1 && state.mprEnabled) {
            if(mprNav) mprNav.style.display = 'block';
            mprButtons.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.disabled = false;
            });
            window.DICOM_VIEWER.showAISuggestion(`New series loaded with ${uploadedFiles.length} images. MPR is ready.`);
        } else {
            if(mprNav) mprNav.style.display = 'none';
            mprButtons.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.disabled = true;
            });
            window.DICOM_VIEWER.showAISuggestion('Single image loaded successfully.');
        }
    } else {
        window.DICOM_VIEWER.showErrorMessage('No valid DICOM files were loaded.');
    }
    
    window.DICOM_VIEWER.hideLoadingIndicator();
    console.log('=== ROBUST SERIES LOAD SEQUENCE COMPLETED ===');
};

// ===== IMAGE LOADING AND SERIES MANAGEMENT =====

// COMPLETELY REWRITTEN: loadCurrentImage with better viewport handling
window.DICOM_VIEWER.loadCurrentImage = async function(skipLoadingIndicator = false) {
    const state = window.DICOM_VIEWER.STATE;
    let targetViewport = state.activeViewport;

    // Enhanced viewport selection logic - prioritize active viewport, then try by layout
    if (!targetViewport && window.DICOM_VIEWER.MANAGERS.viewportManager) {
        // Strategy 1: Use current active viewport if available
        if (state.activeViewport) {
            try {
                cornerstone.getEnabledElement(state.activeViewport);
                targetViewport = state.activeViewport;
            } catch (error) {
                console.log('Active viewport not enabled, trying alternatives...');
            }
        }

        // Strategy 2: Try layout-specific primary viewports
// Update this section in the loadCurrentImage function in main.js
// Strategy 2: Try layout-specific primary viewports
if (!targetViewport) {
    const currentLayout = window.DICOM_VIEWER.MANAGERS.viewportManager.currentLayout;
    const primaryViewportNames = {
        '2x2': 'original',
        '1x1': 'main', 
        '2x1': 'left'
        // Removed '1x2': 'top'
    };
    
    const primaryName = primaryViewportNames[currentLayout];
    if (primaryName) {
        const primaryVp = window.DICOM_VIEWER.MANAGERS.viewportManager.getViewport(primaryName);
        if (primaryVp) {
            try {
                cornerstone.getEnabledElement(primaryVp);
                targetViewport = primaryVp;
            } catch (error) {
                try {
                    cornerstone.enable(primaryVp);
                    targetViewport = primaryVp;
                    console.log(`Re-enabled primary viewport: ${primaryName}`);
                } catch (enableError) {
                    console.warn(`Could not enable primary viewport: ${primaryName}`);
                }
            }
        }
    }
}

        // Strategy 3: Try first available viewport
        if (!targetViewport) {
            const allViewports = window.DICOM_VIEWER.MANAGERS.viewportManager.getAllViewports();
            for (const viewport of allViewports) {
                if (viewport) {
                    try {
                        cornerstone.getEnabledElement(viewport);
                        targetViewport = viewport;
                        break;
                    } catch (error) {
                        try {
                            cornerstone.enable(viewport);
                            targetViewport = viewport;
                            console.log('Re-enabled fallback viewport for image loading');
                            break;
                        } catch (enableError) {
                            console.warn('Could not enable fallback viewport');
                            continue;
                        }
                    }
                }
            }
        }

        // Set as active viewport if we found one
        if (targetViewport) {
            window.DICOM_VIEWER.MANAGERS.viewportManager.setActiveViewport(targetViewport);
        }
    }

    // Final check - if still no viewport, create error
    if (!targetViewport) {
        console.error('Cannot load image: No viewports available after all strategies tried.');
        window.DICOM_VIEWER.showErrorMessage('No viewports available for image display. Please refresh the page.');
        return;
    }

    // Double-check viewport is enabled
    try {
        cornerstone.getEnabledElement(targetViewport);
    } catch (error) {
        console.error('Target viewport is not enabled after selection:', error);
        
        // Final attempt to enable it
        try {
            cornerstone.enable(targetViewport);
            console.log('Successfully enabled target viewport as last resort');
        } catch (enableError) {
            console.error('Failed to enable target viewport as last resort:', enableError);
            window.DICOM_VIEWER.showErrorMessage('Failed to prepare viewport for image display. Please refresh the page.');
            return;
        }
    }

    // Validate we have image data to load
    if (state.currentImageIndex >= state.currentSeriesImages.length || !state.currentFileId) {
        console.error('Cannot load image: invalid index or no file ID');
        return;
    }

    console.log(`Loading image with ID: ${state.currentFileId} into viewport: ${targetViewport.dataset.viewportName}`);

    // Loading indicator management (only show for non-cine operations)
    let loadingDiv = null;
    if (!skipLoadingIndicator && !state.isPlaying) {
        loadingDiv = document.createElement('div');
        loadingDiv.style.cssText = `
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.9); color: white; padding: 12px 16px; border-radius: 6px;
            z-index: 100; pointer-events: none; font-size: 12px; font-weight: 500;
            border: 1px solid rgba(255,255,255,0.2);
        `;
        loadingDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="spinner-border spinner-border-sm me-2" style="width: 16px; height: 16px;"></div>
                Loading image...
            </div>
        `;
        targetViewport.appendChild(loadingDiv);
    }

    try {
        const response = await fetch(`get_dicom_fast.php?id=${state.currentFileId}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success || !data.file_data) {
            throw new Error('Invalid response: ' + (data.error || 'No file data received'));
        }

        // Remove loading indicator immediately on success
        if (loadingDiv && loadingDiv.parentNode) {
            loadingDiv.parentNode.removeChild(loadingDiv);
            loadingDiv = null;
        }

        const imageId = 'wadouri:data:application/dicom;base64,' + data.file_data;

        // Load and display image
        const image = await cornerstone.loadImage(imageId);
        cornerstone.displayImage(targetViewport, image);

        // Update UI only during non-cine operations
        if (!state.isPlaying) {
            window.DICOM_VIEWER.updateViewportInfo();
            window.DICOM_VIEWER.updatePatientInfo(data);
        }

        // Store original state for enhancements
        if (window.DICOM_VIEWER.MANAGERS.enhancementManager) {
            window.DICOM_VIEWER.MANAGERS.enhancementManager.storeOriginalState(targetViewport, image);
        }

        if (window.DICOM_VIEWER.MANAGERS.medicalNotes && data) {
            window.DICOM_VIEWER.MANAGERS.medicalNotes.loadNotesForImage(state.currentFileId, data);
        }

        console.log('Image loaded and displayed successfully');

        // Update series list selection (only during non-cine)
        if (!state.isPlaying) {
            const seriesItems = document.querySelectorAll('.series-item');
            seriesItems.forEach((item, index) => {
                if (index === state.currentImageIndex) {
                    item.classList.add('selected');
                } else {
                    item.classList.remove('selected');
                }
            });
        }

    } catch (error) {
        console.error('Error loading image:', error);

        // Remove loading indicator on error
        if (loadingDiv && loadingDiv.parentNode) {
            loadingDiv.parentNode.removeChild(loadingDiv);
        }

        // Show error only if not playing cine
        if (!state.isPlaying) {
            targetViewport.innerHTML = `
                <div style="color: white; text-align: center; padding: 20px; display: flex; flex-direction: column; justify-content: center; height: 100%; background: #000;">
                    <i class="bi bi-exclamation-triangle text-warning fs-1 mb-3"></i>
                    <h5>Image Load Error</h5>
                    <p class="small text-muted">${error.message}</p>
                    <div class="mt-3">
                        <button onclick="window.DICOM_VIEWER.loadCurrentImage()" class="btn btn-primary btn-sm me-2">Retry</button>
                        <button onclick="location.reload()" class="btn btn-secondary btn-sm">Reload Page</button>
                    </div>
                </div>
            `;
        }
    }
};

// ===== UI UPDATE FUNCTIONS =====

// Replace the populateSeriesList function in main.js with this new version
window.DICOM_VIEWER.populateSeriesList = function(files) {
    const seriesList = document.getElementById('series-list');
    seriesList.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'padding: 8px 0; min-height: 100%;';

    const groupedFiles = {};
    files.forEach((file, index) => {
        const patientKey = file.patient_name || file.patientFolder || 'Unknown Patient';
        if (!groupedFiles[patientKey]) {
            groupedFiles[patientKey] = [];
        }
        groupedFiles[patientKey].push({...file, originalIndex: index});
    });

    Object.keys(groupedFiles).forEach(patientKey => {
        if (Object.keys(groupedFiles).length > 1) {
            const patientHeader = document.createElement('div');
            patientHeader.className = 'patient-header bg-primary bg-opacity-10 text-primary p-2 rounded mb-2';
            patientHeader.innerHTML = `<strong><i class="bi bi-person-fill me-2"></i>${patientKey}</strong>`;
            wrapper.appendChild(patientHeader);
        }

        groupedFiles[patientKey].forEach(file => {
            const itemElement = document.createElement('div');
            itemElement.className = 'series-item d-flex align-items-center p-2 rounded border mb-1';
            itemElement.dataset.fileId = file.id;
            itemElement.style.cssText = 'flex-shrink: 0; min-height: 60px;';

            const folderInfo = file.studyFolder || file.seriesFolder ? 
                `<div class="small text-info"><i class="bi bi-folder2 me-1"></i>${file.studyFolder || 'Study'}/${file.seriesFolder || 'Series'}</div>` : '';

            const mprBadge = files.length > 1 && window.DICOM_VIEWER.STATE.mprEnabled ? '<span class="mpr-badge">MPR</span>' : '';
            
            // --- STAR FEATURE UI ---
            const isStarred = file.is_starred == 1; // Check if the file is starred
            const starClass = isStarred ? 'bi-star-fill text-warning' : 'bi-star';
            const starIconHTML = `<i class="bi ${starClass} series-star-icon" onclick="window.DICOM_VIEWER.toggleStarStatus(event, '${file.id}')"></i>`;

            itemElement.innerHTML = `
                <div style="flex-shrink: 0; margin-right: 8px; position: relative;">
                    <div class="bg-secondary rounded d-flex align-items-center justify-content-center text-muted series-thumbnail">
                        <i class="bi bi-file-medical fs-6"></i>
                    </div>
                    ${mprBadge}
                </div>
                <div style="flex: 1; min-width: 0; overflow: hidden;">
                    <div class="fw-medium text-light text-truncate">
                        ${file.series_description || file.study_description || 'DICOM Series'}
                    </div>
                    <div class="text-muted small text-truncate">${file.file_name}</div>
                    ${folderInfo}
                    <div class="text-muted small text-truncate">Patient: ${file.patient_name || 'Unknown'}</div>
                </div>
                <div class="ms-2 d-flex align-items-center">
                    ${starIconHTML}
                </div>
            `;

            itemElement.addEventListener('click', () => {
                window.DICOM_VIEWER.selectSeriesItem(itemElement, file.originalIndex);
            });

            wrapper.appendChild(itemElement);
        });
    });

    const spacer = document.createElement('div');
    spacer.style.height = '20px';
    wrapper.appendChild(spacer);

    seriesList.appendChild(wrapper);
    seriesList.scrollTop = 0;

    console.log(`Populated series list with ${files.length} items grouped by patient`);
};


// Add this new function to main.js
window.DICOM_VIEWER.toggleStarStatus = async function(event, fileId) {
    event.stopPropagation(); // Prevents the series item click event from firing
    const starIcon = event.target;
    const isCurrentlyStarred = starIcon.classList.contains('bi-star-fill');
    const newStarredStatus = !isCurrentlyStarred;

    // --- Optimistic UI Update ---
    // Immediately change the icon for a responsive feel.
    starIcon.classList.toggle('bi-star', isCurrentlyStarred);
    starIcon.classList.toggle('bi-star-fill', !isCurrentlyStarred);
    starIcon.classList.toggle('text-warning', !isCurrentlyStarred);

    try {
        const response = await fetch('toggle_star.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: fileId,
                is_starred: newStarredStatus ? 1 : 0
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Failed to update star status on the server.');
        }
        
        // --- Update the local state ---
        // Find the image in the global state and update its is_starred property
        const imageInState = window.DICOM_VIEWER.STATE.currentSeriesImages.find(img => img.id === fileId);
        if (imageInState) {
            imageInState.is_starred = newStarredStatus;
        }

        console.log(`Successfully updated star status for ${fileId} to ${newStarredStatus}`);

    } catch (error) {
        console.error('Error toggling star status:', error);
        
        // --- Revert UI on Failure ---
        // If the server update fails, change the icon back to its original state.
        starIcon.classList.toggle('bi-star', !isCurrentlyStarred);
        starIcon.classList.toggle('bi-star-fill', isCurrentlyStarred);
        starIcon.classList.toggle('text-warning', isCurrentlyStarred);
        
        window.DICOM_VIEWER.showAISuggestion('Could not save star status. Check connection.');
    }
};

// FIXED: selectSeriesItem with proper viewport management
window.DICOM_VIEWER.selectSeriesItem = function(element, index) {
    // Remove selection from all series items
    document.querySelectorAll('.series-item').forEach(el => {
        el.classList.remove('selected');
    });

    // Add selection to clicked item
    element.classList.add('selected');

    const state = window.DICOM_VIEWER.STATE;
    state.currentImageIndex = index;
    state.currentFileId = state.currentSeriesImages[state.currentImageIndex].id;
    
    // Ensure we have an active viewport before loading
    if (!state.activeViewport && window.DICOM_VIEWER.MANAGERS.viewportManager) {
        // Try to get original viewport first, then any available viewport
        const originalViewport = window.DICOM_VIEWER.MANAGERS.viewportManager.getViewport('original');
        const firstViewport = window.DICOM_VIEWER.MANAGERS.viewportManager.getAllViewports()[0];
        
        if (originalViewport) {
            window.DICOM_VIEWER.MANAGERS.viewportManager.setActiveViewport(originalViewport);
        } else if (firstViewport) {
            window.DICOM_VIEWER.MANAGERS.viewportManager.setActiveViewport(firstViewport);
        }
    }

    // Update UI controls
    window.DICOM_VIEWER.updateImageCounter();
    window.DICOM_VIEWER.updateImageSlider();
    
    // Load the selected image
    window.DICOM_VIEWER.loadCurrentImage();

    // Update MPR views if they exist and volume is available
    if (state.mprEnabled && 
        window.DICOM_VIEWER.MANAGERS.mprManager && 
        window.DICOM_VIEWER.MANAGERS.mprManager.volumeData &&
        state.mprViewports) {
        
        // Small delay to ensure main image loads first
        setTimeout(() => {
            window.DICOM_VIEWER.updateAllMPRViews();
        }, 200);
    }

    // Scroll selected item into view
    const container = document.getElementById('series-list');
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    if (elementRect.top < containerRect.top || elementRect.bottom > containerRect.bottom) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
        });
    }
};

window.DICOM_VIEWER.updateImageSlider = function() {
    const imageSlider = document.getElementById('imageSlider');
    const state = window.DICOM_VIEWER.STATE;
    imageSlider.min = 0;
    imageSlider.max = Math.max(0, state.totalImages - 1);
    imageSlider.value = state.currentImageIndex;
};

window.DICOM_VIEWER.updateImageCounter = function() {
    const imageCounter = document.getElementById('imageCounter');
    const state = window.DICOM_VIEWER.STATE;
    imageCounter.textContent = `${state.currentImageIndex + 1} / ${state.totalImages}`;
};

window.DICOM_VIEWER.updatePatientInfo = function(data) {
    const patientInfo = document.getElementById('patientInfo');
    const studyInfo = document.getElementById('studyInfo');
    const imageInfo = document.getElementById('imageInfo');
    const mprInfo = document.getElementById('mprInfo');

    if (patientInfo) {
        patientInfo.innerHTML = `
            <div>Name: ${data.patient_name || '-'}</div>
            <div>ID: ${data.patient_id || '-'}</div>
            <div>DOB: ${data.patient_birth_date || '-'}</div>
            <div>Sex: ${data.patient_sex || '-'}</div>
        `;
    }

    if (studyInfo) {
        studyInfo.innerHTML = `
            <div>Date: ${data.study_date || '-'}</div>
            <div>Time: ${data.study_time || '-'}</div>
            <div>Modality: ${data.modality || '-'}</div>
            <div>Body Part: ${data.body_part || '-'}</div>
        `;
    }

    if (imageInfo) {
        const windowSlider = document.getElementById('windowSlider');
        const levelSlider = document.getElementById('levelSlider');
        imageInfo.innerHTML = `
            <div>Matrix: ${data.columns || '-'}x${data.rows || '-'}</div>
            <div>Pixel Spacing: ${data.pixel_spacing || '-'}</div>
            <div>Slice Thickness: ${data.slice_thickness || '-'}</div>
            <div>Window: ${windowSlider ? windowSlider.value : '-'}</div>
            <div>Level: ${levelSlider ? levelSlider.value : '-'}</div>
        `;
    }

    if (mprInfo && window.DICOM_VIEWER.MANAGERS.mprManager.volumeData) {
        const dimensions = window.DICOM_VIEWER.MANAGERS.mprManager.dimensions;
        mprInfo.innerHTML = `
            <div>Volume: ${dimensions.width}x${dimensions.height}x${dimensions.depth}</div>
            <div>Orientation: Multi-planar</div>
            <div>Slice Position: Active</div>
        `;
    }
};

window.DICOM_VIEWER.updateViewportInfo = function() {
    const viewports = document.querySelectorAll('.viewport');
    const state = window.DICOM_VIEWER.STATE;

    viewports.forEach((viewport, index) => {
        try {
            const enabledElement = cornerstone.getEnabledElement(viewport);
            if (enabledElement && enabledElement.image) {
                const cornerstoneViewport = cornerstone.getViewport(viewport);
                const info = viewport.querySelector('.viewport-info');

                if (info && cornerstoneViewport) {
                    const zoomText = `Zoom: ${(cornerstoneViewport.scale * 100).toFixed(0)}%`;
                    const windowText = `W: ${Math.round(cornerstoneViewport.voi.windowWidth)} L: ${Math.round(cornerstoneViewport.voi.windowCenter)}`;
                    const frameText = state.totalImages > 1 ? `Frame: ${state.currentImageIndex + 1}/${state.totalImages}` : '';

                    info.innerHTML = `
                        <div>${windowText}</div>
                        <div>${zoomText}</div>
                        ${frameText ? `<div>${frameText}</div>` : ''}
                    `;
                }
            }
        } catch (error) {
            // This can throw an error if the viewport is not yet displaying an image.
        }
    });
};

// ===== VIEWPORT AND TOOL FUNCTIONS =====

window.DICOM_VIEWER.setupViewports = function() {
    return window.DICOM_VIEWER.MANAGERS.viewportManager.createViewports(window.DICOM_VIEWER.MANAGERS.viewportManager.currentLayout);
};

window.DICOM_VIEWER.setViewportLayout = function(layout) {
    return window.DICOM_VIEWER.MANAGERS.viewportManager.switchLayout(layout);
};

window.DICOM_VIEWER.setActiveTool = function(toolName, clickedButton) {
    const toolNameMap = window.DICOM_VIEWER.CONSTANTS.TOOL_NAME_MAP;
    const toolsPanel = document.getElementById('tools-panel');
    
    try {
        Object.values(toolNameMap).forEach(tool => {
            try {
                cornerstoneTools.setToolDisabled(tool);
            } catch (error) { /* ignore */ }
        });

        cornerstoneTools.setToolActive(toolName, { mouseButtonMask: 1 });

        toolsPanel.querySelectorAll('button').forEach(btn => {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
        });

        if (clickedButton) {
            clickedButton.classList.remove('btn-secondary');
            clickedButton.classList.add('btn-primary');
        }

    } catch (error) {
        console.error('Error setting active tool:', error);
    }
};

// ===== EVENT HANDLERS =====

window.DICOM_VIEWER.handleToolSelection = function(event) {
    const button = event.target.closest('button');
    if (button && button.dataset.tool) {
        const cornerstoneToolName = window.DICOM_VIEWER.CONSTANTS.TOOL_NAME_MAP[button.dataset.tool];
        if (cornerstoneToolName) {
            window.DICOM_VIEWER.setActiveTool(cornerstoneToolName, button);
        }
    }
};

window.DICOM_VIEWER.handleImageSliderChange = function(event) {
    const state = window.DICOM_VIEWER.STATE;
    const newIndex = parseInt(event.target.value);
    if (newIndex !== state.currentImageIndex && newIndex >= 0 && newIndex < state.totalImages) {
        state.currentImageIndex = newIndex;
        if (state.currentSeriesImages[state.currentImageIndex]) {
            state.currentFileId = state.currentSeriesImages[state.currentImageIndex].id;
            window.DICOM_VIEWER.updateImageCounter();
            window.DICOM_VIEWER.loadCurrentImage();
            window.DICOM_VIEWER.setupImageNavigation();

            if (state.mprEnabled && window.DICOM_VIEWER.MANAGERS.mprManager.volumeData) {
                window.DICOM_VIEWER.updateAllMPRViews();
            }
        }
    }
};

window.DICOM_VIEWER.handleFPSChange = function(event) {
    const state = window.DICOM_VIEWER.STATE;
    state.currentFPS = parseInt(event.target.value);
    document.getElementById('fpsDisplay').textContent = state.currentFPS;
    if (state.isPlaying) {
        window.DICOM_VIEWER.stopCine();
        window.DICOM_VIEWER.startCine();
    }
};

// ===== IMAGE NAVIGATION =====

window.DICOM_VIEWER.navigateImage = function(direction) {
    const state = window.DICOM_VIEWER.STATE;
    const newIndex = state.currentImageIndex + direction;
    if (newIndex >= 0 && newIndex < state.totalImages) {
        state.currentImageIndex = newIndex;
        document.getElementById('imageSlider').value = state.currentImageIndex;
        state.currentFileId = state.currentSeriesImages[state.currentImageIndex].id;
        window.DICOM_VIEWER.updateImageCounter();
        window.DICOM_VIEWER.loadCurrentImage();
        window.DICOM_VIEWER.setupImageNavigation();
    }
};

window.DICOM_VIEWER.setupImageNavigation = function() {
    const state = window.DICOM_VIEWER.STATE;
    const prevBtn = document.getElementById('prevImage');
    const nextBtn = document.getElementById('nextImage');
    const imageSlider = document.getElementById('imageSlider');

    if (prevBtn && nextBtn) {
        prevBtn.disabled = state.currentImageIndex <= 0;
        nextBtn.disabled = state.currentImageIndex >= state.totalImages - 1;
    }

    if (imageSlider) {
        imageSlider.disabled = state.totalImages <= 1;
        imageSlider.style.opacity = state.totalImages > 1 ? '1' : '0.5';
    }

    const playBtn = document.getElementById('playPause');
    const stopBtn = document.getElementById('stopCine');

    if (playBtn && stopBtn) {
        playBtn.disabled = state.totalImages <= 1;
        stopBtn.disabled = state.totalImages <= 1;
    }
};

// ===== CINE FUNCTIONS (FIXED for smooth playback) =====

window.DICOM_VIEWER.toggleCinePlay = function() {
    const state = window.DICOM_VIEWER.STATE;
    
    if (state.totalImages <= 1) {
        alert('Cannot play cine: Only one frame available');
        return;
    }

    if (state.isPlaying) {
        window.DICOM_VIEWER.stopCine();
    } else {
        window.DICOM_VIEWER.startCine();
    }
};

window.DICOM_VIEWER.startCine = function() {
    const state = window.DICOM_VIEWER.STATE;
    
    if (state.totalImages <= 1) return;

    state.isPlaying = true;
    document.getElementById('playPause').innerHTML = '<i class="bi bi-pause-fill"></i>';

    state.cineInterval = setInterval(() => {
        let nextIndex = state.currentImageIndex + 1;
        if (nextIndex >= state.totalImages) {
            nextIndex = 0;
        }

        state.currentImageIndex = nextIndex;
        document.getElementById('imageSlider').value = state.currentImageIndex;
        state.currentFileId = state.currentSeriesImages[state.currentImageIndex].id;
        
        // Update counter but skip loading indicators for smooth playback
        window.DICOM_VIEWER.updateImageCounter();
        window.DICOM_VIEWER.loadCurrentImage(true); // Skip loading indicator during cine
    }, 1000 / state.currentFPS);
};

window.DICOM_VIEWER.stopCine = function() {
    const state = window.DICOM_VIEWER.STATE;
    
    state.isPlaying = false;
    document.getElementById('playPause').innerHTML = '<i class="bi bi-play-fill"></i>';

    if (state.cineInterval) {
        clearInterval(state.cineInterval);
        state.cineInterval = null;
    }
};

// ===== WINDOW/LEVEL FUNCTIONS =====

window.DICOM_VIEWER.applyWindowLevelPreset = function(presetName) {
    const preset = window.DICOM_VIEWER.CONSTANTS.WINDOW_LEVEL_PRESETS[presetName];
    const event = window.event;
    if (preset && event.target) {
        const windowSlider = document.getElementById('windowSlider');
        const levelSlider = document.getElementById('levelSlider');
        const windowValue = document.getElementById('windowValue');
        const levelValue = document.getElementById('levelValue');

        windowSlider.value = preset.window;
        levelSlider.value = preset.level;
        windowValue.textContent = preset.window;
        levelValue.textContent = preset.level;
        window.DICOM_VIEWER.applyWindowLevel(preset.window, preset.level);

        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-outline-secondary');
        });
        event.target.classList.remove('btn-outline-secondary');
        event.target.classList.add('btn-primary');
    }
};

window.DICOM_VIEWER.applyWindowLevel = function(windowWidth, windowLevel) {
    const elements = document.querySelectorAll('.viewport');

    elements.forEach(element => {
        try {
            const enabledElement = cornerstone.getEnabledElement(element);
            if (enabledElement && enabledElement.image) {
                const viewport = cornerstone.getViewport(element);
                viewport.voi.windowWidth = windowWidth;
                viewport.voi.windowCenter = windowLevel;
                cornerstone.setViewport(element, viewport);
            }
        } catch (error) {
            console.warn('Error applying window/level:', error);
        }
    });

    window.DICOM_VIEWER.updateViewportInfo();
};

// ===== IMAGE MANIPULATION FUNCTIONS (FIXED TYPO) =====

window.DICOM_VIEWER.resetActiveViewport = function() {
    const state = window.DICOM_VIEWER.STATE;
    const targetViewport = state.activeViewport || (window.DICOM_VIEWER.MANAGERS.viewportManager ? window.DICOM_VIEWER.MANAGERS.viewportManager.getAllViewports()[0] : null);

    if (!targetViewport) {
        console.error('No active viewport to reset');
        return;
    }

    try {
        cornerstone.reset(targetViewport);

        if (window.DICOM_VIEWER.MANAGERS.enhancementManager) {
            window.DICOM_VIEWER.MANAGERS.enhancementManager.resetEnhancement(targetViewport);
        }

        // Reset UI controls
        const brightnessSlider = document.getElementById('brightnessSlider');
        const contrastSlider = document.getElementById('contrastSlider');
        const sharpenSlider = document.getElementById('sharpenSlider');

        if (brightnessSlider) brightnessSlider.value = 0;
        if (contrastSlider) contrastSlider.value = 1;
        if (sharpenSlider) sharpenSlider.value = 0;

        window.DICOM_VIEWER.updateViewportInfo();
        window.DICOM_VIEWER.showAISuggestion('Viewport reset to original DICOM state');

    } catch (error) {
        console.error('Error resetting viewport:', error);
    }
};

window.DICOM_VIEWER.invertImage = function() {
    const activeViewport = window.DICOM_VIEWER.STATE.activeViewport;
    if (!activeViewport) return;
    try {
        const viewport = cornerstone.getViewport(activeViewport);
        viewport.invert = !viewport.invert;
        cornerstone.setViewport(activeViewport, viewport);
    } catch (error) {
        console.error('Error inverting image:', error);
    }
};

window.DICOM_VIEWER.flipImage = function(direction) {
    const activeViewport = window.DICOM_VIEWER.STATE.activeViewport;
    if (!activeViewport) return;
    try {
        const viewport = cornerstone.getViewport(activeViewport);
        if (direction === 'horizontal') {
            viewport.hflip = !viewport.hflip;
        } else {
            viewport.vflip = !viewport.vflip;
        }
        cornerstone.setViewport(activeViewport, viewport);
    } catch (error) {
        console.error('Error flipping image:', error);
    }
};

window.DICOM_VIEWER.rotateImage = function(angle) {
    const activeViewport = window.DICOM_VIEWER.STATE.activeViewport;
    if (!activeViewport) return;
    try {
        const viewport = cornerstone.getViewport(activeViewport);
        viewport.rotation += angle;
        cornerstone.setViewport(activeViewport, viewport);
    } catch (error) {
        console.error('Error rotating image:', error);
    }
};

// ===== DISPLAY OPTIONS =====

window.DICOM_VIEWER.toggleOverlay = function(event) {
    const show = event.target.checked;
    document.querySelectorAll('.viewport-overlay').forEach(overlay => {
        overlay.style.display = show ? 'block' : 'none';
    });
};

window.DICOM_VIEWER.toggleMeasurements = function(event) {
    const show = event.target.checked;
    document.querySelectorAll('.viewport').forEach(element => {
        try {
            cornerstone.updateImage(element);
        } catch (error) { /* ignore */ }
    });
};

window.DICOM_VIEWER.toggleReferenceLines = function() {
    const show = document.getElementById('showReferenceLines').checked;
    console.log(`Reference lines toggled: ${show}. (Implementation needed)`);
};

// Replace the changeInterpolation function in main.js
window.DICOM_VIEWER.changeInterpolation = function(event) {
    const interpolationMode = parseInt(event.target.value);
    let pixelReplication = false;
    let imageRendering = 'auto';
    
    console.log(`Changing interpolation to mode: ${interpolationMode}`);
    
    // Set interpolation settings based on selection
    switch(interpolationMode) {
        case 0: // Nearest Neighbor
            pixelReplication = true;
            imageRendering = 'pixelated';
            console.log('Applied: Nearest Neighbor (Pixelated)');
            break;
        case 1: // Linear (default)
            pixelReplication = false;
            imageRendering = 'auto';
            console.log('Applied: Linear Interpolation');
            break;
        case 2: // Cubic (smooth)
            pixelReplication = false;
            imageRendering = 'smooth';
            console.log('Applied: Cubic Interpolation (Smooth)');
            break;
        default:
            pixelReplication = false;
            imageRendering = 'auto';
    }
    
    // Apply to all current viewports
    const viewports = document.querySelectorAll('.viewport');
    let appliedCount = 0;
    
    viewports.forEach(element => {
        try {
            const enabledElement = cornerstone.getEnabledElement(element);
            if (enabledElement && enabledElement.image) {
                // Apply Cornerstone viewport settings
                const viewport = cornerstone.getViewport(element);
                viewport.pixelReplication = pixelReplication;
                cornerstone.setViewport(element, viewport);
                
                // Apply CSS rendering hints
                const canvas = element.querySelector('canvas');
                if (canvas) {
                    canvas.style.imageRendering = imageRendering;
                    
                    // Additional CSS for better interpolation control
                    if (interpolationMode === 0) {
                        canvas.style.imageRendering = 'pixelated';
                        canvas.style.msInterpolationMode = 'nearest-neighbor'; // IE support
                    } else if (interpolationMode === 2) {
                        canvas.style.imageRendering = 'smooth';
                        canvas.style.imageRendering = '-webkit-optimize-contrast';
                    } else {
                        canvas.style.imageRendering = 'auto';
                    }
                }
                
                // Force image update
                cornerstone.updateImage(element);
                appliedCount++;
            }
        } catch (error) {
            console.warn('Error applying interpolation to viewport:', error);
        }
    });
    
    const modeNames = ['Nearest Neighbor', 'Linear', 'Cubic'];
    const modeName = modeNames[interpolationMode] || 'Linear';
    
    if (appliedCount > 0) {
        window.DICOM_VIEWER.showAISuggestion(`Interpolation changed to ${modeName} (applied to ${appliedCount} viewport${appliedCount > 1 ? 's' : ''})`);
    } else {
        window.DICOM_VIEWER.showAISuggestion(`Interpolation set to ${modeName} (will apply to images when loaded)`);
    }
};


// Add this new function to main.js for MPR Quality control
window.DICOM_VIEWER.changeMPRQuality = function(event) {
    const quality = event.target.value;
    console.log(`Changing MPR Quality to: ${quality}`);
    
    // Store quality setting in state
    if (!window.DICOM_VIEWER.STATE.mprSettings) {
        window.DICOM_VIEWER.STATE.mprSettings = {};
    }
    window.DICOM_VIEWER.STATE.mprSettings.quality = quality;
    
    // Update MPR Manager settings if available
    if (window.DICOM_VIEWER.MANAGERS.mprManager) {
        const mprManager = window.DICOM_VIEWER.MANAGERS.mprManager;
        
        // Apply quality-specific settings
        switch(quality) {
            case 'low':
                mprManager.interpolationMethod = 'nearest';
                mprManager.processingThreads = 1;
                mprManager.cacheSize = 50;
                break;
            case 'medium':
                mprManager.interpolationMethod = 'trilinear';
                mprManager.processingThreads = 2;
                mprManager.cacheSize = 100;
                break;
            case 'high':
                mprManager.interpolationMethod = 'cubic';
                mprManager.processingThreads = 4;
                mprManager.cacheSize = 200;
                break;
        }
        
        console.log(`MPR Manager updated: interpolation=${mprManager.interpolationMethod}`);
    }
    
    // If MPR views are currently displayed, regenerate them with new quality
    if (window.DICOM_VIEWER.STATE.mprViewports && 
        window.DICOM_VIEWER.MANAGERS.mprManager && 
        window.DICOM_VIEWER.MANAGERS.mprManager.volumeData) {
        
        const activeOrientations = ['axial', 'sagittal', 'coronal'].filter(orientation => {
            const viewport = window.DICOM_VIEWER.STATE.mprViewports[orientation];
            if (!viewport) return false;
            
            try {
                const enabledElement = cornerstone.getEnabledElement(viewport);
                return enabledElement && enabledElement.image;
            } catch (error) {
                return false;
            }
        });
        
        if (activeOrientations.length > 0) {
            // Show loading indicator
            window.DICOM_VIEWER.showLoadingIndicator(`Updating MPR quality to ${quality}...`);
            
            // Regenerate active MPR views with new quality
            setTimeout(async () => {
                try {
                    for (const orientation of activeOrientations) {
                        const position = window.DICOM_VIEWER.STATE.currentSlicePositions[orientation] || 0.5;
                        window.DICOM_VIEWER.updateMPRSlice(orientation, position);
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    
                    window.DICOM_VIEWER.hideLoadingIndicator();
                    
                    const qualityLabels = {
                        'low': 'Low (Fast)',
                        'medium': 'Medium', 
                        'high': 'High (Slow)'
                    };
                    
                    window.DICOM_VIEWER.showAISuggestion(
                        `MPR quality updated to ${qualityLabels[quality]}. ${activeOrientations.length} view${activeOrientations.length > 1 ? 's' : ''} regenerated.`
                    );
                    
                } catch (error) {
                    window.DICOM_VIEWER.hideLoadingIndicator();
                    console.error('Error updating MPR quality:', error);
                    window.DICOM_VIEWER.showAISuggestion(`Error updating MPR quality: ${error.message}`);
                }
            }, 200);
        } else {
            const qualityLabels = {
                'low': 'Low (Fast)',
                'medium': 'Medium', 
                'high': 'High (Slow)'
            };
            window.DICOM_VIEWER.showAISuggestion(`MPR quality set to ${qualityLabels[quality]} (will apply to future MPR views)`);
        }
    } else {
        const qualityLabels = {
            'low': 'Low (Fast)',
            'medium': 'Medium', 
            'high': 'High (Slow)'
        };
        window.DICOM_VIEWER.showAISuggestion(`MPR quality set to ${qualityLabels[quality]} (will apply when MPR volume is built)`);
    }
};

window.DICOM_VIEWER.clearAllMeasurements = function() {
    const state = window.DICOM_VIEWER.STATE;
    const toolNameMap = window.DICOM_VIEWER.CONSTANTS.TOOL_NAME_MAP;
    
    state.measurements = [];
    document.querySelectorAll('.viewport').forEach(element => {
        Object.values(toolNameMap).forEach(tool => {
            try {
                cornerstoneTools.clearToolState(element, tool);
            } catch (error) { /* ignore */ }
        });
        try {
            cornerstone.updateImage(element);
        } catch (e) {/* ignore */ }
    });

    document.getElementById('measurements-list').innerHTML = '<div class="text-muted">No measurements</div>';
    window.DICOM_VIEWER.showAISuggestion('All measurements cleared.');
};

window.DICOM_VIEWER.toggleFullscreen = function() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
        document.getElementById('fullscreenBtn').innerHTML = '<i class="bi bi-fullscreen-exit"></i>';
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
        document.getElementById('fullscreenBtn').innerHTML = '<i class="bi bi-arrows-fullscreen"></i>';
    }
};

// ===== MPR FUNCTIONS =====

window.DICOM_VIEWER.setupMPRViews = async function() {
    console.log('=== SETUP PROFESSIONAL MPR VIEWS ===');

    const state = window.DICOM_VIEWER.STATE;

    if (state.currentSeriesImages.length < 2) {
        console.log('SETUP MPR VIEWS: Need at least 2 images for MPR - skipping');
        window.DICOM_VIEWER.showAISuggestion(`MPR requires at least 2 images. Current series has only ${state.currentSeriesImages.length} image(s).`);
        return;
    }

    if (!state.mprEnabled) {
        console.log('SETUP MPR VIEWS: MPR is disabled - skipping');
        return;
    }

    // Ensure we have 2x2 layout first
    if (window.DICOM_VIEWER.MANAGERS.viewportManager.currentLayout !== '2x2') {
        console.log('SETUP MPR VIEWS: Switching to 2x2 layout first...');
        window.DICOM_VIEWER.MANAGERS.viewportManager.switchLayout('2x2');
        await new Promise(resolve => setTimeout(resolve, 800));
    }

    console.log('SETUP MPR VIEWS: Starting Professional MPR build process');

    try {
        const imageIds = [];

        for (let i = 0; i < state.currentSeriesImages.length; i++) {
            const img = state.currentSeriesImages[i];
            console.log(`Processing image ${i + 1}/${state.currentSeriesImages.length}: ${img.id}`);

            try {
                const response = await fetch(`get_dicom_fast.php?id=${img.id}&format=base64`);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (data.success && data.file_data) {
                    const imageId = 'wadouri:data:application/dicom;base64,' + data.file_data;
                    imageIds.push(imageId);
                } else {
                    throw new Error('Invalid response data');
                }

                if ((i + 1) % 10 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }

            } catch (error) {
                console.error(`Failed to prepare image ${i + 1}:`, error.message);
                continue;
            }
        }

        if (imageIds.length === 0) {
            throw new Error('No valid images found for MPR volume');
        }

        console.log(`SETUP MPR VIEWS: Building professional volume with ${imageIds.length} images`);

        // Use the professional MPR manager
        const volumeBuilt = await window.DICOM_VIEWER.MANAGERS.mprManager.buildVolume(imageIds);

        if (volumeBuilt) {
            console.log('SETUP MPR VIEWS: Professional volume build successful, setting up viewports...');

            // Setup MPR viewports
            const viewportsReady = await window.DICOM_VIEWER.setupMPRViewports();
            
            if (!viewportsReady) {
                throw new Error('Failed to setup MPR viewports');
            }

            document.getElementById('mprNavigation').style.display = 'block';

            ['mprAxial', 'mprSagittal', 'mprCoronal', 'mprAll'].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.disabled = false;
            });

            // Run diagnostics
            const diagnostics = window.DICOM_VIEWER.MANAGERS.mprManager.runDiagnostics();
            
            const volumeInfo = window.DICOM_VIEWER.MANAGERS.mprManager.getVolumeInfo();
            window.DICOM_VIEWER.showAISuggestion(`Professional MPR volume ready! ${volumeInfo.dimensions.width}×${volumeInfo.dimensions.height}×${volumeInfo.dimensions.depth} voxels with ${(diagnostics.volumeStats.fillRatio * 100).toFixed(1)}% data density`);

            console.log('=== SETUP PROFESSIONAL MPR VIEWS COMPLETED SUCCESSFULLY ===');
        } else {
            throw new Error('Professional volume build failed');
        }

    } catch (error) {
        console.error('=== SETUP PROFESSIONAL MPR VIEWS FAILED ===');
        console.error('Professional MPR setup error:', error);

        window.DICOM_VIEWER.showAISuggestion(`Professional MPR setup failed: ${error.message}`);

        document.getElementById('mprNavigation').style.display = 'none';

        ['mprAxial', 'mprSagittal', 'mprCoronal', 'mprAll'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = true;
        });
    }

    console.log('SETUP PROFESSIONAL MPR VIEWS: Process completed');
};

window.DICOM_VIEWER.setupMPRViewports = async function() {
    console.log('Setting up MPR viewports...');
    
    if (window.DICOM_VIEWER.MANAGERS.viewportManager.currentLayout !== '2x2') {
        console.log('MPR requires 2x2 layout, switching...');
        window.DICOM_VIEWER.MANAGERS.viewportManager.switchLayout('2x2');
        
        // Wait for layout switch to complete
        await new Promise(resolve => setTimeout(resolve, 800));
    }

    // Wait for viewports to be fully created and enabled
    await new Promise(resolve => setTimeout(resolve, 500));

    window.DICOM_VIEWER.STATE.mprViewports = {
        axial: window.DICOM_VIEWER.MANAGERS.viewportManager.getViewport('axial'),
        sagittal: window.DICOM_VIEWER.MANAGERS.viewportManager.getViewport('sagittal'),
        coronal: window.DICOM_VIEWER.MANAGERS.viewportManager.getViewport('coronal'),
        original: window.DICOM_VIEWER.MANAGERS.viewportManager.getViewport('original')
    };

    console.log('MPR viewports configured:', Object.keys(window.DICOM_VIEWER.STATE.mprViewports));

    // Verify and enable all viewports
    let allEnabled = true;
    for (const [name, viewport] of Object.entries(window.DICOM_VIEWER.STATE.mprViewports)) {
        if (!viewport) {
            console.error(`Missing MPR viewport: ${name}`);
            allEnabled = false;
            continue;
        }
        
        try {
            cornerstone.getEnabledElement(viewport);
            console.log(`✓ Viewport ${name} is already enabled`);
        } catch (error) {
            try {
                cornerstone.enable(viewport);
                console.log(`✓ Enabled viewport ${name}`);
                await new Promise(resolve => setTimeout(resolve, 100)); // Small delay after enabling
            } catch (enableError) {
                console.error(`✗ Failed to enable viewport ${name}:`, enableError);
                allEnabled = false;
            }
        }
    }

    if (!allEnabled) {
        console.error('Not all MPR viewports are properly enabled');
        return false;
    }

    console.log('All MPR viewports are enabled and ready');
    return true;
};

window.DICOM_VIEWER.updateMPRSlice = function(orientation, position) {
    const validPosition = Math.max(0, Math.min(1, parseFloat(position)));
    window.DICOM_VIEWER.STATE.currentSlicePositions[orientation] = validPosition;

    if (!window.DICOM_VIEWER.MANAGERS.mprManager.volumeData) {
        console.warn(`Cannot update ${orientation} slice - missing volume data`);
        return;
    }

    // Get the viewport
    const viewport = window.DICOM_VIEWER.STATE.mprViewports && window.DICOM_VIEWER.STATE.mprViewports[orientation];
    if (!viewport) {
        console.warn(`Cannot update ${orientation} slice - missing viewport`);
        return;
    }

    // Verify viewport is enabled
    let isEnabled = false;
    try {
        cornerstone.getEnabledElement(viewport);
        isEnabled = true;
    } catch (error) {
        console.log(`Viewport ${orientation} is not enabled, attempting to enable...`);
        
        try {
            cornerstone.enable(viewport);
            console.log(`Successfully re-enabled viewport: ${orientation}`);
            isEnabled = true;
            
            setTimeout(() => {
                window.DICOM_VIEWER.updateMPRSlice(orientation, position);
            }, 200);
            return;
            
        } catch (enableError) {
            console.error(`Failed to re-enable viewport ${orientation}:`, enableError);
            
            viewport.innerHTML = `
                <div style="color: white; text-align: center; padding: 20px; display: flex; flex-direction: column; justify-content: center; height: 100%;">
                    <h6>MPR ${orientation.toUpperCase()} Error</h6>
                    <p class="small">Viewport not enabled</p>
                    <button onclick="window.DICOM_VIEWER.setupMPRViews()" class="btn btn-primary btn-sm">Rebuild MPR</button>
                </div>
            `;
            return;
        }
    }

    if (!isEnabled) return;

    try {
        console.log(`Updating ${orientation} slice to position ${validPosition} using Professional MPR`);

        // Use the professional MPR manager to generate the slice
        const sliceData = window.DICOM_VIEWER.MANAGERS.mprManager.generateProfessionalMPRSlice(orientation, validPosition);
        
        if (sliceData && sliceData.image) {
            // Display the professionally reconstructed image
            cornerstone.displayImage(viewport, sliceData.image);

            // Update slice indicator
            const sliceIndicator = viewport.querySelector('.slice-indicator');
            if (sliceIndicator) {
                const sliceNum = sliceData.sliceIndex + 1;
                const totalSlices = window.DICOM_VIEWER.MANAGERS.mprManager.getSliceCount();
                const quality = sliceData.qualityScore ? `${(sliceData.qualityScore * 100).toFixed(0)}%` : 'N/A';
                sliceIndicator.textContent = `${orientation.toUpperCase()} - ${sliceNum}/${totalSlices} (${Math.round(validPosition * 100)}%) Q:${quality}`;
            }

            // Force viewport update
            cornerstone.updateImage(viewport);

            console.log(`Successfully updated ${orientation} slice using Professional MPR (Quality: ${sliceData.qualityScore ? (sliceData.qualityScore * 100).toFixed(1) + '%' : 'N/A'})`);
        } else {
            console.warn(`Failed to generate professional ${orientation} slice at position ${validPosition}`);
            
            // Show error in viewport
            viewport.innerHTML = `
                <div style="color: white; text-align: center; padding: 20px; display: flex; flex-direction: column; justify-content: center; height: 100%;">
                    <h6>MPR ${orientation.toUpperCase()} Reconstruction Failed</h6>
                    <p class="small">Unable to generate slice at position ${Math.round(validPosition * 100)}%</p>
                    <button onclick="window.DICOM_VIEWER.setupMPRViews()" class="btn btn-primary btn-sm">Rebuild Volume</button>
                </div>
            `;
        }
    } catch (error) {
        console.error(`Error updating ${orientation} slice:`, error);
        
        viewport.innerHTML = `
            <div style="color: white; text-align: center; padding: 20px; display: flex; flex-direction: column; justify-content: center; height: 100%;">
                <h6>MPR ${orientation.toUpperCase()} Error</h6>
                <p class="small">${error.message}</p>
                <button onclick="window.DICOM_VIEWER.setupMPRViews()" class="btn btn-primary btn-sm">Rebuild MPR</button>
            </div>
        `;
    }
};

window.DICOM_VIEWER.updateAllMPRViews = async function() {
    if (!window.DICOM_VIEWER.MANAGERS.mprManager.volumeData) {
        console.log('No Professional MPR volume data available for view updates');
        return;
    }

    console.log('Updating all MPR views with Professional reconstruction...');
    const orientations = ['axial', 'sagittal', 'coronal'];

    for (const orientation of orientations) {
        try {
            const position = window.DICOM_VIEWER.STATE.currentSlicePositions[orientation] || 0.5;
            console.log(`Updating ${orientation} view at position ${position} with Professional MPR`);
            window.DICOM_VIEWER.updateMPRSlice(orientation, position);
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error(`Error updating ${orientation} view:`, error);
        }
    }

    console.log('All Professional MPR views updated');
};


// Replace the focusMPRView function in main.js with this fixed version
window.DICOM_VIEWER.focusMPRView = async function(orientation) {
    console.log(`=== FOCUS MPR VIEW: ${orientation.toUpperCase()} (FRESH SESSION CHECK) ===`);

    // Check if we have a fresh session (no MPR volume data)
    const mprManager = window.DICOM_VIEWER.MANAGERS.mprManager;
    if (!mprManager || !mprManager.volumeData) {
        console.log('Fresh session detected - building MPR volume first...');
        
        // Show loading with clear message
        const orientationName = orientation.charAt(0).toUpperCase() + orientation.slice(1);
        window.DICOM_VIEWER.showAISuggestion(`Building Professional MPR volume for ${orientationName} view... Please wait.`);
        
        // Build the volume first
        const volumeBuilt = await window.DICOM_VIEWER.setupMPRViews();
        if (!volumeBuilt) {
            window.DICOM_VIEWER.showAISuggestion(`Failed to build MPR volume for ${orientationName}. Please try again.`);
            return;
        }
        
        // Small delay to ensure volume is fully ready
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Ensure 2x2 layout for MPR
    if (window.DICOM_VIEWER.MANAGERS.viewportManager.currentLayout !== '2x2') {
        console.log('Switching to 2x2 layout for MPR view');
        window.DICOM_VIEWER.MANAGERS.viewportManager.switchLayout('2x2');
        
        // Wait for layout switch and then retry
        setTimeout(() => {
            window.DICOM_VIEWER.focusMPRView(orientation);
        }, 600);
        return;
    }

    // Setup MPR viewports if not already done or if they're stale
    const state = window.DICOM_VIEWER.STATE;
    if (!state.mprViewports || !state.mprViewports[orientation]) {
        console.log('Setting up fresh MPR viewports...');
        const setupSuccess = await window.DICOM_VIEWER.setupMPRViewports();
        if (!setupSuccess) {
            window.DICOM_VIEWER.showAISuggestion(`Failed to setup MPR viewports for ${orientation}. Please try again.`);
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    const targetViewport = state.mprViewports[orientation];
    if (!targetViewport) {
        console.error(`MPR viewport for ${orientation} not found after setup`);
        window.DICOM_VIEWER.showAISuggestion(`${orientation} viewport not available. Please refresh and try again.`);
        return;
    }

    // Ensure viewport is enabled
    try {
        cornerstone.getEnabledElement(targetViewport);
    } catch (error) {
        try {
            cornerstone.enable(targetViewport);
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (enableError) {
            console.error(`Failed to enable ${orientation} viewport:`, enableError);
            return;
        }
    }

    // Generate and display the MPR slice
    console.log(`Generating fresh ${orientation} MPR slice...`);
    const position = state.currentSlicePositions[orientation] || 0.5;
    
    try {
        // Update the slice immediately
        window.DICOM_VIEWER.updateMPRSlice(orientation, position);
        
        // Set as active viewport
        window.DICOM_VIEWER.MANAGERS.viewportManager.setActiveViewport(targetViewport);

        // Update UI buttons - CLEAR ALL FIRST
        document.querySelectorAll('#mprAxial, #mprSagittal, #mprCoronal, #mprAll').forEach(btn => {
            btn.classList.remove('btn-success');
            btn.classList.add('btn-outline-success');
        });

        // Set current button as active
        const targetButton = document.getElementById(`mpr${orientation.charAt(0).toUpperCase() + orientation.slice(1)}`);
        if (targetButton) {
            targetButton.classList.remove('btn-outline-success');
            targetButton.classList.add('btn-success');
        }

        // Update slider position
        const slider = document.getElementById(`${orientation}Slider`);
        if (slider) {
            slider.value = position * 100;
        }

        window.DICOM_VIEWER.showAISuggestion(`${orientation.charAt(0).toUpperCase() + orientation.slice(1)} MPR view activated successfully. Use mouse wheel to navigate slices.`);
        console.log(`=== ${orientation.toUpperCase()} MPR VIEW FOCUSED SUCCESSFULLY ===`);

    } catch (error) {
        console.error(`Error focusing ${orientation} MPR view:`, error);
        window.DICOM_VIEWER.showAISuggestion(`Error loading ${orientation} view: ${error.message}`);
    }
};

// FIXED: showAllMPRViews with immediate display
window.DICOM_VIEWER.showAllMPRViews = async function() {
    console.log('=== SHOW ALL MPR VIEWS ===');

    // Build volume if needed
    if (!window.DICOM_VIEWER.MANAGERS.mprManager.volumeData) {
        console.log('No Professional MPR volume, building first...');
        window.DICOM_VIEWER.showAISuggestion('Building Professional MPR volume for all views...');
        
        const volumeBuilt = await window.DICOM_VIEWER.setupMPRViews();
        if (!volumeBuilt) {
            window.DICOM_VIEWER.showAISuggestion('Failed to build Professional MPR volume. Please try again.');
            return;
        }
    }

    // Ensure 2x2 layout
    if (window.DICOM_VIEWER.MANAGERS.viewportManager.currentLayout !== '2x2') {
        window.DICOM_VIEWER.MANAGERS.viewportManager.switchLayout('2x2');
        await new Promise(resolve => setTimeout(resolve, 400));
    }

    // Setup viewports if not already done
    if (!window.DICOM_VIEWER.STATE.mprViewports || Object.keys(window.DICOM_VIEWER.STATE.mprViewports).length < 4) {
        const setupSuccess = await window.DICOM_VIEWER.setupMPRViewports();
        if (!setupSuccess) {
            window.DICOM_VIEWER.showAISuggestion('Failed to setup MPR viewports. Please try again.');
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Load original image in original viewport first
    const originalViewport = window.DICOM_VIEWER.STATE.mprViewports.original;
    if (originalViewport && window.DICOM_VIEWER.STATE.currentFileId) {
        try {
            console.log('Loading original image in original viewport...');
            await window.DICOM_VIEWER.loadImageInViewport(originalViewport, window.DICOM_VIEWER.STATE.currentFileId);
        } catch (error) {
            console.error('Failed to load original image:', error);
        }
    }

    // Generate all MPR views simultaneously
    const mprGenerationPromises = ['axial', 'sagittal', 'coronal'].map(async (orientation) => {
        const viewport = window.DICOM_VIEWER.STATE.mprViewports[orientation];
        if (!viewport) {
            console.error(`No viewport found for ${orientation}`);
            return;
        }

        try {
            // Ensure viewport is enabled
            try {
                cornerstone.getEnabledElement(viewport);
            } catch (error) {
                cornerstone.enable(viewport);
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            const position = window.DICOM_VIEWER.STATE.currentSlicePositions[orientation] || 0.5;
            console.log(`Generating ${orientation} view at position ${position}...`);
            
            // Generate and display the MPR slice
            window.DICOM_VIEWER.updateMPRSlice(orientation, position);
            
            console.log(`✓ ${orientation} view generated successfully`);
            
        } catch (error) {
            console.error(`Error generating ${orientation} view:`, error);
        }
    });

    // Wait for all MPR views to be generated
    await Promise.all(mprGenerationPromises);

    // Reset button states
    document.querySelectorAll('#mprAxial, #mprSagittal, #mprCoronal').forEach(btn => {
        btn.classList.remove('btn-success');
        btn.classList.add('btn-outline-success');
    });

    document.getElementById('mprAll').classList.remove('btn-outline-success');
    document.getElementById('mprAll').classList.add('btn-success');

    // Set original viewport as active
    if (originalViewport) {
        window.DICOM_VIEWER.MANAGERS.viewportManager.setActiveViewport(originalViewport);
    }

    // Run diagnostics and show results
    const diagnostics = window.DICOM_VIEWER.MANAGERS.mprManager.runDiagnostics();
    const qualityReport = Object.values(diagnostics.sliceTests || {})
        .map(test => test.success ? '✓' : '✗')
        .join(' ');

    window.DICOM_VIEWER.showAISuggestion(`All MPR views displayed: Original (top-left), Sagittal (top-right), Coronal (bottom-left), Axial (bottom-right). Quality: ${qualityReport}. Click any view to focus.`);
    
    console.log('=== ALL MPR VIEWS DISPLAYED ===');
};

window.DICOM_VIEWER.loadImageInViewport = async function(viewport, fileId) {
    try {
        const response = await fetch(`get_dicom_fast.php?id=${fileId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (!data.success || !data.file_data) {
            throw new Error('Invalid response data');
        }

        const imageId = 'wadouri:data:application/dicom;base64,' + data.file_data;
        const image = await cornerstone.loadImage(imageId);
        cornerstone.displayImage(viewport, image);

        console.log('Image loaded in viewport successfully');
    } catch (error) {
        console.error('Error loading image in viewport:', error);
    }
};

// ===== AI ASSISTANT FUNCTIONS =====

window.DICOM_VIEWER.autoAdjustWindowLevel = function() {
    const activeViewport = window.DICOM_VIEWER.STATE.activeViewport;
    if (!activeViewport) return;

    try {
        const enabledElement = cornerstone.getEnabledElement(activeViewport);
        if (enabledElement && enabledElement.image) {
            const image = enabledElement.image;
            const autoWindow = (image.maxPixelValue - image.minPixelValue) * 0.8;
            const autoLevel = (image.maxPixelValue + image.minPixelValue) / 2;

            const windowSlider = document.getElementById('windowSlider');
            const levelSlider = document.getElementById('levelSlider');
            const windowValue = document.getElementById('windowValue');
            const levelValue = document.getElementById('levelValue');

            windowSlider.value = Math.round(autoWindow);
            levelSlider.value = Math.round(autoLevel);
            windowValue.textContent = Math.round(autoWindow);
            levelValue.textContent = Math.round(autoLevel);

            window.DICOM_VIEWER.applyWindowLevel(autoWindow, autoLevel);
            window.DICOM_VIEWER.showAISuggestion('Window/Level automatically adjusted based on image statistics.');
        }
    } catch (error) {
        window.DICOM_VIEWER.showAISuggestion('Auto W/L adjustment failed. Please adjust manually.');
    }
};

window.DICOM_VIEWER.detectAbnormalities = function() {
    window.DICOM_VIEWER.showAISuggestion('Scanning for potential abnormalities... This feature requires advanced AI integration.');

    setTimeout(() => {
        window.DICOM_VIEWER.showAISuggestion('Demo: Potential areas of interest detected. Please consult with radiologist for confirmation.');
    }, 2000);
};

window.DICOM_VIEWER.smartMeasure = function() {
    const toolsPanel = document.getElementById('tools-panel');
    const lengthTool = toolsPanel.querySelector('[data-tool="Length"]');
    if (lengthTool) {
        lengthTool.click();
        window.DICOM_VIEWER.showAISuggestion('Length measurement tool activated. Click and drag to measure distances.');
    }
};

window.DICOM_VIEWER.enhanceImageQuality = function() {
    const brightnessSlider = document.getElementById('brightnessSlider');
    const contrastSlider = document.getElementById('contrastSlider');
    const sharpenSlider = document.getElementById('sharpenSlider');

    const brightness = parseInt(brightnessSlider.value);
    const contrast = parseFloat(contrastSlider.value);
    const sharpening = parseFloat(sharpenSlider.value);

    const viewports = window.DICOM_VIEWER.MANAGERS.viewportManager.getAllViewports();

    viewports.forEach(viewport => {
        window.DICOM_VIEWER.MANAGERS.enhancementManager.applyEnhancement(viewport, brightness, contrast, sharpening);
    });

    window.DICOM_VIEWER.updateViewportInfo();
    window.DICOM_VIEWER.showAISuggestion('Image enhancement applied. Adjust sliders for fine-tuning.');
};


// Enhanced export functions
window.DICOM_VIEWER.exportImage = function() {
    const activeViewport = window.DICOM_VIEWER.STATE.activeViewport;
    if (!activeViewport) {
        window.DICOM_VIEWER.showAISuggestion('No active viewport to export');
        return;
    }

    const canvas = activeViewport.querySelector('canvas');
    if (!canvas) {
        window.DICOM_VIEWER.showAISuggestion('No image to export');
        return;
    }

    // Get current image info for filename
    const state = window.DICOM_VIEWER.STATE;
    const currentImage = state.currentSeriesImages[state.currentImageIndex];
    const patientId = currentImage?.patient_id || 'Unknown';
    const studyDate = currentImage?.study_date || new Date().toISOString().split('T')[0];
    const viewportName = activeViewport.dataset.viewportName || 'image';

    const link = document.createElement('a');
    link.download = `${patientId}_${studyDate}_${viewportName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    window.DICOM_VIEWER.showAISuggestion(`Image exported: ${link.download}`);
};

window.DICOM_VIEWER.exportMPRViews = function() {
    if (!window.DICOM_VIEWER.STATE.mprViewports) {
        window.DICOM_VIEWER.showAISuggestion('No MPR views available for export');
        return;
    }

    const state = window.DICOM_VIEWER.STATE;
    const currentImage = state.currentSeriesImages[state.currentImageIndex];
    const patientId = currentImage?.patient_id || 'Unknown';
    const studyDate = currentImage?.study_date || new Date().toISOString().split('T')[0];

    let exportedCount = 0;

    Object.entries(state.mprViewports).forEach(([orientation, viewport]) => {
        if (viewport && orientation !== 'original') {
            const canvas = viewport.querySelector('canvas');
            if (canvas) {
                const link = document.createElement('a');
                link.download = `${patientId}_${studyDate}_MPR_${orientation.toUpperCase()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                exportedCount++;
                
                // Small delay between downloads
                setTimeout(() => {}, 100 * exportedCount);
            }
        }
    });

    if (exportedCount > 0) {
        window.DICOM_VIEWER.showAISuggestion(`Exported ${exportedCount} MPR views`);
    } else {
        window.DICOM_VIEWER.showAISuggestion('No MPR views could be exported');
    }
};

window.DICOM_VIEWER.exportReport = function() {
    if (!window.DICOM_VIEWER.MANAGERS.medicalNotes) {
        window.DICOM_VIEWER.showAISuggestion('Medical notes system not available');
        return;
    }

    window.DICOM_VIEWER.MANAGERS.medicalNotes.exportReport();
};

window.DICOM_VIEWER.exportDICOM = function() {
    const state = window.DICOM_VIEWER.STATE;
    if (!state.currentSeriesImages || state.currentSeriesImages.length === 0) {
        window.DICOM_VIEWER.showAISuggestion('No DICOM files to export');
        return;
    }

    window.DICOM_VIEWER.showLoadingIndicator('Preparing DICOM export...');

    const currentImage = state.currentSeriesImages[state.currentImageIndex];
    const patientId = currentImage?.patient_id || 'Unknown';
    const studyDate = currentImage?.study_date || new Date().toISOString().split('T')[0];

    // Export all files in current series
    const exportPromises = state.currentSeriesImages.map(async (image, index) => {
        try {
            const response = await fetch(`get_dicom_file.php?id=${image.id}&format=raw`);
            if (!response.ok) throw new Error(`Failed to fetch file ${image.id}`);
            
            const arrayBuffer = await response.arrayBuffer();
            const filename = `${image.file_name || `image_${index + 1}.dcm`}`;
            
            return {
                filename: filename.endsWith('.dcm') ? filename : filename + '.dcm',
                data: arrayBuffer
            };
        } catch (error) {
            console.error(`Failed to export image ${image.id}:`, error);
            return null;
        }
    });

    Promise.all(exportPromises).then(results => {
        const validFiles = results.filter(file => file !== null);
        
        if (validFiles.length === 0) {
            window.DICOM_VIEWER.hideLoadingIndicator();
            window.DICOM_VIEWER.showAISuggestion('No files could be exported');
            return;
        }

        // Create ZIP file using JSZip (you'll need to include this library)
        if (typeof JSZip !== 'undefined') {
            const zip = new JSZip();
            
            validFiles.forEach(file => {
                zip.file(file.filename, file.data);
            });
            
            zip.generateAsync({type: "blob"}).then(content => {
                const url = URL.createObjectURL(content);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${patientId}_${studyDate}_DICOM_Series.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                window.DICOM_VIEWER.hideLoadingIndicator();
                window.DICOM_VIEWER.showAISuggestion(`DICOM series exported: ${validFiles.length} files`);
            });
        } else {
            // Fallback: export individual files
            validFiles.forEach((file, index) => {
                setTimeout(() => {
                    const blob = new Blob([file.data], { type: 'application/dicom' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = file.filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }, index * 100);
            });
            
            window.DICOM_VIEWER.hideLoadingIndicator();
            window.DICOM_VIEWER.showAISuggestion(`${validFiles.length} DICOM files exported individually`);
        }
    }).catch(error => {
        window.DICOM_VIEWER.hideLoadingIndicator();
        console.error('DICOM export failed:', error);
        window.DICOM_VIEWER.showAISuggestion('DICOM export failed. Please try again.');
    });
};

// ===== EXPORT FUNCTIONS =====

window.DICOM_VIEWER.exportMPRViews = function() {
    const state = window.DICOM_VIEWER.STATE;
    
    if (!state.mprViewports || !window.DICOM_VIEWER.MANAGERS.mprManager.volumeData) {
        window.DICOM_VIEWER.showAISuggestion('No MPR views available for export. Please generate MPR views first.');
        return;
    }

    window.DICOM_VIEWER.showLoadingIndicator('Exporting MPR views...');

    const currentImage = state.currentSeriesImages[state.currentImageIndex];
    const patientId = currentImage?.patient_id || 'Unknown';
    const studyDate = currentImage?.study_date || new Date().toISOString().split('T')[0];

    let exportedCount = 0;
    const exportPromises = [];

    Object.entries(state.mprViewports).forEach(([orientation, viewport]) => {
        if (viewport && orientation !== 'original') {
            const canvas = viewport.querySelector('canvas');
            if (canvas) {
                const promise = new Promise((resolve) => {
                    try {
                        canvas.toBlob((blob) => {
                            if (blob) {
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `${patientId}_${studyDate}_MPR_${orientation.toUpperCase()}.png`;
                                
                                // Add small delay for better UX
                                setTimeout(() => {
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    URL.revokeObjectURL(url);
                                    resolve();
                                }, exportedCount * 200);
                                
                                exportedCount++;
                            } else {
                                resolve();
                            }
                        }, 'image/png', 0.95);
                    } catch (error) {
                        console.error(`Failed to export ${orientation}:`, error);
                        resolve();
                    }
                });
                exportPromises.push(promise);
            }
        }
    });

    if (exportPromises.length === 0) {
        window.DICOM_VIEWER.hideLoadingIndicator();
        window.DICOM_VIEWER.showAISuggestion('No MPR canvases found to export');
        return;
    }

    Promise.all(exportPromises).then(() => {
        window.DICOM_VIEWER.hideLoadingIndicator();
        if (exportedCount > 0) {
            window.DICOM_VIEWER.showAISuggestion(`Exported ${exportedCount} MPR views successfully`);
        } else {
            window.DICOM_VIEWER.showAISuggestion('No MPR views could be exported');
        }
    });
};

window.DICOM_VIEWER.toggleCrosshairs = function() {
    const showCrosshairsCheckbox = document.getElementById('showCrosshairs');
    const showCrosshairs = showCrosshairsCheckbox.checked;

    if (showCrosshairs) {
        window.DICOM_VIEWER.MANAGERS.crosshairManager.enable();
    } else {
        window.DICOM_VIEWER.MANAGERS.crosshairManager.disable();
    }

    window.DICOM_VIEWER.showAISuggestion(showCrosshairs ? 'Crosshairs enabled - hover over images to see them' : 'Crosshairs disabled');
};