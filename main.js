document.addEventListener('DOMContentLoaded', function () {
    // Check if all required libraries are loaded
    if (typeof cornerstone === 'undefined') {
        console.error('Cornerstone is not loaded');
        return;
    }
    if (typeof cornerstoneWADOImageLoader === 'undefined') {
        console.error('cornerstoneWADOImageLoader is not loaded');
        return;
    }
    if (typeof cornerstoneTools === 'undefined') {
        console.error('cornerstoneTools is not loaded');
        return;
    }

    console.log('All Cornerstone libraries loaded successfully');

    // --- Globals & Configuration ---
    let currentFileId = null;
    let uploadQueue = [];
    let uploadInProgress = false;
    const fileInput = document.getElementById('dicomFileInput');
    const seriesList = document.getElementById('series-list');
    const viewportContainer = document.getElementById('viewport-container');
    const toolsPanel = document.getElementById('tools-panel');

    // --- Initialize Cornerstone WADO Image Loader ---
    try {
        // Configure the WADO Image Loader
        const config = {
            maxWebWorkers: navigator.hardwareConcurrency || 1,
            startWebWorkersOnDemand: true,
            taskConfiguration: {
                'decodeTask': {
                    initializeCodecsOnStartup: false,
                    usePDFJS: false,
                    strict: false
                }
            }
        };

        // Initialize web workers
        cornerstoneWADOImageLoader.webWorkerManager.initialize(config);
        
        // Register the image loader
        cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
        cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
        
        console.log('WADO Image Loader configured successfully');
    } catch (error) {
        console.error('Error configuring WADO Image Loader:', error);
    }

    // --- Initialize Cornerstone Tools ---
    try {
        cornerstoneTools.external.cornerstone = cornerstone;
        cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
        cornerstoneTools.external.Hammer = Hammer;
        
        cornerstoneTools.init({
            globalToolSyncEnabled: true
        });

        console.log('Cornerstone Tools initialized successfully');
    } catch (error) {
        console.error('Error initializing Cornerstone Tools:', error);
    }

    // --- Add Tools ---
    const toolNameMap = {
        'Pan': 'Pan',
        'Zoom': 'Zoom', 
        'Wwwc': 'Wwwc',
        'Length': 'Length',
        'Angle': 'Angle',
        'Area': 'FreehandRoi',
        'Ellipse': 'EllipticalRoi',
        'Rectangle': 'RectangleRoi',
        'Annotate': 'TextMarker',
        'FreehandRoi': 'FreehandRoi',
        'EllipticalRoi': 'EllipticalRoi',
        'RectangleRoi': 'RectangleRoi',
        'Probe': 'Probe'
    };

    // Add tools with error handling
    Object.entries(toolNameMap).forEach(([displayName, toolName]) => {
        try {
            const toolClass = cornerstoneTools[`${toolName}Tool`];
            if (toolClass) {
                cornerstoneTools.addTool(toolClass);
                console.log(`Added tool: ${toolName}`);
            } else {
                console.warn(`Tool class not found: ${toolName}Tool`);
            }
        } catch (error) {
            console.warn(`Could not add tool: ${toolName}`, error);
        }
    });

    // --- Event Listeners ---
    fileInput.addEventListener('change', (event) => {
        const files = event.target.files;
        if (files.length > 0) {
            console.log(`Selected ${files.length} file(s)`);
            
            // Clear the upload queue and add all selected files
            uploadQueue = Array.from(files);
            
            // Show loading indicator
            showLoadingIndicator(`Uploading ${files.length} file(s)...`);
            
            // Start uploading files
            processUploadQueue();
        }
    });

    toolsPanel.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (button && button.dataset.tool) {
            const cornerstoneToolName = toolNameMap[button.dataset.tool];
            if (cornerstoneToolName) {
                setActiveTool(cornerstoneToolName, button);
            }
        }
    });
    
    // Measurement completion event
    document.addEventListener('cornerstonetoolsmeasurementcompleted', function (e) {
        console.log('Measurement completed:', e.detail);
        const measurementData = e.detail.measurementData;
        const dataToSave = {
            dicomFileId: currentFileId,
            type: measurementData.toolType,
            value: measurementData.text || `${measurementData.length?.toFixed(2)} mm`,
            coordinates: { handles: measurementData.handles, unit: measurementData.unit }
        };

        fetch('save_measurement.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSave)
        })
        .then(response => response.json())
        .then(result => console.log('Save result:', result.message))
        .catch(error => console.error('Error saving measurement:', error));
    });

    // --- Core Functions ---
    function showLoadingIndicator(message) {
        viewportContainer.innerHTML = `
            <div class="d-flex justify-content-center align-items-center" style="grid-column: 1 / -1; grid-row: 1 / -1;">
                <div class="text-center">
                    <div class="spinner-border text-primary mb-3" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <div class="text-light">${message}</div>
                </div>
            </div>
        `;
    }

    function showErrorMessage(message) {
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

    async function processUploadQueue() {
        if (uploadInProgress || uploadQueue.length === 0) {
            return;
        }

        uploadInProgress = true;
        let uploadedFiles = [];
        let firstUploadedFile = null;

        try {
            for (let i = 0; i < uploadQueue.length; i++) {
                const file = uploadQueue[i];
                console.log(`Uploading file ${i + 1}/${uploadQueue.length}: ${file.name}`);
                
                showLoadingIndicator(`Uploading ${file.name} (${i + 1}/${uploadQueue.length})...`);
                
                try {
                    const uploadedFile = await uploadSingleFile(file);
                    uploadedFiles.push(uploadedFile);
                    
                    // Add to series list immediately
                    addSeriesItem(uploadedFile);
                    
                    // Remember the first uploaded file for auto-selection
                    if (!firstUploadedFile) {
                        firstUploadedFile = uploadedFile;
                    }
                    
                } catch (error) {
                    console.error(`Error uploading ${file.name}:`, error);
                    alert(`Error uploading ${file.name}: ${error.message}`);
                    
                    // Continue with next file instead of stopping
                    continue;
                }
            }

            // Auto-select and load the first uploaded file
            if (firstUploadedFile) {
                console.log('Auto-selecting first uploaded file:', firstUploadedFile.file_name);
                
                // Find and click the series item to load it
                const seriesItem = seriesList.querySelector(`[data-file-id="${firstUploadedFile.id}"]`);
                if (seriesItem) {
                    seriesItem.click();
                } else {
                    // Fallback: load directly
                    loadAndDisplayImage(firstUploadedFile.id);
                }
            } else {
                // No files uploaded successfully
                showErrorMessage('No files were uploaded successfully');
            }

            console.log(`Successfully uploaded ${uploadedFiles.length} out of ${uploadQueue.length} file(s)`);
            
            if (uploadedFiles.length < uploadQueue.length) {
                alert(`${uploadedFiles.length} out of ${uploadQueue.length} files uploaded successfully`);
            }
            
        } finally {
            uploadInProgress = false;
            uploadQueue = [];
            // Reset file input to allow re-selecting the same files
            fileInput.value = '';
        }
    }

    function uploadSingleFile(file) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('dicomFile', file);
            
            console.log(`Starting upload for: ${file.name}, size: ${file.size} bytes`);
            
            fetch('upload.php', { 
                method: 'POST', 
                body: formData 
            })
            .then(response => {
                console.log(`Upload response for ${file.name}:`, response.status, response.statusText);
                
                if (!response.ok) {
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
                    }).catch(parseError => {
                        // If JSON parsing fails, use status text
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                console.log(`Upload response data for ${file.name}:`, data);
                
                if (data.success === false) {
                    throw new Error(data.message || 'Upload failed');
                }
                
                if (!data.id) {
                    throw new Error('Upload response missing file ID');
                }
                
                resolve(data);
            })
            .catch(error => {
                console.error(`Upload error for ${file.name}:`, error);
                reject(error);
            });
        });
    }
    
    function addSeriesItem(fileData) {
        console.log('Adding series item:', fileData);
        
        // Clear the "No DICOM files" message if it exists
        const noFilesMessage = seriesList.querySelector('.text-muted');
        if (noFilesMessage && noFilesMessage.textContent.includes('No DICOM files')) {
            seriesList.innerHTML = '';
        }
        
        const itemHTML = `
            <div class="d-flex align-items-center p-2 rounded border mb-2 series-item" 
                 style="cursor: pointer;" data-file-id="${fileData.id}">
                <div class="col-3">
                    <div class="bg-secondary rounded d-flex align-items-center justify-content-center text-muted" 
                         style="width: 64px; height: 64px;">
                        <i class="bi bi-file-medical fs-4"></i>
                    </div>
                </div>
                <div class="col-9 ps-3">
                    <div class="fw-medium text-light text-truncate">
                        ${fileData.series_description || fileData.study_description || 'DICOM Series'}
                    </div>
                    <div class="text-muted small">${fileData.file_name}</div>
                    <div class="text-muted small">Patient: ${fileData.patient_name || 'Unknown'}</div>
                </div>
            </div>`;
        
        seriesList.insertAdjacentHTML('beforeend', itemHTML);
        
        const newItem = seriesList.querySelector(`[data-file-id="${fileData.id}"]`);
        newItem.addEventListener('click', () => {
            console.log('Series item clicked:', fileData.id);
            selectSeriesItem(newItem, fileData.id);
        });
    }

    function selectSeriesItem(itemElement, fileId) {
        // Remove active state from all items
        document.querySelectorAll('.series-item').forEach(el => {
            el.classList.remove('border-primary', 'bg-primary', 'bg-opacity-10');
        });
        
        // Add active state to clicked item
        itemElement.classList.add('border-primary', 'bg-primary', 'bg-opacity-10');
        
        // Load and display the image
        loadAndDisplayImage(fileId);
    }

    function loadAndDisplayImage(fileId) {
        console.log('Loading image for file ID:', fileId);
        currentFileId = fileId;
        
        showLoadingIndicator('Loading DICOM image...');
        
        fetch(`get_dicom.php?id=${fileId}`)
            .then(response => {
                console.log('Get DICOM response status:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('DICOM data received, file_data length:', data.file_data?.length || 0);
                
                if (!data.file_data) {
                    throw new Error('File data not found in response.');
                }
                
                // Create the image ID for Cornerstone
                const imageId = 'wadouri:data:application/dicom;base64,' + data.file_data;
                console.log('Created image ID, length:', imageId.length);
                
                setupViewports();
                
                const elements = document.querySelectorAll('.viewport');
                console.log('Found viewport elements:', elements.length);
                
                // Load image in the first viewport (main display)
                if (elements.length > 0) {
                    const mainViewport = elements[0];
                    
                    cornerstone.loadImage(imageId).then(function(image) {
                        console.log('Image loaded successfully:', {
                            width: image.width,
                            height: image.height,
                            intercept: image.intercept,
                            slope: image.slope
                        });
                        
                        cornerstone.displayImage(mainViewport, image);
                        
                        // Load the same image in other viewports (for now)
                        for (let i = 1; i < elements.length; i++) {
                            cornerstone.displayImage(elements[i], image);
                        }
                        
                        // Load measurements for all viewports
                        elements.forEach(element => {
                            loadMeasurements(fileId, element);
                        });
                        
                        // Set default tool to W/L
                        const wlButton = toolsPanel.querySelector('[data-tool="Wwwc"]');
                        setActiveTool('Wwwc', wlButton);
                        
                        console.log('Image displayed successfully in all viewports');
                        
                    }).catch(function(error) {
                        console.error('Error loading/displaying image:', error);
                        showErrorMessage('Error loading DICOM image: ' + error.message);
                    });
                }
            })
            .catch(error => {
                console.error('Error in loadAndDisplayImage:', error);
                showErrorMessage('Error loading DICOM image: ' + error.message);
            });
    }

    function loadMeasurements(fileId, element) {
        console.log('Loading measurements for file:', fileId);
        
        fetch(`get_measurements.php?id=${fileId}`)
            .then(response => response.json())
            .then(measurements => {
                console.log('Measurements loaded:', measurements);
                
                if (measurements && measurements.length > 0) {
                    // Clear existing tool states
                    Object.values(toolNameMap).forEach(tool => {
                        try {
                            cornerstoneTools.clearToolState(element, tool);
                        } catch (error) {
                            // Tool might not exist, ignore
                        }
                    });
                    
                    // Add measurements to tool state
                    measurements.forEach(m => {
                        try {
                            const toolState = {
                                visible: true,
                                active: false,
                                handles: m.coordinates.handles,
                                text: m.value,
                                unit: m.coordinates.unit || 'mm'
                            };
                            cornerstoneTools.addToolState(element, m.type, toolState);
                        } catch (error) {
                            console.warn('Error adding measurement to tool state:', error);
                        }
                    });
                    
                    cornerstone.updateImage(element);
                }
            })
            .catch(error => {
                console.error('Error loading measurements:', error);
            });
    }

    function setupViewports() {
        console.log('Setting up viewports');
        viewportContainer.innerHTML = '';
        
        const viewportNames = ['Axial', 'Sagittal', 'Coronal', '3D'];
        
        viewportNames.forEach((name, index) => {
            const element = document.createElement('div');
            element.className = 'viewport';
            element.id = `viewport-${index}`;
            
            const overlay = document.createElement('div');
            overlay.className = 'viewport-overlay';
            overlay.textContent = name;
            
            element.appendChild(overlay);
            viewportContainer.appendChild(element);
            
            try {
                cornerstone.enable(element);
                console.log(`Viewport ${name} enabled`);
            } catch (error) {
                console.error(`Error enabling viewport ${name}:`, error);
            }
        });
    }
    
    function setActiveTool(toolName, clickedButton) {
        console.log('Setting active tool:', toolName);
        
        try {
            // Disable all tools first
            Object.values(toolNameMap).forEach(tool => {
                try {
                    cornerstoneTools.setToolDisabled(tool);
                } catch (error) {
                    // Tool might not exist
                }
            });
            
            // Activate the selected tool
            cornerstoneTools.setToolActive(toolName, { mouseButtonMask: 1 });
            
            // Update UI
            toolsPanel.querySelectorAll('button').forEach(btn => {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-secondary');
            });
            
            if (clickedButton) {
                clickedButton.classList.remove('btn-secondary');
                clickedButton.classList.add('btn-primary');
            }
            
            console.log(`Tool ${toolName} activated successfully`);
        } catch (error) {
            console.error('Error setting active tool:', error);
        }
    }

    // --- Initialize UI ---
    function initializeUI() {
        // Set default active tool
        const wlButton = toolsPanel.querySelector('[data-tool="Wwwc"]');
        if (wlButton) {
            wlButton.classList.remove('btn-secondary');
            wlButton.classList.add('btn-primary');
        }
    }

    // --- Keyboard shortcuts ---
    document.addEventListener('keydown', function(event) {
        // Don't trigger if user is typing in an input
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        switch(event.key.toLowerCase()) {
            case 'p':
                event.preventDefault();
                const panButton = toolsPanel.querySelector('[data-tool="Pan"]');
                if (panButton) panButton.click();
                break;
            case 'z':
                event.preventDefault();
                const zoomButton = toolsPanel.querySelector('[data-tool="Zoom"]');
                if (zoomButton) zoomButton.click();
                break;
            case 'w':
                event.preventDefault();
                const wlButton = toolsPanel.querySelector('[data-tool="Wwwc"]');
                if (wlButton) wlButton.click();
                break;
        }
    });

    // Initialize the UI
    initializeUI();
    
    console.log('DICOM Viewer initialized successfully');
});