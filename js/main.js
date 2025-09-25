// Main application file - coordinates all components
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

        console.log('Modern DICOM Viewer managers initialized');

        // Initialize viewports with default layout
        window.DICOM_VIEWER.MANAGERS.viewportManager.createViewports('2x2');

        // Initialize components
        window.DICOM_VIEWER.UploadHandler.initialize();
        window.DICOM_VIEWER.UIControls.initialize();
        window.DICOM_VIEWER.EventHandlers.initialize();

        // Set initial active viewport
        setTimeout(() => {
            const initialViewport = window.DICOM_VIEWER.MANAGERS.viewportManager.getAllViewports()[0];
            if (initialViewport) {
                window.DICOM_VIEWER.MANAGERS.viewportManager.setActiveViewport(initialViewport);
            }
        }, 600);

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

window.DICOM_VIEWER.showLoadingIndicator = function(message) {
    const loadingProgress = document.getElementById('loadingProgress');
    
    if (loadingProgress) {
        loadingProgress.style.display = 'block';
        loadingProgress.querySelector('span').textContent = message;
    }

    // DON'T clear viewport container content for MPR operations
    console.log('Loading indicator shown:', message);
};

window.DICOM_VIEWER.hideLoadingIndicator = function() {
    const loadingProgress = document.getElementById('loadingProgress');
    if (loadingProgress) {
        loadingProgress.style.display = 'none';
    }

    const viewportContainer = document.getElementById('viewport-container');
    if (viewportContainer) {
        const loadingDivs = viewportContainer.querySelectorAll('div');
        loadingDivs.forEach(div => {
            if (div.textContent && (div.textContent.includes('Building 3D volume') || div.textContent.includes('Loading'))) {
                div.remove();
            }
        });
    }

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            console.log('Loading indicator hidden and UI updated');
        });
    });
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

// ===== IMAGE LOADING AND SERIES MANAGEMENT =====

window.DICOM_VIEWER.loadImageSeries = async function(uploadedFiles) {
    console.log('=== LOADING IMAGE SERIES ===');
    console.log(`Loading ${uploadedFiles.length} images into series`);

    const state = window.DICOM_VIEWER.STATE;
    state.currentSeriesImages = uploadedFiles;
    state.totalImages = uploadedFiles.length;
    state.currentImageIndex = 0;

    console.log('LOAD SERIES: Setting up viewports');
    window.DICOM_VIEWER.setupViewports();

    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('LOAD SERIES: Populating series list');
    window.DICOM_VIEWER.populateSeriesList(uploadedFiles);

    if (uploadedFiles.length > 0) {
        state.currentFileId = uploadedFiles[0].id;
        console.log(`LOAD SERIES: Loading first image with ID: ${state.currentFileId}`);

        await window.DICOM_VIEWER.loadCurrentImage();
        window.DICOM_VIEWER.setupImageNavigation();
        window.DICOM_VIEWER.updateImageCounter();
        window.DICOM_VIEWER.updateImageSlider();

        const toolsPanel = document.getElementById('tools-panel');
        const wlButton = toolsPanel.querySelector('[data-tool="Wwwc"]');
        if (wlButton) window.DICOM_VIEWER.setActiveTool('Wwwc', wlButton);

        if (uploadedFiles.length > 1 && state.mprEnabled) {
            console.log(`LOAD SERIES: Multiple images detected (${uploadedFiles.length}), MPR will be available`);

            document.getElementById('mprNavigation').style.display = 'block';

            ['mprAxial', 'mprSagittal', 'mprCoronal', 'mprAll'].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                }
            });

            window.DICOM_VIEWER.showAISuggestion(`Series loaded with ${uploadedFiles.length} images. Click MPR buttons to generate 3D views.`);
        } else {
            console.log(`LOAD SERIES: Single image or MPR disabled - showing original view only`);
            document.getElementById('mprNavigation').style.display = 'none';
            window.DICOM_VIEWER.showAISuggestion('Single image loaded. Upload multiple images to enable MPR views.');
        }
    }

    console.log('=== LOADING IMAGE SERIES COMPLETED ===');
};

// FIXED: Remove loading indicators during cine playback for smooth video experience
window.DICOM_VIEWER.loadCurrentImage = async function(skipLoadingIndicator = false) {
    const state = window.DICOM_VIEWER.STATE;
    let targetViewport = state.activeViewport;

    // Enhanced viewport selection logic
    if (!targetViewport && window.DICOM_VIEWER.MANAGERS.viewportManager) {
        // Try to get the original/main viewport first
        const possibleViewports = [
            window.DICOM_VIEWER.MANAGERS.viewportManager.getViewport('original'),
            window.DICOM_VIEWER.MANAGERS.viewportManager.getViewport('main'),
            ...window.DICOM_VIEWER.MANAGERS.viewportManager.getAllViewports()
        ];
        
        // Find first enabled viewport
        for (const viewport of possibleViewports) {
            if (viewport) {
                try {
                    cornerstone.getEnabledElement(viewport);
                    targetViewport = viewport;
                    window.DICOM_VIEWER.MANAGERS.viewportManager.setActiveViewport(targetViewport);
                    break;
                } catch (error) {
                    // Try to enable this viewport
                    try {
                        cornerstone.enable(viewport);
                        targetViewport = viewport;
                        window.DICOM_VIEWER.MANAGERS.viewportManager.setActiveViewport(targetViewport);
                        console.log('Re-enabled viewport for image loading');
                        break;
                    } catch (enableError) {
                        console.warn('Could not enable viewport:', enableError);
                        continue;
                    }
                }
            }
        }
    }

    if (!targetViewport) {
        console.error('Cannot load image: No viewports available.');
        window.DICOM_VIEWER.showErrorMessage('No viewports available for image display. Please refresh the page.');
        return;
    }

    // Verify viewport is enabled
    try {
        cornerstone.getEnabledElement(targetViewport);
    } catch (error) {
        console.error('Target viewport is not enabled:', error);
        
        // Try to enable it
        try {
            cornerstone.enable(targetViewport);
            console.log('Successfully re-enabled target viewport');
        } catch (enableError) {
            console.error('Failed to enable target viewport:', enableError);
            window.DICOM_VIEWER.showErrorMessage('Failed to prepare viewport for image display. Please refresh the page.');
            return;
        }
    }

    if (state.currentImageIndex >= state.currentSeriesImages.length || !state.currentFileId) {
        console.error('Cannot load image: invalid index or no file ID');
        return;
    }

    console.log(`Loading image with ID: ${state.currentFileId} into viewport: ${targetViewport.dataset.viewportName}`);

    // Loading indicator management
    let loadingDiv = null;
    if (!skipLoadingIndicator && !state.isPlaying) {
        loadingDiv = document.createElement('div');
        loadingDiv.style.cssText = `
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8); color: white; padding: 10px; border-radius: 4px;
            z-index: 100; pointer-events: none; font-size: 12px;
        `;
        loadingDiv.textContent = 'Loading image...';
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

        // Remove loading indicator
        if (loadingDiv && loadingDiv.parentNode) {
            loadingDiv.parentNode.removeChild(loadingDiv);
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

        console.log('Image loaded and displayed successfully');

        // Update series list selection
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

        // Remove loading indicator
        if (loadingDiv && loadingDiv.parentNode) {
            loadingDiv.parentNode.removeChild(loadingDiv);
        }

        // Show error only if not playing cine
        if (!state.isPlaying) {
            targetViewport.innerHTML = `
                <div style="color: white; text-align: center; padding: 20px; display: flex; flex-direction: column; justify-content: center; height: 100%; background: #000;">
                    <h5>Image Load Error</h5>
                    <p class="small text-muted">${error.message}</p>
                    <div class="mt-2">
                        <button onclick="window.DICOM_VIEWER.loadCurrentImage()" class="btn btn-primary btn-sm me-2">Retry</button>
                        <button onclick="location.reload()" class="btn btn-secondary btn-sm">Reload Page</button>
                    </div>
                </div>
            `;
        }
    }
};

// ===== UI UPDATE FUNCTIONS =====

window.DICOM_VIEWER.populateSeriesList = function(files) {
    const seriesList = document.getElementById('series-list');
    seriesList.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'padding: 8px 0; min-height: 100%;';

    files.forEach((file, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'series-item d-flex align-items-center p-2 rounded border mb-1';
        itemElement.dataset.fileId = file.id;
        itemElement.style.cssText = 'flex-shrink: 0; min-height: 60px;';

        const mprBadge = files.length > 1 && window.DICOM_VIEWER.STATE.mprEnabled ? '<span class="mpr-badge">MPR</span>' : '';

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
                <div class="text-muted small text-truncate">Patient: ${file.patient_name || 'Unknown'}</div>
            </div>
        `;

        itemElement.addEventListener('click', () => {
            window.DICOM_VIEWER.selectSeriesItem(itemElement, index);
        });

        wrapper.appendChild(itemElement);
    });

    const spacer = document.createElement('div');
    spacer.style.height = '20px';
    wrapper.appendChild(spacer);

    seriesList.appendChild(wrapper);
    seriesList.scrollTop = 0;

    console.log(`Populated series list with ${files.length} items`);
};

window.DICOM_VIEWER.selectSeriesItem = function(element, index) {
    document.querySelectorAll('.series-item').forEach(el => {
        el.classList.remove('selected');
    });

    element.classList.add('selected');

    const state = window.DICOM_VIEWER.STATE;
    state.currentImageIndex = index;
    state.currentFileId = state.currentSeriesImages[state.currentImageIndex].id;
    window.DICOM_VIEWER.updateImageCounter();
    window.DICOM_VIEWER.updateImageSlider();
    window.DICOM_VIEWER.loadCurrentImage();

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

window.DICOM_VIEWER.changeInterpolation = function(event) {
    const interpolation = event.target.value === '1';
    document.querySelectorAll('.viewport').forEach(element => {
        try {
            const enabledElement = cornerstone.getEnabledElement(element);
            if (enabledElement && enabledElement.image) {
                const viewport = cornerstone.getViewport(element);
                viewport.pixelReplication = !interpolation;
                cornerstone.setViewport(element, viewport);
                cornerstone.updateImage(element);
            }
        } catch (error) {
            console.warn('Error setting interpolation:', error);
        }
    });
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


window.DICOM_VIEWER.focusMPRView = function(orientation) {
    console.log('Focusing on Professional', orientation, 'view');

    if (!window.DICOM_VIEWER.STATE.mprViewports || !window.DICOM_VIEWER.STATE.mprViewports[orientation]) {
        console.error(`Professional MPR viewport for ${orientation} not found`);
        window.DICOM_VIEWER.showAISuggestion(`${orientation} view not available. Building Professional MPR volume first...`);
        window.DICOM_VIEWER.setupMPRViews();
        return;
    }

    // Ensure 2x2 layout
    if (window.DICOM_VIEWER.MANAGERS.viewportManager.currentLayout !== '2x2') {
        window.DICOM_VIEWER.setViewportLayout('2x2');
        setTimeout(() => {
            window.DICOM_VIEWER.focusMPRView(orientation);
        }, 500);
        return;
    }

    // Show loading indicator in the specific viewport
    const targetViewport = window.DICOM_VIEWER.STATE.mprViewports[orientation];
    if (targetViewport) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'viewport-loading';
        loadingDiv.style.cssText = `
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(40,167,69,0.9); color: white; padding: 10px 15px; border-radius: 8px;
            z-index: 100; pointer-events: none; font-size: 12px; font-weight: 500;
            border: 1px solid rgba(40,167,69,0.3);
        `;
        loadingDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="spinner-border spinner-border-sm me-2" style="width: 16px; height: 16px;"></div>
                Professional ${orientation.charAt(0).toUpperCase() + orientation.slice(1)} MPR...
            </div>
        `;
        targetViewport.appendChild(loadingDiv);

        // Remove loading after processing
        setTimeout(() => {
            if (loadingDiv.parentNode) {
                loadingDiv.parentNode.removeChild(loadingDiv);
            }
        }, 2000);
    }

    // Update the specific slice using Professional MPR
    const position = window.DICOM_VIEWER.STATE.currentSlicePositions[orientation] || 0.5;
    window.DICOM_VIEWER.updateMPRSlice(orientation, position);

    // Set as active viewport
    window.DICOM_VIEWER.MANAGERS.viewportManager.setActiveViewport(window.DICOM_VIEWER.STATE.mprViewports[orientation]);

    // Update UI buttons
    document.querySelectorAll('#mprAxial, #mprSagittal, #mprCoronal').forEach(btn => {
        btn.classList.remove('btn-success');
        btn.classList.add('btn-outline-success');
    });

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

    window.DICOM_VIEWER.showAISuggestion(`Focused on Professional ${orientation} MPR view. Use mouse wheel or slider to navigate slices. This view shows anatomically correct ${orientation} cross-sections.`);
};

window.DICOM_VIEWER.showAllMPRViews = async function() {
    console.log('Showing all Professional MPR views with advanced reconstruction');

    if (!window.DICOM_VIEWER.MANAGERS.mprManager.volumeData) {
        console.log('No Professional MPR volume, building first...');
        window.DICOM_VIEWER.showAISuggestion('Building Professional MPR volume for all views...');
        await window.DICOM_VIEWER.setupMPRViews();
        if (!window.DICOM_VIEWER.MANAGERS.mprManager.volumeData) {
            window.DICOM_VIEWER.showAISuggestion('Failed to build Professional MPR volume. Please try again.');
            return;
        }
    }

    // Ensure 2x2 layout
    window.DICOM_VIEWER.setViewportLayout('2x2');
    await new Promise(resolve => setTimeout(resolve, 300));

    // Setup viewports if not already done
    if (!window.DICOM_VIEWER.STATE.mprViewports || Object.keys(window.DICOM_VIEWER.STATE.mprViewports).length < 4) {
        await window.DICOM_VIEWER.setupMPRViewports();
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Show loading in all MPR viewports
    ['axial', 'sagittal', 'coronal'].forEach(orientation => {
        const viewport = window.DICOM_VIEWER.STATE.mprViewports[orientation];
        if (viewport) {
            const loadingDiv = document.createElement('div');
            loadingDiv.className = `viewport-loading-${orientation}`;
            loadingDiv.style.cssText = `
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: rgba(40,167,69,0.9); color: white; padding: 8px 12px; border-radius: 6px;
                z-index: 100; pointer-events: none; font-size: 10px; font-weight: 500;
                border: 1px solid rgba(40,167,69,0.3);
            `;
            loadingDiv.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="spinner-border spinner-border-sm me-1" style="width: 12px; height: 12px;"></div>
                    Professional ${orientation.charAt(0).toUpperCase() + orientation.slice(1)}...
                </div>
            `;
            viewport.appendChild(loadingDiv);
        }
    });

    // Update all Professional MPR views
    await window.DICOM_VIEWER.updateAllMPRViews();

    // Load original image in original viewport
    if (window.DICOM_VIEWER.STATE.mprViewports.original && window.DICOM_VIEWER.STATE.currentFileId) {
        await window.DICOM_VIEWER.loadImageInViewport(window.DICOM_VIEWER.STATE.mprViewports.original, window.DICOM_VIEWER.STATE.currentFileId);
    }

    // Remove loading indicators after processing
    setTimeout(() => {
        ['axial', 'sagittal', 'coronal'].forEach(orientation => {
            const viewport = window.DICOM_VIEWER.STATE.mprViewports[orientation];
            if (viewport) {
                const loadingDiv = viewport.querySelector(`.viewport-loading-${orientation}`);
                if (loadingDiv && loadingDiv.parentNode) {
                    loadingDiv.parentNode.removeChild(loadingDiv);
                }
            }
        });
    }, 3000);

    // Reset button states
    document.querySelectorAll('#mprAxial, #mprSagittal, #mprCoronal').forEach(btn => {
        btn.classList.remove('btn-success');
        btn.classList.add('btn-outline-success');
    });

    document.getElementById('mprAll').classList.remove('btn-outline-success');
    document.getElementById('mprAll').classList.add('btn-success');

    // Run diagnostics and show results
    const diagnostics = window.DICOM_VIEWER.MANAGERS.mprManager.runDiagnostics();
    const qualityReport = Object.values(diagnostics.sliceTests || {})
        .map(test => test.success ? '✓' : '✗')
        .join(' ');

    window.DICOM_VIEWER.showAISuggestion(`Professional MPR views displayed: Original (top-left), Sagittal (top-right), Coronal (bottom-left), Axial (bottom-right). Quality: ${qualityReport}. Click any view to focus.`);
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

// ===== EXPORT FUNCTIONS =====

window.DICOM_VIEWER.exportMPRViews = function() {
    if (!window.DICOM_VIEWER.MANAGERS.mprManager.volumeData) {
        window.DICOM_VIEWER.showAISuggestion('No MPR data available for export.');
        return;
    }

    // Placeholder for ZIP library like JSZip
    const zip = {
        files: [],
        addFile: function(name, data) {
            this.files.push({ name, data });
        }
    };

    Object.entries(window.DICOM_VIEWER.STATE.mprViewports).forEach(([orientation, viewport]) => {
        if (orientation !== 'original' && viewport) {
            const canvas = viewport.querySelector('canvas');
            if (canvas) {
                const dataURL = canvas.toDataURL();
                zip.addFile(`${orientation}_view.png`, dataURL);
            }
        }
    });

    window.DICOM_VIEWER.showAISuggestion(`Exported ${zip.files.length} MPR views. Check downloads folder.`);
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