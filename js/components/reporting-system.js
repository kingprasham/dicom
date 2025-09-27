// Medical Reporting System
window.DICOM_VIEWER.ReportingSystem = class {
    constructor() {
        this.currentReport = null;
        this.reportingMode = false;
        this.originalSidebarContent = null;
        this.templates = this.getReportTemplates();
        this.currentTemplate = null;
        this.reportData = {};
        this.autosaveInterval = null;

         // --- NEW: References to sidebar panels ---
        this.rightSidebar = document.querySelector('.sidebar:last-child');
        this.originalSidebarContent = null;
        this.reportingTemplateSelector = null;
        this.reportingToolsPanel = null;
    }

    // Get professional medical report templates
    getReportTemplates() {
        return {
            'ct_head': {
                name: 'CT Head/Brain',
                category: 'CT',
                sections: {
                    indication: 'Clinical indication for the study',
                    technique: 'Non-contrast CT head performed in axial plane with 5mm slice thickness',
                    findings: {
                        brain_parenchyma: 'The brain parenchyma demonstrates...',
                        ventricles: 'The ventricular system is...',
                        csf_spaces: 'The CSF spaces are...',
                        skull: 'The calvarium and skull base are...',
                        soft_tissues: 'The soft tissues are...'
                    },
                    impression: 'IMPRESSION:\n1. '
                }
            },
            'ct_chest': {
                name: 'CT Chest',
                category: 'CT',
                sections: {
                    indication: 'Clinical indication for the study',
                    technique: 'CT chest performed with/without contrast',
                    findings: {
                        lungs: 'The lungs are clear bilaterally...',
                        pleura: 'No pleural effusion or pneumothorax...',
                        heart: 'The heart size is normal...',
                        mediastinum: 'The mediastinum is unremarkable...',
                        bones: 'Visualized osseous structures...'
                    },
                    impression: 'IMPRESSION:\n1. '
                }
            },
            'ct_abdomen': {
                name: 'CT Abdomen/Pelvis',
                category: 'CT',
                sections: {
                    indication: 'Clinical indication for the study',
                    technique: 'CT abdomen and pelvis with oral and IV contrast',
                    findings: {
                        liver: 'The liver is normal in size and attenuation...',
                        gallbladder: 'The gallbladder is unremarkable...',
                        pancreas: 'The pancreas appears normal...',
                        kidneys: 'Both kidneys are normal in size...',
                        bowel: 'The bowel loops are unremarkable...',
                        pelvis: 'The pelvis is unremarkable...'
                    },
                    impression: 'IMPRESSION:\n1. '
                }
            },
            'mri_brain': {
                name: 'MRI Brain',
                category: 'MRI',
                sections: {
                    indication: 'Clinical indication for the study',
                    technique: 'MRI brain with T1, T2, FLAIR, and DWI sequences',
                    findings: {
                        brain_parenchyma: 'The brain parenchyma is normal...',
                        white_matter: 'The white matter is unremarkable...',
                        ventricles: 'The ventricular system is normal...',
                        cerebellum: 'The cerebellum and brainstem are normal...',
                        vessels: 'No evidence of acute infarction...'
                    },
                    impression: 'IMPRESSION:\n1. '
                }
            },
            'mri_spine': {
                name: 'MRI Spine',
                category: 'MRI',
                sections: {
                    indication: 'Clinical indication for the study',
                    technique: 'MRI of the spine with T1 and T2 weighted images',
                    findings: {
                        alignment: 'Normal spinal alignment...',
                        discs: 'The intervertebral discs are...',
                        cord: 'The spinal cord is normal...',
                        facets: 'The facet joints are...',
                        soft_tissues: 'The paraspinal soft tissues are...'
                    },
                    impression: 'IMPRESSION:\n1. '
                }
            },
            'xray_chest': {
                name: 'X-Ray Chest',
                category: 'X-Ray',
                sections: {
                    indication: 'Clinical indication for the study',
                    technique: 'Frontal and lateral chest radiographs',
                    findings: {
                        lungs: 'The lungs are clear without consolidation...',
                        heart: 'The cardiac silhouette is normal...',
                        bones: 'The osseous structures are intact...',
                        soft_tissues: 'The soft tissues are unremarkable...'
                    },
                    impression: 'IMPRESSION:\n1. '
                }
            },
            'ultrasound_abdomen': {
                name: 'Ultrasound Abdomen',
                category: 'Ultrasound',
                sections: {
                    indication: 'Clinical indication for the study',
                    technique: 'Real-time ultrasound examination',
                    findings: {
                        liver: 'The liver is normal in size and echogenicity...',
                        gallbladder: 'The gallbladder is unremarkable...',
                        kidneys: 'Both kidneys are normal...',
                        pancreas: 'Visualized portions of pancreas...',
                        vessels: 'The aorta and IVC are normal...'
                    },
                    impression: 'IMPRESSION:\n1. '
                }
            },
            'mammo': {
                name: 'Mammography',
                category: 'Mammography',
                sections: {
                    indication: 'Clinical indication for the study',
                    technique: 'Digital mammography with MLO and CC views',
                    findings: {
                        composition: 'Breast composition: ACR Category...',
                        masses: 'No suspicious masses identified...',
                        calcifications: 'No suspicious calcifications...',
                        asymmetries: 'No focal asymmetries...',
                        skin: 'The skin and nipples are unremarkable...'
                    },
                    impression: 'IMPRESSION:\nBI-RADS Category: \n1. '
                }
            }
        };
    }
    // Add this helper function to clean JSON responses:
cleanJSONResponse(responseText) {
    // Remove HTML error messages that might be appended to JSON
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        return responseText.substring(jsonStart, jsonEnd + 1);
    }
    
    return responseText;
}
enterReportingMode() {
        if (this.reportingMode) return;
        console.log('Entering reporting mode...');
        this.reportingMode = true;

        this.prepareSidebarForReporting();
        document.body.classList.add('reporting-mode');

        this.reportingTemplateSelector.style.display = 'block';
        this.originalSidebarContent.style.display = 'none';

        console.log('Reporting mode entered. Please select a template.');
    }
// Fix the split view layout and report editor creation in reporting-system.js

// 1. Replace the enterReportingMode function:
enterReportingMode() {
    console.log('Entering reporting mode...');
    
    this.reportingMode = true;
    this.backupSidebarContent();
    
    // Apply reporting mode class to body for CSS targeting
    document.body.classList.add('reporting-mode');
    
    // Show template selection in sidebar
    this.showTemplateSelection();
    
    // Don't setup split view here - wait for template selection
    console.log('Reporting mode entered - awaiting template selection');
}

// 2. Update the showReportEditor function to properly create split view:
// reporting-system.js

// UPDATED: This function now reliably creates the report editor in the main content area.
showReportEditor(template) {
    console.log('Creating report editor in split view for template:', template.name);

    // Always remove any old editor before creating a new one.
    const existingEditor = document.getElementById('report-editor-container');
    if (existingEditor) {
        existingEditor.remove();
    }

    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        console.error('Main content area not found! Cannot create report editor.');
        return;
    }

    // 1. Create the editor's main container.
    const reportEditorContainer = document.createElement('div');
    reportEditorContainer.id = 'report-editor-container';
    // The new CSS rules will automatically style and position this container.

    // 2. Generate the editor's internal HTML.
    reportEditorContainer.innerHTML = this.generateReportEditorHTML(template);

    // 3. Append the new editor to the main content area to create the split view.
    mainContent.appendChild(reportEditorContainer);

    // 4. Attach event listeners and switch the right sidebar to show reporting tools.
    this.attachEditorEvents();
    this.updateSidebarForReporting();

    console.log('Report editor created successfully.');
}
// 3. Update the setupSplitViewLayout function:
setupSplitViewLayout() {
    const mainContent = document.getElementById('main-content');
    const viewportContainer = document.getElementById('viewport-container');
    
    if (!mainContent || !viewportContainer) {
        console.error('Required elements not found for split view');
        return;
    }
    
    // Store original styles for restoration
    this.originalMainContentStyle = mainContent.style.cssText;
    this.originalViewportStyle = viewportContainer.style.cssText;
    
    // Apply split view styles to main content
    mainContent.style.cssText = `
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        grid-gap: 10px !important;
        height: calc(100vh - 58px) !important;
        padding: 10px !important;
        background: #000 !important;
    `;
    
    // Style the viewport container for left side
    viewportContainer.style.cssText = `
        width: 100% !important;
        height: 100% !important;
        border: 2px solid #0d6efd !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 12px rgba(13, 110, 253, 0.3) !important;
        overflow: hidden !important;
    `;
    
    console.log('Split view layout configured');
}

// This function cleans up the UI and removes the class from the body.
// Enhanced exitReportingMode method
exitReportingMode() {
    if (!this.reportingMode) return;
    
    console.log('Exiting reporting mode...');
    this.reportingMode = false;

    // Stop autosave
    this.stopAutosave();
    
    // Remove body class
    document.body.classList.remove('reporting-mode');

    // Remove report editor if it exists
    const reportEditorContainer = document.getElementById('report-editor-container');
    if (reportEditorContainer) {
        reportEditorContainer.remove();
        console.log('Report editor removed');
    }

    // Show original sidebar content
    if (this.originalSidebarContent) {
        this.originalSidebarContent.style.display = 'block';
        console.log('Original sidebar content restored');
    }
    
    // Hide template selector
    if (this.reportingTemplateSelector) {
        this.reportingTemplateSelector.style.display = 'none';
        console.log('Template selector hidden');
    }
    
    // Hide tools panel
    if (this.reportingToolsPanel) {
        this.reportingToolsPanel.style.display = 'none';
        console.log('Tools panel hidden');
    }

    // Remove ESC key listener
    document.removeEventListener('keydown', this.handleEscapeKey.bind(this));

    // Show success message
    if (window.DICOM_VIEWER && window.DICOM_VIEWER.showAISuggestion) {
        window.DICOM_VIEWER.showAISuggestion('Exited reporting mode');
    }

    console.log('Reporting mode exited successfully');
}

    // NEW, STABLE WAY to manage the sidebar without destroying content
prepareSidebarForReporting() {
    if (!this.rightSidebar) {
        console.error('Right sidebar not found');
        return;
    }

    console.log('Preparing sidebar for reporting...');

    // Only create the structure once
    if (!this.originalSidebarContent) {
        // Backup original content
        this.originalSidebarContent = document.createElement('div');
        this.originalSidebarContent.id = 'original-sidebar-content';
        
        // Move all existing content to backup
        while (this.rightSidebar.firstChild) {
            this.originalSidebarContent.appendChild(this.rightSidebar.firstChild);
        }
        this.rightSidebar.appendChild(this.originalSidebarContent);

        // Create template selector
        this.reportingTemplateSelector = document.createElement('div');
        this.reportingTemplateSelector.id = 'reporting-template-selector';
        this.reportingTemplateSelector.style.display = 'none';
        this.reportingTemplateSelector.className = 'h-100 d-flex flex-column';
        this.rightSidebar.appendChild(this.reportingTemplateSelector);

        // Create tools panel
        this.reportingToolsPanel = document.createElement('div');
        this.reportingToolsPanel.id = 'reporting-tools-panel';
        this.reportingToolsPanel.style.display = 'none';
        this.reportingToolsPanel.className = 'h-100';
        this.rightSidebar.appendChild(this.reportingToolsPanel);

        console.log('Sidebar structure created');
    }

    // Update template selector content
    this.reportingTemplateSelector.innerHTML = this.generateTemplateSelectionHTML();
    
    // Attach events after content is updated
    setTimeout(() => {
        this.attachTemplateEvents();
    }, 100);
}

    generateReportingToolsHTML() { /* This is the content for the tools panel */ 
        return `
            <div class="p-3 border-bottom">
                <h6 class="text-light mb-2"><i class="bi bi-file-medical-fill me-2"></i>Report Tools</h6>
                <div class="btn-group w-100 mb-3">
                    <button class="btn btn-sm btn-success" id="quick-save"><i class="bi bi-save me-1"></i>Save</button>
                    <button class="btn btn-sm btn-outline-secondary" id="exit-reporting-sidebar"><i class="bi bi-x-lg"></i></button>
                </div>
                <div class="auto-save-status small"><i class="bi bi-clock me-1"></i>Auto-saving...</div>
            </div>
            <div class="p-3 border-bottom">
                <h6 class="text-light mb-3">Quick Inserts</h6>
                <div class="d-grid gap-1">
                    <button class="btn btn-sm btn-outline-info" data-insert="normal">Normal Study</button>
                    <button class="btn btn-sm btn-outline-warning" data-insert="followup">Recommend Follow-up</button>
                </div>
            </div>
            <div class="p-3">
                <h6 class="text-light mb-3">Report Status</h6>
                <div class="status-item d-flex justify-content-between mb-2"><span class="small">Template:</span><span class="badge bg-primary small">${this.templates[this.currentTemplate]?.name || 'Custom'}</span></div>
                <div class="status-item d-flex justify-content-between mb-2"><span class="small">Last Saved:</span><span class="badge bg-success small" id="last-saved">Never</span></div>
                <div class="status-item d-flex justify-content-between"><span class="small">Word Count:</span><span class="badge bg-info small" id="word-count">0</span></div>
            </div>
        `;
    }
// reporting-system.js



generateTemplateSelectionHTML() {
    const templateCategories = {};
    Object.entries(this.templates).forEach(([key, template]) => {
        if (!templateCategories[template.category]) {
            templateCategories[template.category] = [];
        }
        templateCategories[template.category].push({ key, ...template });
    });

    let gridItemsHTML = '';
    Object.entries(templateCategories).forEach(([category, templates]) => {
        gridItemsHTML += `<h6 class="template-category-header text-primary mb-2"><i class="bi bi-folder me-2"></i>${category}</h6>`;
        templates.forEach(template => {
            gridItemsHTML += `
                <div class="template-card mb-2 p-3 border rounded" data-template="${template.key}" 
                     style="cursor: pointer; background: rgba(255,255,255,0.05); transition: all 0.2s ease;">
                    <div class="template-icon text-center mb-2 fs-4">${this.getTemplateIcon(template.category)}</div>
                    <div class="template-name text-center small text-white">${template.name}</div>
                </div>
            `;
        });
    });

    return `
        <div class="p-3 border-bottom bg-dark">
            <div class="d-flex justify-content-between align-items-center">
                <h6 class="text-light mb-0">
                    <i class="bi bi-file-medical me-2"></i>Select Report Template
                </h6>
                <button class="btn btn-sm btn-outline-light" id="exit-reporting-btn" type="button">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
        </div>
        <div class="template-selection p-3" style="max-height: 70vh; overflow-y: auto;">
            <div class="alert alert-info alert-sm mb-3">
                <i class="bi bi-info-circle me-2"></i>
                Choose a template to start creating your medical report
            </div>
            ${gridItemsHTML}
        </div>
        <div class="p-3 border-top">
            <button class="btn btn-outline-secondary w-100" id="cancel-reporting-btn">
                <i class="bi bi-arrow-left me-2"></i>Cancel
            </button>
        </div>
    `;
}
// 4. Update the exitReportingMode function:
enterReportingMode() {
        if (this.reportingMode) return;
        console.log('Entering reporting mode...');
        this.reportingMode = true;

        this.prepareSidebarForReporting();
        document.body.classList.add('reporting-mode');

        this.reportingTemplateSelector.style.display = 'block';
        this.originalSidebarContent.style.display = 'none';

        console.log('Reporting mode entered. Please select a template.');
    }


// 5. Update the restoreOriginalLayout function:
restoreOriginalLayout() {
    const mainContent = document.getElementById('main-content');
    const viewportContainer = document.getElementById('viewport-container');
    
    if (mainContent && this.originalMainContentStyle !== undefined) {
        mainContent.style.cssText = this.originalMainContentStyle;
    } else if (mainContent) {
        // Fallback to default styles
        mainContent.style.cssText = `
            display: flex;
            flex-direction: column;
            background-color: #000;
        `;
    }
    
    if (viewportContainer && this.originalViewportStyle !== undefined) {
        viewportContainer.style.cssText = this.originalViewportStyle;
    } else if (viewportContainer) {
        // Fallback to default viewport styles
        viewportContainer.style.cssText = '';
    }
    
    console.log('Original layout restored');
}


    // Backup original sidebar content
    backupSidebarContent() {
        const rightSidebar = document.querySelector('.sidebar:last-child');
        if (rightSidebar) {
            this.originalSidebarContent = rightSidebar.innerHTML;
        }
    }

    // Restore original sidebar content
    restoreSidebarContent() {
        const rightSidebar = document.querySelector('.sidebar:last-child');
        if (rightSidebar && this.originalSidebarContent) {
            rightSidebar.innerHTML = this.originalSidebarContent;
            // Reinitialize event handlers if needed
            if (window.DICOM_VIEWER.UIControls) {
                window.DICOM_VIEWER.UIControls.initialize();
            }
        }
    }

    // Show template selection interface
    showTemplateSelection() {
        const rightSidebar = document.querySelector('.sidebar:last-child');
        if (!rightSidebar) return;

        const templateCategories = {};
        Object.entries(this.templates).forEach(([key, template]) => {
            if (!templateCategories[template.category]) {
                templateCategories[template.category] = [];
            }
            templateCategories[template.category].push({ key, ...template });
        });

        rightSidebar.innerHTML = `
            <div class="p-3 border-bottom">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="text-light mb-0">
                        <i class="bi bi-file-medical me-2"></i>Medical Reports
                    </h6>
                    <button class="btn btn-sm btn-outline-secondary" id="exit-reporting">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                
                <div class="alert alert-info alert-sm">
                    <i class="bi bi-info-circle me-2"></i>
                    Select a template to start creating your medical report
                </div>
            </div>

            <div class="template-selection p-3">
                ${Object.entries(templateCategories).map(([category, templates]) => `
                    <div class="template-category mb-4">
                        <h6 class="text-primary mb-3">
                            <i class="bi bi-folder me-2"></i>${category}
                        </h6>
                        <div class="template-grid">
                            ${templates.map(template => `
                                <div class="template-card" data-template="${template.key}">
                                    <div class="template-icon">
                                        ${this.getTemplateIcon(template.category)}
                                    </div>
                                    <div class="template-name">${template.name}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="p-3 border-top">
                <div class="row g-2">
                    <div class="col-6">
                        <button class="btn btn-success btn-sm w-100" id="load-existing-report">
                            <i class="bi bi-folder-open me-2"></i>Load Report
                        </button>
                    </div>
                    <div class="col-6">
                        <button class="btn btn-outline-info btn-sm w-100" id="create-custom-template">
                            <i class="bi bi-plus-circle me-2"></i>Custom
                        </button>
                    </div>
                </div>
            </div>

            <style>
                .template-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                    gap: 10px;
                }
                
                .template-card {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 8px;
                    padding: 15px 10px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .template-card:hover {
                    background: rgba(13, 110, 253, 0.2);
                    border-color: #0d6efd;
                    transform: translateY(-2px);
                }
                
                .template-icon {
                    font-size: 24px;
                    margin-bottom: 8px;
                    color: #0d6efd;
                }
                
                .template-name {
                    font-size: 12px;
                    color: #fff;
                    font-weight: 500;
                }
                
                .template-category h6 {
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    padding-bottom: 5px;
                }
                
                .alert-sm {
                    padding: 8px 12px;
                    font-size: 12px;
                }
            </style>
        `;

        this.attachTemplateEvents();
    }

    // Get appropriate icon for template category
    getTemplateIcon(category) {
        const icons = {
            'CT': '<i class="bi bi-diagram-3"></i>',
            'MRI': '<i class="bi bi-magnet"></i>',
            'X-Ray': '<i class="bi bi-radioactive"></i>',
            'Ultrasound': '<i class="bi bi-soundwave"></i>',
            'Mammography': '<i class="bi bi-gender-female"></i>'
        };
        return icons[category] || '<i class="bi bi-file-medical"></i>';
    }

// Fixed attachTemplateEvents method
attachTemplateEvents() {
    console.log('Attaching template events...');
    
    // Exit reporting mode button (X button)
    const exitBtn = document.getElementById('exit-reporting-btn');
    if (exitBtn) {
        exitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Exit button clicked');
            this.exitReportingMode();
        });
        console.log('Exit button event attached');
    } else {
        console.error('Exit button not found');
    }

    // Cancel button (alternative exit)
    const cancelBtn = document.getElementById('cancel-reporting-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Cancel button clicked');
            this.exitReportingMode();
        });
        console.log('Cancel button event attached');
    }

    // Template selection cards
    const templateCards = document.querySelectorAll('.template-card');
    console.log(`Found ${templateCards.length} template cards`);
    
    templateCards.forEach(card => {
        // Add hover effects
        card.addEventListener('mouseenter', () => {
            card.style.background = 'rgba(13, 110, 253, 0.2)';
            card.style.transform = 'translateY(-2px)';
            card.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.background = 'rgba(255,255,255,0.05)';
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = 'none';
        });
        
        // Template selection
        card.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const templateKey = card.dataset.template;
            console.log(`Template selected: ${templateKey}`);
            
            // Visual feedback
            card.style.background = 'rgba(40, 167, 69, 0.3)';
            
            setTimeout(() => {
                this.selectTemplate(templateKey);
            }, 200);
        });
    });

    // ESC key to exit
    document.addEventListener('keydown', this.handleEscapeKey.bind(this));
}

// Add this method to handle ESC key
handleEscapeKey(event) {
    if (event.key === 'Escape' && this.reportingMode) {
        // Only handle ESC if we're in template selection mode
        const templateSelector = document.getElementById('reporting-template-selector');
        if (templateSelector && templateSelector.style.display !== 'none') {
            event.preventDefault();
            console.log('ESC key pressed - exiting reporting mode');
            this.exitReportingMode();
        }
    }
}

selectTemplate(templateKey) {
        const template = this.templates[templateKey];
        if (!template) return;

        this.currentTemplate = templateKey;
        this.reportData = this.initializeReportData(template);
        
        console.log(`Selected template: ${template.name}`);
        this.showReportEditor(template);
        this.startAutosave();
    }

    // Initialize report data structure
    initializeReportData(template) {
        const data = {
            templateKey: this.currentTemplate,
            patientInfo: this.getCurrentPatientInfo(),
            studyInfo: this.getCurrentStudyInfo(),
            timestamp: new Date().toISOString(),
            sections: {}
        };

        // Initialize sections from template
        Object.entries(template.sections).forEach(([key, value]) => {
            if (typeof value === 'object') {
                data.sections[key] = {};
                Object.entries(value).forEach(([subKey, subValue]) => {
                    data.sections[key][subKey] = subValue;
                });
            } else {
                data.sections[key] = value;
            }
        });

        return data;
    }

    // Get current patient information
    getCurrentPatientInfo() {
        const state = window.DICOM_VIEWER.STATE;
        const currentImage = state.currentSeriesImages[state.currentImageIndex];
        
        return {
            name: currentImage?.patient_name || 'Unknown Patient',
            id: currentImage?.patient_id || 'Unknown ID',
            studyDate: currentImage?.study_date || new Date().toISOString().split('T')[0],
            modality: currentImage?.modality || 'Unknown',
            studyDescription: currentImage?.study_description || 'Medical Study'
        };
    }

    // Get current study information
    getCurrentStudyInfo() {
        const state = window.DICOM_VIEWER.STATE;
        return {
            totalImages: state.totalImages,
            currentImageIndex: state.currentImageIndex,
            seriesCount: state.currentSeriesImages.length,
            fileName: state.currentSeriesImages[state.currentImageIndex]?.file_name || 'Unknown'
        };
    }

// This function now creates the report editor in the correct place
    showReportEditor(template) {
        console.log('Creating report editor for template:', template.name);

        const existingEditor = document.getElementById('report-editor-container');
        if (existingEditor) existingEditor.remove();

        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;

        const reportEditorContainer = document.createElement('div');
        reportEditorContainer.id = 'report-editor-container';
        reportEditorContainer.innerHTML = this.generateReportEditorHTML(template);
        mainContent.appendChild(reportEditorContainer);

        this.attachEditorEvents();

        // Switch sidebar from template selection to reporting tools
        this.updateSidebarForReporting();
        this.reportingTemplateSelector.style.display = 'none';
        this.reportingToolsPanel.style.display = 'block';
    }

// Replace the generateReportEditorHTML function in reporting-system.js with this fixed version

generateReportEditorHTML(template) {
    // Safely get patient info with fallbacks
    let patientInfo = {};
    
    // Try to get patient info from multiple sources
    if (this.reportData && this.reportData.patientInfo) {
        patientInfo = this.reportData.patientInfo;
    } else if (this.reportData) {
        // Extract patient info from the report data itself
        patientInfo = {
            name: this.reportData.patientName || 'Unknown Patient',
            id: this.reportData.patientId || 'Unknown ID',
            studyDate: this.reportData.studyDate || new Date().toISOString().split('T')[0],
            modality: this.reportData.modality || 'Unknown',
            studyDescription: this.reportData.studyDescription || 'Medical Study'
        };
    } else {
        // Get current patient info from the DICOM viewer state
        const currentPatientInfo = this.getCurrentPatientInfo();
        patientInfo = currentPatientInfo || {
            name: 'Unknown Patient',
            id: 'Unknown ID', 
            studyDate: new Date().toISOString().split('T')[0],
            modality: 'Unknown',
            studyDescription: 'Medical Study'
        };
    }
    
    return `
        <div class="report-editor-content" style="height: 100%; display: flex; flex-direction: column;">
            <!-- Header -->
            <div class="report-header" style="flex-shrink: 0; padding: 15px; border-bottom: 1px solid #444; background: #2a2a2a;">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="mb-0 text-white">
                        <i class="bi bi-file-medical-fill text-success me-2"></i>
                        ${template.name}
                    </h6>
                    <div class="report-actions">
                        <button class="btn btn-sm btn-success me-1" id="save-report" title="Save Report">
                            <i class="bi bi-save"></i>
                        </button>
                        <button class="btn btn-sm btn-info me-1" id="export-report" title="Export PDF">
                            <i class="bi bi-download"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" id="close-report-editor" title="Close">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Patient Summary -->
                <div class="patient-summary p-2 rounded small" style="background: rgba(40, 167, 69, 0.1); border: 1px solid rgba(40, 167, 69, 0.3);">
                    <div class="row g-1 text-white">
                        <div class="col-6"><strong>Patient:</strong> ${patientInfo.name || 'Unknown'}</div>
                        <div class="col-6"><strong>ID:</strong> ${patientInfo.id || 'Unknown'}</div>
                        <div class="col-6"><strong>Date:</strong> ${patientInfo.studyDate || 'Unknown'}</div>
                        <div class="col-6"><strong>Modality:</strong> ${patientInfo.modality || 'Unknown'}</div>
                    </div>
                </div>
            </div>

            <!-- Report Content -->
            <div class="report-content" style="flex: 1; overflow-y: auto; padding: 15px;">
                ${this.generateSectionFields(template.sections)}
            </div>

            <!-- Footer -->
            <div class="report-footer" style="flex-shrink: 0; padding: 15px; border-top: 1px solid #444; background: #2a2a2a;">
                <div class="row g-2">
                    <div class="col-6">
                        <label class="form-label small text-white">Physician:</label>
                        <input type="text" class="form-control form-control-sm" id="reporting-physician" 
                               placeholder="Dr. Name" value="${this.reportData?.reportingPhysician || ''}"
                               style="background: rgba(255,255,255,0.1); border: 1px solid #555; color: white;">
                    </div>
                    <div class="col-6">
                        <label class="form-label small text-white">Date:</label>
                        <input type="datetime-local" class="form-control form-control-sm" id="report-datetime" 
                               value="${this.reportData?.reportDateTime || new Date().toISOString().slice(0, 16)}"
                               style="background: rgba(255,255,255,0.1); border: 1px solid #555; color: white;">
                    </div>
                </div>
            </div>
        </div>
    `;
}


    // Generate form fields for report sections
    generateSectionFields(sections) {
        return Object.entries(sections).map(([sectionKey, sectionValue]) => {
            if (typeof sectionValue === 'object') {
                return `
                    <div class="section-group">
                        <div class="section-header">
                            <i class="bi bi-chevron-right me-2"></i>
                            ${this.formatSectionName(sectionKey)}
                        </div>
                        <div class="section-content">
                            ${Object.entries(sectionValue).map(([subKey, subValue]) => `
                                <div class="mb-3">
                                    <label class="subsection-label">${this.formatSectionName(subKey)}:</label>
                                    <textarea class="form-control" rows="3" 
                                            data-section="${sectionKey}" 
                                            data-subsection="${subKey}"
                                            placeholder="${subValue}">${subValue}</textarea>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="section-group">
                        <div class="section-header">
                            <i class="bi bi-chevron-right me-2"></i>
                            ${this.formatSectionName(sectionKey)}
                        </div>
                        <div class="section-content">
                            <textarea class="form-control" rows="${sectionKey === 'impression' ? '4' : '2'}" 
                                    data-section="${sectionKey}"
                                    placeholder="${sectionValue}">${sectionValue}</textarea>
                        </div>
                    </div>
                `;
            }
        }).join('');
    }

    // Format section names for display
    formatSectionName(name) {
        return name.replace(/_/g, ' ')
                  .replace(/\b\w/g, l => l.toUpperCase());
    }

    // Update sidebar for reporting mode
updateSidebarForReporting() {
        if (!this.reportingToolsPanel) return;
        this.reportingToolsPanel.innerHTML = this.generateReportingToolsHTML();
        this.attachSidebarEvents();
    }

attachEditorEvents() {
    // Save report
    document.getElementById('save-report')?.addEventListener('click', () => {
        this.saveReport();
    });

    // Export report
    document.getElementById('export-report')?.addEventListener('click', () => {
        this.exportReport();
    });

    // Close report editor
    document.getElementById('close-report-editor')?.addEventListener('click', () => {
        this.exitReportingMode();
    });

    // Auto-update report data on text changes
    document.querySelectorAll('.report-content textarea, .report-content input').forEach(field => {
        field.addEventListener('input', () => {
            this.updateReportData();
            this.updateWordCount();
        });
    });

    // Physician and datetime fields
    document.getElementById('reporting-physician')?.addEventListener('input', () => {
        this.updateReportData();
    });

    document.getElementById('report-datetime')?.addEventListener('change', () => {
        this.updateReportData();
    });
}


    // Attach sidebar event handlers
    attachSidebarEvents() {
        // Quick save
        document.getElementById('quick-save')?.addEventListener('click', () => {
            this.saveReport();
        });

        // Exit reporting
        document.getElementById('exit-reporting-sidebar')?.addEventListener('click', () => {
            this.exitReportingMode();
        });

        // Quick insert buttons
        document.querySelectorAll('[data-insert]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.insertQuickText(btn.dataset.insert);
            });
        });

        // Common phrases
        document.querySelectorAll('[data-phrase]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.insertCommonPhrase(btn.dataset.phrase);
            });
        });
    }

    // Update report data from form fields
    updateReportData() {
        const textareas = document.querySelectorAll('.report-content textarea');
        
        textareas.forEach(textarea => {
            const section = textarea.dataset.section;
            const subsection = textarea.dataset.subsection;
            
            if (subsection) {
                if (!this.reportData.sections[section]) {
                    this.reportData.sections[section] = {};
                }
                this.reportData.sections[section][subsection] = textarea.value;
            } else {
                this.reportData.sections[section] = textarea.value;
            }
        });

        // Update physician and datetime
        const physician = document.getElementById('reporting-physician');
        const datetime = document.getElementById('report-datetime');
        if (physician) {
            this.reportData.reportingPhysician = physician.value;
        }
        if (datetime) {
            this.reportData.reportDateTime = datetime.value;
        }

        this.reportData.lastModified = new Date().toISOString();
    }

    // Update word count display
    updateWordCount() {
        const textareas = document.querySelectorAll('.report-content textarea');
        let totalWords = 0;
        
        textareas.forEach(textarea => {
            const words = textarea.value.trim().split(/\s+/).filter(word => word.length > 0);
            totalWords += words.length;
        });

        const wordCountElement = document.getElementById('word-count');
        if (wordCountElement) {
            wordCountElement.textContent = totalWords;
        }
    }

    // Insert quick text templates
    insertQuickText(type) {
        const templates = {
            'normal': 'No acute abnormalities identified. Study within normal limits.',
            'followup': 'Recommend clinical correlation and follow-up as clinically indicated.',
            'urgent': 'URGENT: Findings require immediate clinical attention.',
            'correlation': 'Clinical correlation recommended to exclude underlying pathology.'
        };

        const text = templates[type];
        if (text) {
            this.insertTextAtCursor(text);
        }
    }

    // Insert common medical phrases
    insertCommonPhrase(phrase) {
        const phrases = {
            'unremarkable': 'unremarkable',
            'within_normal': 'within normal limits',
            'no_acute': 'no acute findings',
            'stable': 'stable in appearance compared to prior study'
        };

        const text = phrases[phrase];
        if (text) {
            this.insertTextAtCursor(text);
        }
    }

    // Insert text at cursor position
    insertTextAtCursor(text) {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === 'TEXTAREA') {
            const start = activeElement.selectionStart;
            const end = activeElement.selectionEnd;
            const value = activeElement.value;
            
            activeElement.value = value.substring(0, start) + text + value.substring(end);
            activeElement.selectionStart = activeElement.selectionEnd = start + text.length;
            activeElement.focus();
            
            // Trigger input event to update data
            activeElement.dispatchEvent(new Event('input'));
        }
    }

    // Start auto-save functionality
    startAutosave() {
        this.stopAutosave(); // Clear any existing interval
        
        this.autosaveInterval = setInterval(() => {
            this.autoSaveReport();
        }, 30000); // Auto-save every 30 seconds
    }

    // Stop auto-save
    stopAutosave() {
        if (this.autosaveInterval) {
            clearInterval(this.autosaveInterval);
            this.autosaveInterval = null;
        }
    }

    // Auto-save report
// Replace the saveReport method in reporting-system.js with this fixed version
async saveReport() {
    try {
        this.updateReportData();
        
        // Show saving indicator immediately
        const saveBtn = document.getElementById('save-report');
        const quickSaveBtn = document.getElementById('quick-save');
        
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Saving...';
            saveBtn.disabled = true;
        }
        if (quickSaveBtn) {
            quickSaveBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Saving...';
            quickSaveBtn.disabled = true;
        }
        
        const result = await this.saveReportToServer(false);
        
        // Show success alert
        this.showSaveSuccessAlert(result);
        
        // Update last saved indicator
        const lastSavedElement = document.getElementById('last-saved');
        if (lastSavedElement) {
            lastSavedElement.textContent = new Date().toLocaleTimeString();
        }
        
        console.log('Report saved successfully:', result);
        
    } catch (error) {
        console.error('Save failed:', error);
        
        // Show error alert
        this.showSaveErrorAlert(error.message);
        
    } finally {
        // Restore button states
        const saveBtn = document.getElementById('save-report');
        const quickSaveBtn = document.getElementById('quick-save');
        
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="bi bi-save"></i>';
            saveBtn.disabled = false;
        }
        if (quickSaveBtn) {
            quickSaveBtn.innerHTML = '<i class="bi bi-floppy me-1"></i>Save';
            quickSaveBtn.disabled = false;
        }
    }
}

// Add this new method to show success alerts
showSaveSuccessAlert(result) {
    // Create success alert
    const alertHtml = `
        <div class="alert alert-success alert-dismissible fade show position-fixed" 
             style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;" 
             role="alert">
            <i class="bi bi-check-circle-fill me-2"></i>
            <strong>Report Saved Successfully!</strong><br>
            <small>Version ${result.version || 1} saved at ${new Date().toLocaleTimeString()}</small>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    // Remove any existing alerts
    document.querySelectorAll('.save-success-alert').forEach(alert => alert.remove());
    
    // Add new alert
    const alertElement = document.createElement('div');
    alertElement.className = 'save-success-alert';
    alertElement.innerHTML = alertHtml;
    document.body.appendChild(alertElement);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        const alert = alertElement.querySelector('.alert');
        if (alert) {
            alert.classList.remove('show');
            setTimeout(() => alertElement.remove(), 150);
        }
    }, 4000);
    
    // Also show in AI suggestions
    if (window.DICOM_VIEWER && window.DICOM_VIEWER.showAISuggestion) {
        window.DICOM_VIEWER.showAISuggestion(
            `Medical report saved successfully! Version ${result.version || 1} - ${result.filename || 'report.json'}`
        );
    }
}

// Add this new method to show error alerts
showSaveErrorAlert(errorMessage) {
    const alertHtml = `
        <div class="alert alert-danger alert-dismissible fade show position-fixed" 
             style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;" 
             role="alert">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            <strong>Save Failed!</strong><br>
            <small>${errorMessage}</small>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    // Remove any existing error alerts
    document.querySelectorAll('.save-error-alert').forEach(alert => alert.remove());
    
    // Add new alert
    const alertElement = document.createElement('div');
    alertElement.className = 'save-error-alert';
    alertElement.innerHTML = alertHtml;
    document.body.appendChild(alertElement);
    
    // Auto-remove after 6 seconds (longer for errors)
    setTimeout(() => {
        const alert = alertElement.querySelector('.alert');
        if (alert) {
            alert.classList.remove('show');
            setTimeout(() => alertElement.remove(), 150);
        }
    }, 6000);
    
    // Also show in AI suggestions
    if (window.DICOM_VIEWER && window.DICOM_VIEWER.showAISuggestion) {
        window.DICOM_VIEWER.showAISuggestion(`Failed to save report: ${errorMessage}`);
    }
}

    // Save report manually
    async saveReport() {
        try {
            this.updateReportData();
            await this.saveReportToServer(false);
            
            // Show success message
            window.DICOM_VIEWER.showAISuggestion('Report saved successfully!');
            
            const lastSavedElement = document.getElementById('last-saved');
            if (lastSavedElement) {
                lastSavedElement.textContent = new Date().toLocaleTimeString();
            }
        } catch (error) {
            console.error('Save failed:', error);
            window.DICOM_VIEWER.showAISuggestion('Failed to save report. Please try again.');
        }
    }

// 1. Update the saveReportToServer function to use correct paths:
async saveReportToServer(isAutoSave = false) {
    const state = window.DICOM_VIEWER.STATE;
    const currentImage = state.currentSeriesImages[state.currentImageIndex];
    
    if (!currentImage) {
        throw new Error('No current image to save report for');
    }

    // Get physician and datetime values
    const physicianElement = document.getElementById('reporting-physician');
    const datetimeElement = document.getElementById('report-datetime');
    
    const reportData = {
        ...this.reportData,
        imageId: currentImage.id,
        patientName: currentImage.patient_name,
        studyDescription: currentImage.study_description,
        isAutoSave: isAutoSave,
        reportingPhysician: physicianElement ? physicianElement.value : '',
        reportDateTime: datetimeElement ? datetimeElement.value : new Date().toISOString()
    };

    console.log('Saving report data:', reportData);

    // Use relative path without 'php/' prefix
    const response = await fetch('save_report.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportData)
    });

    const responseText = await response.text();
    console.log('Server response:', response.status, responseText);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${responseText}`);
    }

    let result;
    try {
        result = JSON.parse(responseText);
    } catch (e) {
        throw new Error(`Invalid JSON response: ${responseText}`);
    }

    if (!result.success) {
        throw new Error(result.message || 'Unknown error saving report');
    }

    return result;
}


// Replace the loadExistingReport method in reporting-system.js with this fixed version
async loadExistingReport() {
    try {
        const state = window.DICOM_VIEWER.STATE;
        const currentImage = state.currentSeriesImages[state.currentImageIndex];
        
        if (!currentImage) {
            window.DICOM_VIEWER.showAISuggestion('No current image selected');
            return;
        }

        // Show loading indicator
        window.DICOM_VIEWER.showLoadingIndicator('Loading existing report...');

        console.log('Loading report for image ID:', currentImage.id);

        const response = await fetch(`load_report.php?imageId=${currentImage.id}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const responseText = await response.text();
        console.log('Load report response:', responseText);
        
        // Clean response to handle any PHP warnings/notices
        const cleanedResponse = this.cleanJSONResponse(responseText);
        
        let result;
        try {
            result = JSON.parse(cleanedResponse);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('Response was:', responseText);
            throw new Error(`Invalid JSON response: ${cleanedResponse.substring(0, 100)}...`);
        }

        console.log('Parsed load result:', result);

        if (result && result.success && result.report) {
            // Report found and loaded
            this.reportData = result.report;
            this.currentTemplate = result.report.templateKey || 'custom';
            
            const template = this.templates[this.currentTemplate];
            if (template) {
                // Enter reporting mode and show the loaded report
                this.showReportEditor(template);
                this.populateReportFields(result.report);
                
                // Show success message with report details
                const reportInfo = `Loaded report v${result.report.version || 1} from ${new Date(result.report.lastModified).toLocaleString()}`;
                this.showLoadSuccessAlert(reportInfo);
                
                console.log('Report loaded successfully:', result.report);
            } else {
                throw new Error(`Report template '${this.currentTemplate}' not found`);
            }
        } else {
            // No report found
            if (result && result.message) {
                window.DICOM_VIEWER.showAISuggestion(`No existing report found: ${result.message}`);
            } else {
                window.DICOM_VIEWER.showAISuggestion('No existing report found for this study. Create a new report instead.');
            }
        }
    } catch (error) {
        console.error('Failed to load report:', error);
        
        // Show detailed error message
        const errorMsg = error.message || 'Unknown error occurred';
        this.showLoadErrorAlert(errorMsg);
        
    } finally {
        window.DICOM_VIEWER.hideLoadingIndicator();
    }
}

// Add this new method to show load success alerts
showLoadSuccessAlert(reportInfo) {
    const alertHtml = `
        <div class="alert alert-info alert-dismissible fade show position-fixed" 
             style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;" 
             role="alert">
            <i class="bi bi-file-earmark-check-fill me-2"></i>
            <strong>Report Loaded Successfully!</strong><br>
            <small>${reportInfo}</small>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    // Remove any existing alerts
    document.querySelectorAll('.load-success-alert').forEach(alert => alert.remove());
    
    // Add new alert
    const alertElement = document.createElement('div');
    alertElement.className = 'load-success-alert';
    alertElement.innerHTML = alertHtml;
    document.body.appendChild(alertElement);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        const alert = alertElement.querySelector('.alert');
        if (alert) {
            alert.classList.remove('show');
            setTimeout(() => alertElement.remove(), 150);
        }
    }, 4000);
}

// Add this new method to show load error alerts
showLoadErrorAlert(errorMessage) {
    const alertHtml = `
        <div class="alert alert-warning alert-dismissible fade show position-fixed" 
             style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;" 
             role="alert">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            <strong>Load Failed!</strong><br>
            <small>${errorMessage}</small>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    // Remove any existing error alerts
    document.querySelectorAll('.load-error-alert').forEach(alert => alert.remove());
    
    // Add new alert
    const alertElement = document.createElement('div');
    alertElement.className = 'load-error-alert';
    alertElement.innerHTML = alertHtml;
    document.body.appendChild(alertElement);
    
    // Auto-remove after 6 seconds
    setTimeout(() => {
        const alert = alertElement.querySelector('.alert');
        if (alert) {
            alert.classList.remove('show');
            setTimeout(() => alertElement.remove(), 150);
        }
    }, 6000);
}


    // Populate report fields with loaded data
// Replace the populateReportFields function in reporting-system.js with this fixed version

populateReportFields(reportData) {
    console.log('Populating report fields with data:', reportData);
    
    // Populate text areas for report sections
    if (reportData.sections) {
        Object.entries(reportData.sections).forEach(([sectionKey, sectionValue]) => {
            if (typeof sectionValue === 'object' && sectionValue !== null) {
                // Handle nested sections (like findings with subsections)
                Object.entries(sectionValue).forEach(([subKey, subValue]) => {
                    const textarea = document.querySelector(`textarea[data-section="${sectionKey}"][data-subsection="${subKey}"]`);
                    if (textarea) {
                        textarea.value = subValue || '';
                        console.log(`Populated ${sectionKey}.${subKey} with: ${subValue}`);
                    }
                });
            } else {
                // Handle simple sections
                const textarea = document.querySelector(`textarea[data-section="${sectionKey}"]`);
                if (textarea) {
                    textarea.value = sectionValue || '';
                    console.log(`Populated ${sectionKey} with: ${sectionValue}`);
                }
            }
        });
    }

    // Populate physician field
    const physicianField = document.getElementById('reporting-physician');
    if (physicianField) {
        const physicianValue = reportData.reportingPhysician || 
                              reportData.physician || 
                              reportData.reportingDoctor || '';
        physicianField.value = physicianValue;
        console.log('Populated physician field:', physicianValue);
    }
    
    // Populate datetime field
    const datetimeField = document.getElementById('report-datetime');
    if (datetimeField) {
        let datetimeValue = reportData.reportDateTime || 
                           reportData.reportDate || 
                           reportData.lastModified || 
                           new Date().toISOString();
        
        // Ensure proper datetime-local format (YYYY-MM-DDTHH:MM)
        if (datetimeValue) {
            try {
                const date = new Date(datetimeValue);
                datetimeValue = date.toISOString().slice(0, 16);
            } catch (e) {
                datetimeValue = new Date().toISOString().slice(0, 16);
            }
        }
        
        datetimeField.value = datetimeValue;
        console.log('Populated datetime field:', datetimeValue);
    }

    // Show report version info if available
    if (reportData.version || reportData.lastModified) {
        this.showReportVersionInfo(reportData);
    }
}

// Add this helper function to show report version info
showReportVersionInfo(reportData) {
    const header = document.querySelector('.report-header');
    if (!header) return;
    
    let versionInfo = header.querySelector('.version-info');
    if (!versionInfo) {
        versionInfo = document.createElement('div');
        versionInfo.className = 'version-info mt-1';
        header.appendChild(versionInfo);
    }
    
    const version = reportData.version || 1;
    const lastModified = reportData.lastModified ? new Date(reportData.lastModified).toLocaleString() : 'Unknown';
    const physician = reportData.reportingPhysician || 'Unknown';
    
    versionInfo.innerHTML = `
        <small class="text-info">
            <i class="bi bi-info-circle me-1"></i>
            Version ${version} • Last modified: ${lastModified} • By: ${physician}
        </small>
    `;
}

    // Export report to PDF/DOC
    exportReport() {
        this.updateReportData();
        
        const reportContent = this.generatePrintableReport();
        const printWindow = window.open('', '_blank');
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Medical Report - ${this.reportData.patientInfo.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                    .patient-info { background: #f5f5f5; padding: 10px; margin-bottom: 20px; }
                    .section { margin-bottom: 20px; }
                    .section-title { font-weight: bold; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; }
                    .subsection { margin-left: 20px; margin-bottom: 10px; }
                    .subsection-title { font-weight: bold; color: #666; margin-bottom: 5px; }
                    .footer { border-top: 1px solid #ccc; padding-top: 10px; margin-top: 30px; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                ${reportContent}
            </body>
            </html>
        `);
        
        printWindow.document.close();
        
        // Auto-trigger print dialog
        setTimeout(() => {
            printWindow.print();
        }, 500);
    }

    // Generate printable report HTML
    generatePrintableReport() {
        const template = this.templates[this.currentTemplate];
        const patientInfo = this.reportData.patientInfo;
        
        let html = `
            <div class="header">
                <h1>RADIOLOGY REPORT</h1>
                <h2>${template.name}</h2>
            </div>
            
            <div class="patient-info">
                <div><strong>Patient Name:</strong> ${patientInfo.name}</div>
                <div><strong>Patient ID:</strong> ${patientInfo.id}</div>
                <div><strong>Study Date:</strong> ${patientInfo.studyDate}</div>
                <div><strong>Modality:</strong> ${patientInfo.modality}</div>
                <div><strong>Study Description:</strong> ${patientInfo.studyDescription}</div>
            </div>
        `;

        // Add sections
        Object.entries(this.reportData.sections || {}).forEach(([sectionKey, sectionValue]) => {
            html += `<div class="section">`;
            html += `<div class="section-title">${this.formatSectionName(sectionKey).toUpperCase()}</div>`;
            
            if (typeof sectionValue === 'object') {
                Object.entries(sectionValue).forEach(([subKey, subValue]) => {
                    html += `
                        <div class="subsection">
                            <div class="subsection-title">${this.formatSectionName(subKey)}:</div>
                            <div>${subValue.replace(/\n/g, '<br>')}</div>
                        </div>
                    `;
                });
            } else {
                html += `<div>${sectionValue.replace(/\n/g, '<br>')}</div>`;
            }
            
            html += `</div>`;
        });

        // Add footer
        html += `
            <div class="footer">
                <div><strong>Reporting Physician:</strong> ${this.reportData.reportingPhysician || 'Not specified'}</div>
                <div><strong>Report Date/Time:</strong> ${this.reportData.reportDateTime || new Date().toLocaleString()}</div>
                <div><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
            </div>
        `;

        return html;
    }

    // Print report
    printReport() {
        this.exportReport(); // Export function already handles printing
    }

    // Create custom template
    createCustomTemplate() {
        const customTemplate = {
            name: 'Custom Report',
            category: 'Custom',
            sections: {
                indication: 'Clinical indication for the study',
                technique: 'Imaging technique and parameters',
                findings: 'Detailed findings and observations',
                impression: 'IMPRESSION:\n1. '
            }
        };

        this.currentTemplate = 'custom';
        this.templates['custom'] = customTemplate;
        this.reportData = this.initializeReportData(customTemplate);
        
        this.showReportEditor(customTemplate);
        this.startAutosave();
    }

    // Adjust viewport layout for reporting
    adjustViewportLayout() {
        // Switch to a layout that works well with split view
        if (window.DICOM_VIEWER.MANAGERS.viewportManager.currentLayout === '2x2') {
            window.DICOM_VIEWER.MANAGERS.viewportManager.switchLayout('1x1');
        }
    }

    // Restore viewport layout
    restoreViewportLayout() {
        // Restore to 2x2 if MPR is enabled
        const state = window.DICOM_VIEWER.STATE;
        if (state.mprEnabled && state.currentSeriesImages.length > 1) {
            window.DICOM_VIEWER.MANAGERS.viewportManager.switchLayout('2x2');
        }
    }

    // Check if report exists for current study
// Update the checkExistingReport method:
async checkExistingReport() {
    try {
        const state = window.DICOM_VIEWER.STATE;
        const currentImage = state.currentSeriesImages[state.currentImageIndex];
        
        if (!currentImage) return false;

        const response = await fetch(`check_report.php?imageId=${currentImage.id}`);
        
        if (!response.ok) {
            console.warn(`Check report failed: HTTP ${response.status}`);
            return false;
        }
        
        const responseText = await response.text();
        const cleanedResponse = this.cleanJSONResponse(responseText); // Use this.cleanJSONResponse
        
        let result;
        try {
            result = JSON.parse(cleanedResponse);
        } catch (parseError) {
            console.warn('JSON parse error in checkExistingReport:', parseError);
            console.warn('Raw response:', responseText);
            return false;
        }

        return result && result.success && result.exists;
    } catch (error) {
        console.error('Failed to check existing report:', error);
        return false;
    }
}


// Enhanced Report UI - Add these functions to your reporting-system.js

// 1. Add report status indicator to each series item
async addReportIndicatorToSeries(fileId) {
    try {
        const response = await fetch(`check_report.php?imageId=${fileId}`);
        const result = await response.json();
        
        if (result.success && result.exists) {
            const seriesItem = document.querySelector(`[data-file-id="${fileId}"]`);
            if (seriesItem && !seriesItem.querySelector('.report-exists-indicator')) {
                const indicator = document.createElement('div');
                indicator.className = 'report-exists-indicator';
                indicator.innerHTML = `
                    <i class="bi bi-file-medical-fill text-success"></i>
                    <span class="small text-success">Report Available</span>
                `;
                indicator.style.cssText = `
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    background: rgba(40, 167, 69, 0.9);
                    color: white;
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-size: 9px;
                    z-index: 10;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 2px;
                `;
                
                // Make the series item container relative
                seriesItem.style.position = 'relative';
                seriesItem.appendChild(indicator);
                
                // Add click handler to load report
                indicator.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.loadReportForImage(fileId);
                });
                
                console.log(`Added report indicator for file: ${fileId}`);
            }
        }
    } catch (error) {
        console.error(`Failed to check report for ${fileId}:`, error);
    }
}

// 2. Create floating "View Report" button for current image
createViewReportButton() {
    // Remove existing button
    const existingBtn = document.getElementById('view-report-floating-btn');
    if (existingBtn) existingBtn.remove();
    
    const button = document.createElement('button');
    button.id = 'view-report-floating-btn';
    button.className = 'btn btn-success floating-report-btn';
    button.innerHTML = `
        <i class="bi bi-file-earmark-text-fill me-2"></i>
        View Report
    `;
    button.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 20px;
        z-index: 1000;
        border-radius: 25px;
        padding: 10px 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
        display: none;
        font-weight: 600;
    `;
    
    button.addEventListener('click', () => {
        this.loadCurrentImageReport();
    });
    
    document.body.appendChild(button);
    return button;
}

// 3. Add report menu to the main navigation
addReportMenu() {
    const exportBtn = document.getElementById('exportBtn');
    if (!exportBtn) return;
    
    // Create report dropdown if it doesn't exist
    let reportDropdown = document.getElementById('reportDropdown');
    if (!reportDropdown) {
        const reportContainer = document.createElement('div');
        reportContainer.className = 'btn-group';
        reportContainer.innerHTML = `
            <button class="btn btn-info dropdown-toggle" type="button" 
                    id="reportDropdown" data-bs-toggle="dropdown">
                <i class="bi bi-file-medical me-2"></i>Reports
            </button>
            <ul class="dropdown-menu" id="reportDropdownMenu">
                <li><a class="dropdown-item" href="#" id="createNewReport">
                    <i class="bi bi-plus-circle me-2"></i>Create New Report
                </a></li>
                <li><a class="dropdown-item" href="#" id="viewCurrentReport">
                    <i class="bi bi-eye me-2"></i>View Current Report
                </a></li>
                <li><a class="dropdown-item" href="#" id="listAllReports">
                    <i class="bi bi-list-ul me-2"></i>List All Reports
                </a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item" href="#" id="exportCurrentReport">
                    <i class="bi bi-download me-2"></i>Export Current Report
                </a></li>
            </ul>
        `;
        
        // Insert before export button
        exportBtn.parentNode.insertBefore(reportContainer, exportBtn);
        
        // Add event listeners
        this.attachReportMenuEvents();
    }
}

// 4. Attach event listeners for report menu
attachReportMenuEvents() {
    document.getElementById('createNewReport')?.addEventListener('click', (e) => {
        e.preventDefault();
        this.enterReportingMode();
    });
    
    document.getElementById('viewCurrentReport')?.addEventListener('click', (e) => {
        e.preventDefault();
        this.loadCurrentImageReport();
    });
    
    document.getElementById('listAllReports')?.addEventListener('click', (e) => {
        e.preventDefault();
        this.showAllReportsModal();
    });
    
    document.getElementById('exportCurrentReport')?.addEventListener('click', (e) => {
        e.preventDefault();
        this.exportCurrentReport();
    });
}

// 5. Load report for current image
async loadCurrentImageReport() {
    const state = window.DICOM_VIEWER.STATE;
    const currentImage = state.currentSeriesImages[state.currentImageIndex];
    
    if (!currentImage) {
        window.DICOM_VIEWER.showAISuggestion('No image selected');
        return;
    }
    
    await this.loadReportForImage(currentImage.id);
}

// 6. Load report for specific image
async loadReportForImage(imageId) {
    try {
        window.DICOM_VIEWER.showLoadingIndicator('Loading report...');
        
        console.log(`Loading report for image ID: ${imageId}`);
        
        const response = await fetch(`load_report.php?imageId=${imageId}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const responseText = await response.text();
        console.log('Load report response:', responseText);
        
        // Clean response to handle any PHP warnings
        const cleanedResponse = this.cleanJSONResponse(responseText);
        
        let result;
        try {
            result = JSON.parse(cleanedResponse);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            throw new Error(`Invalid JSON response from server`);
        }
        
        console.log('Parsed result:', result);
        
        if (result.success && result.report) {
            // Store the loaded report data
            this.reportData = result.report;
            this.currentTemplate = result.report.templateKey || 'custom';
            
            const template = this.templates[this.currentTemplate];
            if (!template) {
                throw new Error(`Template '${this.currentTemplate}' not found`);
            }
            
            console.log(`Report found. Template: ${this.currentTemplate}`);
            
            // Enter reporting mode if not already in it
            if (!this.reportingMode) {
                this.enterReportingMode();
                
                // Wait for reporting mode to initialize
                await new Promise(resolve => setTimeout(resolve, 800));
            }
            
            // Show the report editor with loaded data
            this.showReportEditor(template);
            
            // Wait a moment for DOM to be ready, then populate fields
            setTimeout(() => {
                this.populateReportFields(result.report);
                
                // Set as read-only initially for viewing
                this.setReportReadOnlyMode(true);
                
                // Show success message
                this.showLoadSuccessAlert(`Report loaded - Version ${result.report.version || 1}`);
                
                console.log('Report loaded and displayed successfully');
            }, 300);
            
        } else {
            // No report found
            console.log('No report found for this image');
            this.showNoReportFoundDialog(imageId);
        }
        
    } catch (error) {
        console.error('Error loading report:', error);
        this.showLoadErrorAlert(error.message);
        
    } finally {
        window.DICOM_VIEWER.hideLoadingIndicator();
    }
}

// 7. Show dialog when no report is found
showNoReportFoundDialog(imageId) {
    const modalHtml = `
        <div class="modal fade" id="noReportModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content bg-dark text-light">
                    <div class="modal-header">
                        <h5 class="modal-title">No Report Found</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>No medical report exists for this image yet.</p>
                        <p>Would you like to create a new report?</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="createNewReportBtn">
                            <i class="bi bi-plus-circle me-2"></i>Create New Report
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('noReportModal');
    if (existingModal) existingModal.remove();
    
    // Add new modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('noReportModal'));
    modal.show();
    
    // Handle create button
    document.getElementById('createNewReportBtn').addEventListener('click', () => {
        modal.hide();
        this.enterReportingMode();
    });
}

// 8. Set read-only mode for viewing reports
// Also fix the setReportReadOnlyMode function to handle missing elements gracefully
setReportReadOnlyMode(readOnly = true) {
    console.log(`Setting report to ${readOnly ? 'read-only' : 'edit'} mode`);
    
    // Make form fields read-only or editable
    const textareas = document.querySelectorAll('.report-content textarea, .report-content input');
    const saveButtons = document.querySelectorAll('#save-report, #quick-save');
    
    textareas.forEach(element => {
        element.readOnly = readOnly;
        if (readOnly) {
            element.style.backgroundColor = 'rgba(108, 117, 125, 0.1)';
            element.style.border = '1px solid #6c757d';
            element.style.cursor = 'default';
        } else {
            element.style.backgroundColor = 'rgba(255,255,255,0.1)';
            element.style.border = '1px solid #555';
            element.style.cursor = 'text';
        }
    });
    
    // Update save buttons
    saveButtons.forEach(btn => {
        if (btn) {
            btn.disabled = readOnly;
            if (readOnly) {
                btn.innerHTML = '<i class="bi bi-eye me-1"></i>Viewing';
                btn.classList.remove('btn-success');
                btn.classList.add('btn-secondary');
            } else {
                btn.innerHTML = '<i class="bi bi-save me-1"></i>Save';
                btn.classList.remove('btn-secondary');
                btn.classList.add('btn-success');
            }
        }
    });
    
    // Footer fields (physician and datetime)
    const physicianField = document.getElementById('reporting-physician');
    const datetimeField = document.getElementById('report-datetime');
    
    if (physicianField) {
        physicianField.readOnly = readOnly;
        physicianField.style.backgroundColor = readOnly ? 'rgba(108, 117, 125, 0.1)' : 'rgba(255,255,255,0.1)';
    }
    
    if (datetimeField) {
        datetimeField.readOnly = readOnly;
        datetimeField.style.backgroundColor = readOnly ? 'rgba(108, 117, 125, 0.1)' : 'rgba(255,255,255,0.1)';
    }
    
    // Add edit button if in read-only mode
    if (readOnly) {
        this.addEditButton();
    } else {
        // Remove edit button if switching to edit mode
        const editBtn = document.getElementById('edit-report-btn');
        if (editBtn) editBtn.remove();
    }
}

// 9. Add edit button for read-only reports
addEditButton() {
    const header = document.querySelector('.report-header .report-actions');
    if (header && !header.querySelector('#edit-report-btn')) {
        const editBtn = document.createElement('button');
        editBtn.id = 'edit-report-btn';
        editBtn.className = 'btn btn-sm btn-warning me-1';
        editBtn.innerHTML = '<i class="bi bi-pencil me-1"></i>Edit';
        editBtn.title = 'Edit Report';
        
        editBtn.addEventListener('click', () => {
            this.setReportReadOnlyMode(false);
            window.DICOM_VIEWER.showAISuggestion('Report is now in edit mode. You can modify and save changes.');
        });
        
        // Insert as the first button
        header.insertBefore(editBtn, header.firstChild);
    }
}

// 10. Update series list to show report indicators
async updateSeriesListWithReports() {
    const state = window.DICOM_VIEWER.STATE;
    if (!state.currentSeriesImages) return;
    
    for (const image of state.currentSeriesImages) {
        await this.addReportIndicatorToSeries(image.id);
    }
}

// 11. Check current image for reports and show view button
async checkCurrentImageForReports() {
    const state = window.DICOM_VIEWER.STATE;
    const currentImage = state.currentSeriesImages[state.currentImageIndex];
    
    if (!currentImage) return;
    
    try {
        const response = await fetch(`check_report.php?imageId=${currentImage.id}`);
        const result = await response.json();
        
        const viewBtn = document.getElementById('view-report-floating-btn');
        if (result.success && result.exists) {
            if (viewBtn) viewBtn.style.display = 'block';
        } else {
            if (viewBtn) viewBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking current image reports:', error);
    }
}



// Also update the getReportSummary method to use this.cleanJSONResponse:
async getReportSummary() {
    try {
        const state = window.DICOM_VIEWER.STATE;
        const currentImage = state.currentSeriesImages[state.currentImageIndex];
        
        if (!currentImage) return { exists: false };

        const response = await fetch(`get_report_summary.php?imageId=${currentImage.id}`);
        
        if (!response.ok) {
            console.warn(`Get report summary failed: HTTP ${response.status}`);
            return { exists: false };
        }
        
        const responseText = await response.text();
        const cleanedResponse = this.cleanJSONResponse(responseText); // Use this.cleanJSONResponse
        
        let result;
        try {
            result = JSON.parse(cleanedResponse);
        } catch (parseError) {
            console.warn('JSON parse error in getReportSummary:', parseError);
            console.warn('Raw response:', responseText);
            console.warn('Cleaned response:', cleanedResponse);
            return { exists: false };
        }

        if (result && result.success && result.exists) {
            return {
                exists: true,
                template: result.template,
                physician: result.physician,
                date: result.date,
                wordCount: result.wordCount
            };
        }
        
        return { exists: false };
    } catch (error) {
        console.error('Failed to get report summary:', error);
        return { exists: false };
    }
}
    // Initialize reporting system
    // Enhanced initialize method for ReportingSystem class
initialize() {
    console.log('Medical Reporting System initialized with enhanced UI');
    
    // Create all UI components
    this.createReportUI();
    
    // Set up automatic report checking
    this.setupAutomaticReportChecking();
    
    // Listen for image changes to update report status
    this.setupImageChangeListeners();
}

// Create all report UI components
createReportUI() {
    // 1. Add report menu to navigation
    this.addReportMenu();
    
    // 2. Create floating view report button
    this.createViewReportButton();
    
    // 3. Add report status to existing series list
    setTimeout(() => {
        this.updateSeriesListWithReports();
    }, 1000);
}


// Report UI Initialization - Add this to your reporting-system.js initialize() method

// Enhanced initialize method for ReportingSystem class
initialize() {
    console.log('Medical Reporting System initialized with enhanced UI');
    
    // Create all UI components
    this.createReportUI();
    
    // Set up automatic report checking
    this.setupAutomaticReportChecking();
    
    // Listen for image changes to update report status
    this.setupImageChangeListeners();
}

// Create all report UI components
createReportUI() {
    // 1. Add report menu to navigation
    this.addReportMenu();
    
    // 2. Create floating view report button
    this.createViewReportButton();
    
    // 3. Add report status to existing series list
    setTimeout(() => {
        this.updateSeriesListWithReports();
    }, 1000);
}

// Set up automatic report checking when images load
setupAutomaticReportChecking() {
    // Override the original loadImageSeries to add report checking
    if (window.DICOM_VIEWER.loadImageSeries) {
        const originalLoadImageSeries = window.DICOM_VIEWER.loadImageSeries;
        window.DICOM_VIEWER.loadImageSeries = async function(uploadedFiles) {
            const result = await originalLoadImageSeries.call(this, uploadedFiles);
            
            // Check for reports after images are loaded
            if (window.DICOM_VIEWER.MANAGERS.reportingSystem) {
                setTimeout(() => {
                    window.DICOM_VIEWER.MANAGERS.reportingSystem.updateSeriesListWithReports();
                    window.DICOM_VIEWER.MANAGERS.reportingSystem.checkCurrentImageForReports();
                }, 2000);
            }
            
            return result;
        };
    }
}

// Listen for image navigation changes
setupImageChangeListeners() {
    // Listen for image navigation
    const originalLoadCurrentImage = window.DICOM_VIEWER.loadCurrentImage;
    if (originalLoadCurrentImage) {
        window.DICOM_VIEWER.loadCurrentImage = async function(...args) {
            const result = await originalLoadCurrentImage.apply(this, args);
            
            // Check if current image has reports
            if (window.DICOM_VIEWER.MANAGERS.reportingSystem) {
                setTimeout(() => {
                    window.DICOM_VIEWER.MANAGERS.reportingSystem.checkCurrentImageForReports();
                }, 500);
            }
            
            return result;
        };
    }
}

// Show all reports modal
async showAllReportsModal() {
    try {
        window.DICOM_VIEWER.showLoadingIndicator('Loading all reports...');
        
        // Get all available reports
        const reports = await this.getAllReports();
        
        const modalHtml = `
            <div class="modal fade" id="allReportsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content bg-dark text-light">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-files-alt me-2"></i>All Medical Reports
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${this.generateReportsListHTML(reports)}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal
        const existingModal = document.getElementById('allReportsModal');
        if (existingModal) existingModal.remove();
        
        // Add new modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('allReportsModal'));
        modal.show();
        
    } catch (error) {
        window.DICOM_VIEWER.showAISuggestion(`Error loading reports: ${error.message}`);
    } finally {
        window.DICOM_VIEWER.hideLoadingIndicator();
    }
}

// Get all available reports
async getAllReports() {
    const reports = [];
    const reportsDir = 'reports/';
    
    try {
        // Get list of all report files
        const response = await fetch('list_reports.php');
        const result = await response.json();
        
        if (result.success && result.reports) {
            return result.reports;
        }
    } catch (error) {
        console.error('Error getting reports list:', error);
    }
    
    return reports;
}

// Generate HTML for reports list
generateReportsListHTML(reports) {
    if (!reports || reports.length === 0) {
        return `
            <div class="text-center text-muted p-4">
                <i class="bi bi-file-medical fs-1 mb-3"></i>
                <h6>No Reports Found</h6>
                <p>No medical reports have been created yet.</p>
            </div>
        `;
    }
    
    return `
        <div class="reports-list">
            ${reports.map(report => `
                <div class="report-item p-3 mb-2 border rounded" style="background: rgba(255,255,255,0.05);">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="mb-1">${report.patientName || 'Unknown Patient'}</h6>
                            <p class="mb-1 small text-muted">${report.studyDescription || 'Medical Study'}</p>
                            <p class="mb-1 small">
                                <i class="bi bi-person me-1"></i>${report.reportingPhysician || 'Unknown Physician'}
                            </p>
                            <p class="mb-0 small text-info">
                                <i class="bi bi-clock me-1"></i>
                                ${new Date(report.lastModified).toLocaleString()}
                                ${report.version ? ` (v${report.version})` : ''}
                            </p>
                        </div>
                        <div class="btn-group-vertical">
                            <button class="btn btn-sm btn-outline-primary" 
                                    onclick="window.DICOM_VIEWER.MANAGERS.reportingSystem.loadReportForImage('${report.imageId}')">
                                <i class="bi bi-eye me-1"></i>View
                            </button>
                            <button class="btn btn-sm btn-outline-success" 
                                    onclick="window.DICOM_VIEWER.MANAGERS.reportingSystem.exportReportById('${report.imageId}')">
                                <i class="bi bi-download me-1"></i>Export
                            </button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Export report by ID
async exportReportById(imageId) {
    try {
        const response = await fetch(`load_report.php?imageId=${imageId}`);
        const result = await response.json();
        
        if (result.success && result.report) {
            this.reportData = result.report;
            this.exportReport();
        } else {
            window.DICOM_VIEWER.showAISuggestion('Report not found for export');
        }
    } catch (error) {
        window.DICOM_VIEWER.showAISuggestion(`Export failed: ${error.message}`);
    }
}
    // Check and show report status in UI
    async checkAndShowReportStatus() {
        const reportSummary = await this.getReportSummary();
        
        if (reportSummary.exists) {
            this.showReportIndicator(reportSummary);
        }
    }

    // Show report indicator in UI
    showReportIndicator(summary) {
        // Add report indicator to series list
        const seriesItems = document.querySelectorAll('.series-item');
        seriesItems.forEach(item => {
            const existingIndicator = item.querySelector('.report-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }

            const indicator = document.createElement('div');
            indicator.className = 'report-indicator';
            indicator.innerHTML = `
                <i class="bi bi-file-medical-fill text-success"></i>
                <span class="small">Report Available</span>
            `;
            indicator.style.cssText = `
                position: absolute;
                top: 5px;
                right: 5px;
                background: rgba(40, 167, 69, 0.9);
                color: white;
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 9px;
                font-weight: bold;
                z-index: 10;
                pointer-events: none;
            `;
            
            item.style.position = 'relative';
            item.appendChild(indicator);
        });

        // Show report status in AI suggestions
        window.DICOM_VIEWER.showAISuggestion(
            `Report available: ${summary.template} by ${summary.physician} (${summary.date})`
        );
    }
};