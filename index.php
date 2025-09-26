<!DOCTYPE html>
<html lang="en" data-bs-theme="dark">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DICOM Viewer Pro - Enhanced MPR</title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="css/styles.css">

    <script src="https://unpkg.com/dicom-parser@1.8.21/dist/dicomParser.min.js"></script>
    <script src="https://unpkg.com/cornerstone-core@2.6.1/dist/cornerstone.min.js"></script>
    <script src="https://unpkg.com/cornerstone-math@0.1.10/dist/cornerstoneMath.min.js"></script>
    <script src="https://unpkg.com/hammerjs@2.0.8/hammer.min.js"></script>
    <script src="https://unpkg.com/cornerstone-wado-image-loader@3.1.2/dist/cornerstoneWADOImageLoader.min.js"></script>
    <script src="https://unpkg.com/cornerstone-tools@5.1.5/dist/cornerstoneTools.min.js"></script>
</head>

<body>
    <div id="loadingProgress" class="loading-progress">
        <div class="d-flex align-items-center">
            <div class="spinner-border spinner-border-sm me-2" role="status"></div>
            <span>Loading images...</span>
        </div>
    </div>

    <header class="navbar navbar-expand-lg bg-body-tertiary border-bottom" style="height: 58px;">
        <div class="container-fluid">
            <a class="navbar-brand d-flex align-items-center" href="#">
                <i class="bi bi-heart-pulse-fill text-primary fs-4 me-2"></i>
                <span class="fw-semibold">DICOM Viewer Pro - Enhanced MPR</span>
            </a>
            <div class="d-flex align-items-center gap-2">
                <form id="uploadForm" enctype="multipart/form-data" class="m-0">
    <div class="btn-group">
        <label for="dicomFolderInput" class="btn btn-primary">
            <i class="bi bi-folder2-open me-2"></i>Open Folder
        </label>
        <button class="btn btn-primary dropdown-toggle dropdown-toggle-split"
            data-bs-toggle="dropdown"></button>
        <ul class="dropdown-menu">
            <li><a class="dropdown-item" href="#" id="uploadFolder">Folder (Default)</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item" href="#" id="uploadSeries">Select Multiple Files</a></li>
            <li><a class="dropdown-item" href="#" id="uploadSingle">Select Single File</a></li>
        </ul>
    </div>
    <input type="file" id="dicomFileInput" name="dicomFile" class="d-none" accept=".dcm,.dicom" multiple>
    <input type="file" id="dicomFolderInput" name="dicomFolder" class="d-none" webkitdirectory multiple>
</form>
                <div class="btn-group">
                    <button class="btn btn-secondary" id="exportBtn"><i class="bi bi-download me-2"></i>Export</button>
                    <button class="btn btn-secondary dropdown-toggle dropdown-toggle-split"
                        data-bs-toggle="dropdown"></button>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="#" id="exportImage">Export as Image</a></li>
                        <li><a class="dropdown-item" href="#" id="exportReport">Export Report</a></li>
                        <li><a class="dropdown-item" href="#" id="exportDicom">Export DICOM</a></li>
                        <li><a class="dropdown-item" href="#" id="exportMPR">Export MPR Views</a></li>
                    </ul>
                </div>
                <button class="btn btn-secondary" id="settingsBtn"><i class="bi bi-gear"></i></button>
                <button class="btn btn-secondary" id="fullscreenBtn"><i class="bi bi-arrows-fullscreen"></i></button>
            </div>
        </div>
    </header>

    <div class="main-layout">
        <aside class="sidebar bg-body-tertiary border-end">
            <div class="sidebar-section"
                style="padding: 1rem; flex-shrink: 0; border-bottom: 1px solid var(--bs-border-color);">
                <h6 class="text-light mb-2">Series Navigation</h6>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="enableMPR" checked>
                    <label class="form-check-label small text-success" for="enableMPR">
                        <i class="bi bi-layers"></i> Enable MPR Views
                    </label>
                </div>
            </div>

            <div class="series-list-container" id="series-list">
                <div class="text-center text-muted small p-4">
                    No DICOM files uploaded
                </div>
            </div>

            <div class="sidebar-section fixed-section navigation-section">
                <h6 class="text-light mb-2">Image Navigation</h6>
                <div class="d-flex align-items-center gap-2 mb-2">
                    <button class="btn btn-sm btn-secondary" id="prevImage">
                        <i class="bi bi-chevron-left"></i>
                    </button>
                    <span class="small text-muted flex-fill text-center" id="imageCounter">- / -</span>
                    <button class="btn btn-sm btn-secondary" id="nextImage">
                        <i class="bi bi-chevron-right"></i>
                    </button>
                </div>
                <input type="range" class="form-range" id="imageSlider" min="0" max="0" value="0">

                <div class="mt-2" id="mprNavigation" style="display: none;">
                    <small class="text-success">MPR Slice Control</small>
                    <div class="row g-1 mt-1">
                        <div class="col-4">
                            <small class="text-muted d-block">Axial</small>
                            <input type="range" class="form-range form-range-sm" id="axialSlider" min="0" max="100"
                                value="50">
                        </div>
                        <div class="col-4">
                            <small class="text-muted d-block">Sagittal</small>
                            <input type="range" class="form-range form-range-sm" id="sagittalSlider" min="0" max="100"
                                value="50">
                        </div>
                        <div class="col-4">
                            <small class="text-muted d-block">Coronal</small>
                            <input type="range" class="form-range form-range-sm" id="coronalSlider" min="0" max="100"
                                value="50">
                        </div>
                    </div>
                </div>
            </div>

            <div class="sidebar-section fixed-section cine-section">
                <h6 class="text-light mb-2">Cine Controls</h6>
                <div class="d-flex align-items-center gap-2">
                    <button class="btn btn-sm btn-secondary" id="playPause">
                        <i class="bi bi-play-fill"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary" id="stopCine">
                        <i class="bi bi-stop-fill"></i>
                    </button>
                    <small class="text-muted">FPS:</small>
                    <input type="range" class="form-range flex-fill" id="fpsSlider" min="1" max="30" value="10">
                    <small class="text-muted" id="fpsDisplay">10</small>
                </div>
            </div>

            <div class="accordion accordion-flush" id="infoAccordion">
                <div class="accordion-item bg-transparent">
                    <h2 class="accordion-header">
                        <button class="accordion-button bg-transparent" type="button" data-bs-toggle="collapse"
                            data-bs-target="#collapsePatient">
                            Patient Info
                        </button>
                    </h2>
                    <div id="collapsePatient" class="accordion-collapse collapse show" data-bs-parent="#infoAccordion">
                        <div id="patientInfo" class="accordion-body small text-muted">
                            <div>Name: -</div>
                            <div>ID: -</div>
                            <div>DOB: -</div>
                            <div>Sex: -</div>
                        </div>
                    </div>
                </div>
                <div class="accordion-item bg-transparent">
                    <h2 class="accordion-header">
                        <button class="accordion-button bg-transparent collapsed" type="button"
                            data-bs-toggle="collapse" data-bs-target="#collapseStudy">
                            Study Info
                        </button>
                    </h2>
                    <div id="collapseStudy" class="accordion-collapse collapse" data-bs-parent="#infoAccordion">
                        <div id="studyInfo" class="accordion-body small text-muted">
                            <div>Date: -</div>
                            <div>Time: -</div>
                            <div>Modality: -</div>
                            <div>Body Part: -</div>
                        </div>
                    </div>
                </div>
                <div class="accordion-item bg-transparent">
                    <h2 class="accordion-header">
                        <button class="accordion-button bg-transparent collapsed" type="button"
                            data-bs-toggle="collapse" data-bs-target="#collapseImage">
                            Image Info
                        </button>
                    </h2>
                    <div id="collapseImage" class="accordion-collapse collapse" data-bs-parent="#infoAccordion">
                        <div id="imageInfo" class="accordion-body small text-muted">
                            <div>Matrix: -</div>
                            <div>Pixel Spacing: -</div>
                            <div>Slice Thickness: -</div>
                            <div>Window: -</div>
                            <div>Level: -</div>
                        </div>
                    </div>
                </div>
                <div class="accordion-item bg-transparent">
                    <h2 class="accordion-header">
                        <button class="accordion-button bg-transparent collapsed" type="button"
                            data-bs-toggle="collapse" data-bs-target="#collapseMPR">
                            MPR Info
                        </button>
                    </h2>
                    <div id="collapseMPR" class="accordion-collapse collapse" data-bs-parent="#infoAccordion">
                        <div id="mprInfo" class="accordion-body small text-success">
                            <div>Volume: -</div>
                            <div>Orientation: -</div>
                            <div>Slice Position: -</div>
                        </div>
                    </div>
                </div>
            </div>
        </aside>

        <main id="main-content" class="d-flex flex-column" style="background-color: #000;">
            <div class="mpr-controls">
                <div class="top-controls-bar">
                    <div class="controls-group-left">
                        <div class="control-group">
                            <span class="control-label">Layout:</span>
                            <div class="btn-group" role="group">
                                <button type="button" class="btn btn-sm btn-secondary" data-layout="1x1"><i
                                        class="bi bi-app"></i></button>
                                <button type="button" class="btn btn-sm btn-primary" data-layout="2x2"><i
                                        class="bi bi-grid-fill"></i></button>
                                <button type="button" class="btn btn-sm btn-secondary" data-layout="2x1"><i
                                        class="bi bi-layout-split"></i></button>
                            </div>
                        </div>
                        <div class="control-group">
                            <span class="control-label">MPR:</span>
                            <div class="btn-group" role="group">
                                <button type="button" class="btn btn-sm btn-success" id="mprAxial">Axial</button>
                                <button type="button" class="btn btn-sm btn-success" id="mprSagittal">Sagittal</button>
                                <button type="button" class="btn btn-sm btn-success" id="mprCoronal">Coronal</button>
                                <button type="button" class="btn btn-sm btn-outline-success" id="mprAll">All
                                    Views</button>
                            </div>
                        </div>
                        <div class="control-group">
                            <span class="control-label">Sync:</span>
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="checkbox" id="syncScroll" checked>
                                <label class="form-check-label small" for="syncScroll">Scroll</label>
                            </div>
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="checkbox" id="syncWL" checked>
                                <label class="form-check-label small" for="syncWL">W/L</label>
                            </div>
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="checkbox" id="syncZoom">
                                <label class="form-check-label small" for="syncZoom">Zoom</label>
                            </div>
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="checkbox" id="showCrosshairs" checked>
                                <label class="form-check-label small" for="showCrosshairs">Crosshairs</label>
                            </div>
                        </div>
                    </div>

                    <!-- Replace the manipulation controls section in index.php with this corrected version -->
                    <div class="controls-group-right">
                        <div class="control-group">
                            <button class="btn btn-sm btn-secondary" id="resetBtn" title="Reset">
                                <i class="bi bi-arrow-counterclockwise"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary" id="invertBtn" title="Invert">
                                <i class="bi bi-circle-half"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary" id="flipHBtn" title="Flip Horizontal">
                                <i class="bi bi-arrow-left-right"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary" id="flipVBtn" title="Flip Vertical">
                                <i class="bi bi-arrow-down-up"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary" id="rotateLeftBtn" title="Rotate Left">
                                <i class="bi bi-arrow-counterclockwise"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary" id="rotateRightBtn" title="Rotate Right">
                                <i class="bi bi-arrow-clockwise"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div id="viewport-container" class="viewport-container layout-2x2">
                <div class="card bg-dark text-light text-center">
                    <div class="card-body d-flex flex-column justify-content-center">
                        <h5 class="card-title text-muted">No DICOM file selected</h5>
                        <p class="card-text text-muted small">Upload and select a DICOM file to begin viewing with
                            automatic MPR reconstruction</p>
                    </div>
                </div>
            </div>
        </main>

        <aside class="sidebar bg-body-tertiary border-start">
            <div class="p-3 border-bottom">
                <h6 class="text-light mb-2">Tools</h6>
                <div class="row row-cols-3 g-1" id="tools-panel">
                    <div class="col"><button data-tool="Pan"
                            class="btn btn-secondary w-100 tool-btn d-flex flex-column justify-content-center align-items-center"><i
                                class="bi bi-arrows-move"></i><span class="small">Pan</span></button></div>
                    <div class="col"><button data-tool="Zoom"
                            class="btn btn-secondary w-100 tool-btn d-flex flex-column justify-content-center align-items-center"><i
                                class="bi bi-zoom-in"></i><span class="small">Zoom</span></button></div>
                    <div class="col"><button data-tool="Wwwc"
                            class="btn btn-primary w-100 tool-btn d-flex flex-column justify-content-center align-items-center"><i
                                class="bi bi-sliders"></i><span class="small">W/L</span></button></div>
                    <div class="col"><button data-tool="Length"
                            class="btn btn-secondary w-100 tool-btn d-flex flex-column justify-content-center align-items-center"><i
                                class="bi bi-rulers"></i><span class="small">Length</span></button></div>
                    <div class="col"><button data-tool="Angle"
                            class="btn btn-secondary w-100 tool-btn d-flex flex-column justify-content-center align-items-center"><i
                                class="bi bi-triangle"></i><span class="small">Angle</span></button></div>
                    <div class="col"><button data-tool="FreehandRoi"
                            class="btn btn-secondary w-100 tool-btn d-flex flex-column justify-content-center align-items-center"><i
                                class="bi bi-pencil"></i><span class="small">Draw</span></button></div>
                    <div class="col"><button data-tool="EllipticalRoi"
                            class="btn btn-secondary w-100 tool-btn d-flex flex-column justify-content-center align-items-center"><i
                                class="bi bi-circle"></i><span class="small">Circle</span></button></div>
                    <div class="col"><button data-tool="RectangleRoi"
                            class="btn btn-secondary w-100 tool-btn d-flex flex-column justify-content-center align-items-center"><i
                                class="bi bi-square"></i><span class="small">Rectangle</span></button></div>
                    <div class="col"><button data-tool="Probe"
                            class="btn btn-secondary w-100 tool-btn d-flex flex-column justify-content-center align-items-center"><i
                                class="bi bi-eyedropper"></i><span class="small">Probe</span></button></div>
                </div>
            </div>

            <div class="sidebar-scrollable">
                <div class="p-3 border-bottom">
                    <h6 class="text-light mb-2">Window/Level Presets</h6>
                    <div class="d-grid gap-1">
                        <button class="btn btn-sm btn-outline-secondary preset-btn"
                            data-preset="default">Default</button>
                        <button class="btn btn-sm btn-outline-secondary preset-btn" data-preset="lung">Lung
                            (-600/1500)</button>
                        <button class="btn btn-sm btn-outline-secondary preset-btn" data-preset="abdomen">Abdomen
                            (50/400)</button>
                        <button class="btn btn-sm btn-outline-secondary preset-btn" data-preset="brain">Brain
                            (40/80)</button>
                        <button class="btn btn-sm btn-outline-secondary preset-btn" data-preset="bone">Bone
                            (400/1000)</button>
                    </div>

                    <div class="mt-3">
                        <label class="form-label small text-light mb-1">Window Width</label>
                        <input type="range" class="form-range" id="windowSlider" min="1" max="4000" value="400">
                        <small class="text-muted" id="windowValue">400</small>
                    </div>
                    <div class="mt-2">
                        <label class="form-label small text-light mb-1">Window Level</label>
                        <input type="range" class="form-range" id="levelSlider" min="-1000" max="1000" value="40">
                        <small class="text-muted" id="levelValue">40</small>
                    </div>
                </div>

                <!-- Replace the image enhancement section in index.php -->
                <div class="enhancement-controls p-3 border-bottom">
                    <h6 class="text-light mb-3">Image Enhancement</h6>

                    <div class="mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <label class="form-label small text-light mb-0">Brightness</label>
                            <span id="brightnessValue" class="small text-info">0</span>
                        </div>
                        <input type="range" class="form-range" id="brightnessSlider" min="-100" max="100" step="1"
                            value="0">
                    </div>

                    <div class="mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <label class="form-label small text-light mb-0">Contrast</label>
                            <span id="contrastValue" class="small text-info">1.0x</span>
                        </div>
                        <input type="range" class="form-range" id="contrastSlider" min="0.1" max="3.0" step="0.1"
                            value="1.0">
                    </div>

                    <div class="mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <label class="form-label small text-light mb-0">Sharpening</label>
                            <span id="sharpenValue" class="small text-info">0.0</span>
                        </div>
                        <input type="range" class="form-range" id="sharpenSlider" min="0" max="2.5" step="0.1"
                            value="0">
                    </div>
                </div>

                <div class="p-3 border-bottom">
                    <h6 class="text-light mb-2">Measurements</h6>
                    <div class="scrollable-section">
                        <div id="measurements-list" class="small">
                            <div class="text-muted">No measurements</div>
                        </div>
                    </div>
                    <div class="mt-2">
                        <button class="btn btn-sm btn-outline-secondary w-100" id="clearMeasurements">Clear All</button>
                    </div>
                </div>

                <div class="p-3 border-bottom">
                    <h6 class="text-light mb-2">AI Assistant</h6>
                    <div class="d-grid gap-1">
                        <button class="btn btn-sm btn-outline-info" id="autoAdjustWL">Auto W/L</button>
                        <button class="btn btn-sm btn-outline-info" id="detectAbnormalities">Detect
                            Abnormalities</button>
                        <button class="btn btn-sm btn-outline-info" id="measureDistance">Smart Measure</button>
                        <button class="btn btn-sm btn-outline-info" id="enhanceImage">Enhance Quality</button>
                    </div>
                    <div class="mt-2">
                        <div id="aiSuggestions" class="small text-info" style="display: none;">
                            <div class="bg-info bg-opacity-10 p-2 rounded">
                                <strong>AI Suggestion:</strong>
                                <div id="suggestionText">Ready to assist with image analysis</div>
                            </div>
                        </div>
                    </div>
                </div>


                <!-- Replace the Display Options section in index.php with this cleaned version -->
                <div class="sidebar-content p-3">
                    <h6 class="text-light mb-2">Display Options</h6>

                    <!-- Keep only essential display options -->
                    <div class="mt-3">
                        <label class="form-label small text-light">Interpolation</label>
                        <select class="form-select form-select-sm" id="interpolationSelect">
                            <option value="0">Nearest Neighbor</option>
                            <option value="1" selected>Linear</option>
                            <option value="2">Cubic</option>
                        </select>
                    </div>

                    <div class="mt-3">
                        <label class="form-label small text-light">MPR Quality</label>
                        <select class="form-select form-select-sm" id="mprQuality">
                            <option value="low">Low (Fast)</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High (Slow)</option>
                        </select>
                    </div>
                </div>
            </div>
        </aside>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>

    <!-- Load utilities first -->
    <script src="js/utils/constants.js"></script>
    <script src="js/utils/cornerstone-init.js"></script>

    <!-- Load managers -->
    <script src="js/managers/enhancement-manager.js"></script>
    <script src="js/managers/crosshair-manager.js"></script>
    <script src="js/managers/viewport-manager.js"></script>
    <script src="js/managers/mpr-manager.js"></script>

    <!-- Load components -->
    <script src="js/components/upload-handler.js"></script>
    <script src="js/components/ui-controls.js"></script>
    <script src="js/components/event-handlers.js"></script>
    <script src="js/components/medical-notes.js"></script>
    <script src="https://unpkg.com/dicom-parser@1.8.21/dist/dicomParser.min.js"></script>


    <!-- Load main application -->
    <script src="js/main.js"></script>
</body>

</html>