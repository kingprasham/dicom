// Enhanced MPR Viewport Manager with Fixed Element Enabling
window.DICOM_VIEWER.MPRViewportManager = class {
    constructor() {
        this.viewports = new Map();
        this.layouts = {
            '1x1': { rows: 1, cols: 1, viewports: ['original'] },
            '2x1': { rows: 1, cols: 2, viewports: ['original', 'axial'] },
            '1x2': { rows: 2, cols: 1, viewports: ['original', 'sagittal'] },
            '2x2': { rows: 2, cols: 2, viewports: ['original', 'sagittal', 'coronal', 'axial'] }
        };
        this.currentLayout = '2x2';
        this.activeViewport = null;
        this.resizeObserver = null;
        this.setupResizeObserver();
    }

    setupResizeObserver() {
        if ('ResizeObserver' in window) {
            this.resizeObserver = new ResizeObserver(entries => {
                entries.forEach(entry => {
                    const viewport = entry.target;
                    if (viewport.classList.contains('viewport')) {
                        try {
                            if (cornerstone.getEnabledElement(viewport)) {
                                cornerstone.resize(viewport, true);
                            }
                        } catch (error) {
                            // Element might not be enabled yet
                        }
                    }
                });
            });
        }
    }

    createViewports(layout) {
        const container = document.getElementById('viewport-container');
        const layoutConfig = this.layouts[layout];

        if (!layoutConfig) {
            console.error('Unknown layout:', layout);
            return false;
        }

        // Clear existing viewports and observers
        container.innerHTML = '';
        this.cleanupViewports();

        // Update container CSS classes
        container.className = `viewport-container layout-${layout}`;

        // Create viewports in the correct order
        layoutConfig.viewports.forEach((name, index) => {
            const viewportElement = this.createViewportElement(name, index);
            container.appendChild(viewportElement);

            // FIXED: Better viewport enabling with retry logic
            this.enableViewportWithRetry(viewportElement, name, index);
        });

        this.currentLayout = layout;
        console.log(`Created ${layoutConfig.viewports.length} viewports for layout ${layout}`);
        return true;
    }

    // NEW: Enhanced viewport enabling with retry mechanism
    enableViewportWithRetry(viewportElement, name, index, retryCount = 0) {
        const maxRetries = 3;
        
        try {
            // Ensure element is in DOM before enabling
            if (!document.body.contains(viewportElement)) {
                if (retryCount < maxRetries) {
                    setTimeout(() => {
                        this.enableViewportWithRetry(viewportElement, name, index, retryCount + 1);
                    }, 100);
                }
                return;
            }

            // Check if already enabled
            try {
                cornerstone.getEnabledElement(viewportElement);
                console.log(`Viewport ${name} already enabled`);
            } catch (e) {
                // Not enabled, so enable it
                cornerstone.enable(viewportElement);
                console.log(`Enabled viewport: ${name} at position ${index + 1}`);
            }

            this.viewports.set(name, viewportElement);
            
            // Add to resize observer
            if (this.resizeObserver) {
                this.resizeObserver.observe(viewportElement);
            }

            // Set first viewport (Original) as active
            if (index === 0) {
                this.setActiveViewport(viewportElement);
            }

        } catch (error) {
            console.error(`Error enabling viewport ${name}:`, error);
            
            if (retryCount < maxRetries) {
                console.log(`Retrying viewport ${name} (attempt ${retryCount + 1}/${maxRetries})`);
                setTimeout(() => {
                    this.enableViewportWithRetry(viewportElement, name, index, retryCount + 1);
                }, 200);
            } else {
                console.error(`Failed to enable viewport ${name} after ${maxRetries} attempts`);
            }
        }
    }

    createViewportElement(name, index) {
        const element = document.createElement('div');
        element.className = 'viewport';
        element.id = `viewport-${name}-${index}`;
        element.dataset.viewportName = name;
        element.style.position = 'relative';
        element.style.backgroundColor = '#000000';

        // Click handler for viewport activation
        element.addEventListener('click', () => this.setActiveViewport(element));

        // Create viewport overlay with proper positioning
        const overlay = document.createElement('div');
        overlay.className = 'viewport-overlay';
        
        const displayNames = {
            'original': 'Original',
            'axial': 'Axial',
            'sagittal': 'Sagittal', 
            'coronal': 'Coronal',
            'main': 'Main',
            '3d': '3D View'
        };
        
        overlay.textContent = displayNames[name] || name.charAt(0).toUpperCase() + name.slice(1);
        overlay.style.cssText = `
            position: absolute;
            top: 5px;
            left: 5px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 500;
            z-index: 10;
            pointer-events: none;
            border: 1px solid rgba(255,255,255,0.2);
        `;
        element.appendChild(overlay);

        // Create viewport info panel
        const info = document.createElement('div');
        info.className = 'viewport-info';
        info.style.cssText = `
            position: absolute;
            bottom: 5px;
            left: 5px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 9px;
            z-index: 10;
            pointer-events: none;
            text-align: left;
            border: 1px solid rgba(255,255,255,0.1);
        `;
        element.appendChild(info);

        // Add MPR-specific elements
        if (['axial', 'sagittal', 'coronal'].includes(name)) {
            element.classList.add('mpr-view');

            const sliceIndicator = document.createElement('div');
            sliceIndicator.className = 'slice-indicator';
            sliceIndicator.textContent = 'Slice: 50%';
            sliceIndicator.style.cssText = `
                position: absolute;
                top: 5px;
                right: 5px;
                background: rgba(40,167,69,0.8);
                color: white;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 9px;
                font-weight: 500;
                z-index: 10;
                pointer-events: none;
                border: 1px solid rgba(40,167,69,0.3);
            `;
            element.appendChild(sliceIndicator);

            element.style.border = '1px solid #28a745';
        } else {
            element.style.border = '1px solid #444444';
        }

        this.addMouseWheelNavigation(element, name);
        this.addTouchSupport(element, name);

        return element;
    }

    setupMPRViewports() {
    console.log('Setting up MPR viewports...');
    
    if (window.DICOM_VIEWER.MANAGERS.viewportManager.currentLayout !== '2x2') {
        console.log('MPR requires 2x2 layout, switching...');
        window.DICOM_VIEWER.MANAGERS.viewportManager.switchLayout('2x2');
        
        // Wait for layout switch to complete
        return new Promise(resolve => {
            setTimeout(() => {
                this.setupMPRViewports().then(resolve);
            }, 600);
        });
    }

    // Wait a bit for viewports to be fully created and enabled
    return new Promise((resolve) => {
        setTimeout(() => {
            window.DICOM_VIEWER.STATE.mprViewports = {
                axial: window.DICOM_VIEWER.MANAGERS.viewportManager.getViewport('axial'),
                sagittal: window.DICOM_VIEWER.MANAGERS.viewportManager.getViewport('sagittal'),
                coronal: window.DICOM_VIEWER.MANAGERS.viewportManager.getViewport('coronal'),
                original: window.DICOM_VIEWER.MANAGERS.viewportManager.getViewport('original')
            };

            console.log('MPR viewports configured:', Object.keys(window.DICOM_VIEWER.STATE.mprViewports));

            // Verify and enable all viewports
            let allEnabled = true;
            Object.entries(window.DICOM_VIEWER.STATE.mprViewports).forEach(([name, viewport]) => {
                if (!viewport) {
                    console.error(`Missing MPR viewport: ${name}`);
                    allEnabled = false;
                    return;
                }
                
                try {
                    cornerstone.getEnabledElement(viewport);
                    console.log(`✓ Viewport ${name} is already enabled`);
                } catch (error) {
                    try {
                        cornerstone.enable(viewport);
                        console.log(`✓ Enabled viewport ${name}`);
                    } catch (enableError) {
                        console.error(`✗ Failed to enable viewport ${name}:`, enableError);
                        allEnabled = false;
                    }
                }
            });

            if (!allEnabled) {
                console.error('Not all MPR viewports are properly enabled');
                resolve(false);
                return;
            }

            console.log('All MPR viewports are enabled and ready');
            resolve(true);
        }, 500); // Increased delay for proper initialization
    });
}

    // FIXED: Safer viewport methods
    setActiveViewport(viewport) {
        // Verify viewport is enabled before setting as active
        try {
            cornerstone.getEnabledElement(viewport);
        } catch (error) {
            console.warn('Cannot set inactive viewport as active:', error);
            return;
        }

        // Remove active class from all viewports
        this.viewports.forEach(vp => {
            vp.classList.remove('active');
            vp.style.boxShadow = '';
        });

        // Set active viewport
        viewport.classList.add('active');
        
        if (viewport.classList.contains('mpr-view')) {
            viewport.style.boxShadow = '0 0 8px rgba(40, 167, 69, 0.6)';
        } else {
            viewport.style.boxShadow = '0 0 8px rgba(13, 110, 253, 0.6)';
        }

        this.activeViewport = viewport;
        window.activeViewport = viewport;
        window.DICOM_VIEWER.STATE.activeViewport = viewport;

        console.log(`Active viewport: ${viewport.dataset.viewportName}`);
    }

    // REST OF THE CLASS METHODS REMAIN THE SAME...
    addMouseWheelNavigation(element, viewportName) {
        let wheelTimeout = null;

        element.addEventListener('wheel', (e) => {
            e.preventDefault();

            clearTimeout(wheelTimeout);
            wheelTimeout = setTimeout(() => {
                if (['axial', 'sagittal', 'coronal'].includes(viewportName)) {
                    if (window.DICOM_VIEWER.MANAGERS.mprManager && window.DICOM_VIEWER.MANAGERS.mprManager.volumeData) {
                        const delta = e.deltaY > 0 ? 0.02 : -0.02;
                        const state = window.DICOM_VIEWER.STATE;
                        const currentPos = state.currentSlicePositions[viewportName] || 0.5;
                        const newPos = Math.max(0, Math.min(1, currentPos + delta));

                        state.currentSlicePositions[viewportName] = newPos;
                        window.DICOM_VIEWER.updateMPRSlice(viewportName, newPos);

                        const slider = document.getElementById(`${viewportName}Slider`);
                        if (slider) slider.value = newPos * 100;
                    }
                } else {
                    if (window.DICOM_VIEWER.STATE.totalImages > 1) {
                        const delta = e.deltaY > 0 ? 1 : -1;
                        window.DICOM_VIEWER.navigateImage(delta);
                    }
                }
            }, 10);
        }, { passive: false });
    }

    addTouchSupport(element, viewportName) {
        let touchStartY = 0;

        element.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        element.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                const deltaY = touchStartY - e.touches[0].clientY;

                if (Math.abs(deltaY) > 15) {
                    if (['axial', 'sagittal', 'coronal'].includes(viewportName)) {
                        const delta = deltaY > 0 ? 0.05 : -0.05;
                        const state = window.DICOM_VIEWER.STATE;
                        const currentPos = state.currentSlicePositions[viewportName] || 0.5;
                        const newPos = Math.max(0, Math.min(1, currentPos + delta));

                        state.currentSlicePositions[viewportName] = newPos;
                        window.DICOM_VIEWER.updateMPRSlice(viewportName, newPos);
                    } else {
                        if (window.DICOM_VIEWER.STATE.totalImages > 1) {
                            const delta = deltaY > 0 ? 1 : -1;
                            window.DICOM_VIEWER.navigateImage(delta);
                        }
                    }
                    touchStartY = e.touches[0].clientY;
                }
            }
        }, { passive: true });
    }

    getViewport(name) {
        return this.viewports.get(name);
    }

    getAllViewports() {
        return Array.from(this.viewports.values());
    }

    switchLayout(newLayout) {
        console.log(`Switching from ${this.currentLayout} to ${newLayout}`);

        const state = window.DICOM_VIEWER.STATE;
        const wasPlaying = state.isPlaying;
        if (wasPlaying) window.DICOM_VIEWER.stopCine();

        const success = this.createViewports(newLayout);

        if (success && state.currentSeriesImages && state.currentSeriesImages.length > 0) {
            setTimeout(() => {
                window.DICOM_VIEWER.loadCurrentImage();

                if (state.mprEnabled && window.DICOM_VIEWER.MANAGERS.mprManager && 
                    window.DICOM_VIEWER.MANAGERS.mprManager.volumeData && newLayout === '2x2') {
                    window.DICOM_VIEWER.setupMPRViewports();
                    window.DICOM_VIEWER.updateAllMPRViews();
                }

                if (wasPlaying) window.DICOM_VIEWER.startCine();
            }, 500); // Increased delay for viewport initialization
        }

        return success;
    }

    cleanupViewports() {
        this.viewports.forEach(viewport => {
            try {
                if (cornerstone.getEnabledElement(viewport)) {
                    cornerstone.disable(viewport);
                }
                if (this.resizeObserver) {
                    this.resizeObserver.unobserve(viewport);
                }
            } catch (error) {
                // Element might not be enabled
            }
        });

        this.viewports.clear();
    }

    destroy() {
        this.cleanupViewports();
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }

    getViewportStats() {
        const stats = {
            total: this.viewports.size,
            enabled: 0,
            withImages: 0,
            active: this.activeViewport ? this.activeViewport.dataset.viewportName : null,
            layout: this.currentLayout
        };

        this.viewports.forEach(viewport => {
            try {
                const enabledElement = cornerstone.getEnabledElement(viewport);
                stats.enabled++;
                if (enabledElement.image) {
                    stats.withImages++;
                }
            } catch (error) {
                // Not enabled
            }
        });

        return stats;
    }
};