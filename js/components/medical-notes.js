// Medical Notes Manager - DICOM Reporting System
window.DICOM_VIEWER.MedicalNotesManager = class {
    constructor() {
        this.notes = new Map();
        this.currentImageId = null;
        this.isInitialized = false;
        this.init();
    }

    init() {
        this.createNotesUI();
        this.setupEventListeners();
        this.isInitialized = true;
        console.log('Medical Notes Manager initialized');
    }

createNotesUI() {
    // Add notes panel to the right sidebar
    const sidebar = document.querySelector('aside.sidebar.border-start');
    if (!sidebar) return;

    const notesPanel = document.createElement('div');
    notesPanel.className = 'medical-notes-panel p-3 border-bottom';
    notesPanel.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="text-light mb-0">
                <i class="bi bi-journal-medical me-2"></i>Medical Notes
            </h6>
            <button class="btn btn-sm btn-outline-info" id="toggleNotesPanel">
                <i class="bi bi-chevron-down"></i>
            </button>
        </div>
        
        <div id="notesContent" class="notes-content" style="display: none;">
            <!-- Patient Information -->
            <div class="mb-3">
                <label class="form-label small text-light">Patient ID</label>
                <input type="text" class="form-control form-control-sm" id="notePatientId" readonly>
            </div>

            <!-- Study Information -->
            <div class="mb-3">
                <label class="form-label small text-light">Study Date</label>
                <input type="text" class="form-control form-control-sm" id="noteStudyDate" readonly>
            </div>

            <!-- Doctor Information -->
            <div class="mb-3">
                <label class="form-label small text-light">Reporting Physician</label>
                <input type="text" class="form-control form-control-sm" id="reportingPhysician" 
                       placeholder="Dr. [Your Name]">
            </div>

            <!-- Clinical History -->
            <div class="mb-3">
                <label class="form-label small text-light">Clinical History</label>
                <textarea class="form-control form-control-sm" id="clinicalHistory" rows="2" 
                          placeholder="Patient history, symptoms, clinical presentation..."></textarea>
            </div>

            <!-- Technique -->
            <div class="mb-3">
                <label class="form-label small text-light">Technique</label>
                <textarea class="form-control form-control-sm" id="technique" rows="2" 
                          placeholder="Imaging technique, contrast, protocol used..."></textarea>
            </div>

            <!-- Findings -->
            <div class="mb-3">
                <label class="form-label small text-light">Findings</label>
                <textarea class="form-control form-control-sm" id="findings" rows="4" 
                          placeholder="Detailed imaging findings, abnormalities, measurements..."></textarea>
            </div>

            <!-- Impression -->
            <div class="mb-3">
                <label class="form-label small text-light">Impression/Diagnosis</label>
                <textarea class="form-control form-control-sm" id="impression" rows="3" 
                          placeholder="Clinical impression, differential diagnosis..."></textarea>
            </div>

            <!-- Recommendations -->
            <div class="mb-3">
                <label class="form-label small text-light">Recommendations</label>
                <textarea class="form-control form-control-sm" id="recommendations" rows="2" 
                          placeholder="Follow-up recommendations, additional studies..."></textarea>
            </div>

            <!-- Notes History -->
            <div class="mb-3">
                <label class="form-label small text-light">Notes History</label>
                <div id="notesHistory" class="small text-muted" style="max-height: 100px; overflow-y: auto; border: 1px solid #444; border-radius: 4px; padding: 8px;">
                    No previous notes
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="d-flex gap-1">
                <button class="btn btn-success btn-sm flex-fill" id="saveNotes">
                    <i class="bi bi-floppy me-1"></i>Save
                </button>
                <button class="btn btn-info btn-sm flex-fill" id="exportReport">
                    <i class="bi bi-file-text me-1"></i>Report
                </button>
                <button class="btn btn-warning btn-sm flex-fill" id="clearNotes">
                    <i class="bi bi-trash me-1"></i>Clear
                </button>
            </div>
        </div>
    `;

    // Insert after tools panel but ensure sidebar scrolling works
    const toolsPanel = sidebar.querySelector('.p-3.border-bottom');
    if (toolsPanel) {
        toolsPanel.parentNode.insertBefore(notesPanel, toolsPanel.nextSibling);
    } else {
        sidebar.insertBefore(notesPanel, sidebar.firstChild);
    }
}

setupEventListeners() {
    // Toggle panel visibility - FIXED VERSION
    const toggleBtn = document.getElementById('toggleNotesPanel');
    const notesContent = document.getElementById('notesContent');
    
    if (toggleBtn && notesContent) {
        toggleBtn.addEventListener('click', () => {
            const isVisible = notesContent.style.display !== 'none';
            notesContent.style.display = isVisible ? 'none' : 'block';
            
            // Update chevron icon
            const icon = toggleBtn.querySelector('i');
            if (isVisible) {
                icon.className = 'bi bi-chevron-down';
            } else {
                icon.className = 'bi bi-chevron-up';
            }
            
            console.log(`Notes panel ${isVisible ? 'collapsed' : 'expanded'}`);
        });
    }

    // Save notes
    const saveBtn = document.getElementById('saveNotes');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => this.saveNotes());
    }

    // Export report
    const exportBtn = document.getElementById('exportReport');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => this.exportReport());
    }

    // Clear notes
    const clearBtn = document.getElementById('clearNotes');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => this.clearNotes());
    }

    // Auto-save on field changes (debounced)
    const fields = ['reportingPhysician', 'clinicalHistory', 'technique', 'findings', 'impression', 'recommendations'];
    let saveTimeout;
    
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', () => {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => this.autoSave(), 2000);
            });
        }
    });
}

loadNotesForImage(imageId, patientInfo = {}) {
    this.currentImageId = imageId;
    
    // Auto-populate patient info fields from DICOM data
    const patientIdField = document.getElementById('notePatientId');
    const studyDateField = document.getElementById('noteStudyDate');
    
    if (patientIdField) {
        patientIdField.value = patientInfo.patient_id || patientInfo.patientId || '';
    }
    if (studyDateField) {
        studyDateField.value = patientInfo.study_date || patientInfo.studyDate || '';
    }

    // Try to load existing notes from server first, then localStorage
    this.loadNotesFromServer(imageId);

    console.log(`Loading notes for image: ${imageId}`);
}

// Updated saveNotes method
saveNotes() {
    if (!this.currentImageId) {
        window.DICOM_VIEWER.showAISuggestion('No image selected for notes');
        return;
    }

    const state = window.DICOM_VIEWER.STATE;
    const currentImage = state.currentSeriesImages[state.currentImageIndex];
    const originalFilename = currentImage?.file_name || '';

    const noteData = {
        imageId: this.currentImageId,
        originalFilename: originalFilename,
        timestamp: new Date().toISOString(),
        reportingPhysician: document.getElementById('reportingPhysician').value,
        clinicalHistory: document.getElementById('clinicalHistory').value,
        technique: document.getElementById('technique').value,
        findings: document.getElementById('findings').value,
        impression: document.getElementById('impression').value,
        recommendations: document.getElementById('recommendations').value,
        patientId: document.getElementById('notePatientId').value,
        studyDate: document.getElementById('noteStudyDate').value
    };

    // Save to memory and localStorage
    this.notes.set(this.currentImageId, noteData);
    
    // Create a localStorage key based on original filename if available
    const storageKey = originalFilename 
        ? `dicom_notes_file_${originalFilename.replace(/[^a-zA-Z0-9]/g, '_')}`
        : `dicom_notes_${this.currentImageId}`;
    
    localStorage.setItem(storageKey, JSON.stringify(noteData));

    // Also save to server (file-based)
    this.saveNotesToServer(noteData);

    this.updateNotesHistory(this.currentImageId);
    window.DICOM_VIEWER.showAISuggestion('Medical notes saved successfully');
    
    // Visual feedback
    const saveBtn = document.getElementById('saveNotes');
    if (saveBtn) {
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="bi bi-check me-1"></i>Saved';
        saveBtn.classList.replace('btn-success', 'btn-outline-success');
        setTimeout(() => {
            saveBtn.innerHTML = originalText;
            saveBtn.classList.replace('btn-outline-success', 'btn-success');
        }, 2000);
    }
}

// Updated loadNotesFromServer method
async loadNotesFromServer(imageId) {
    const state = window.DICOM_VIEWER.STATE;
    const currentImage = state.currentSeriesImages[state.currentImageIndex];
    const originalFilename = currentImage?.file_name || '';

    try {
        // Try server first with original filename
        const params = new URLSearchParams({
            imageId: imageId,
            ...(originalFilename && { filename: originalFilename })
        });
        
        const response = await fetch(`get_notes.php?${params}`);
        const data = await response.json();
        
        if (data.success && data.notes) {
            this.notes.set(imageId, data.notes);
            this.populateNotesFields(data.notes);
            console.log('Loaded notes from server for:', originalFilename || imageId);
            return;
        }
    } catch (error) {
        console.log('Server notes load failed, trying localStorage:', error);
    }

    // Fallback to localStorage with multiple key attempts
    const possibleKeys = [
        originalFilename ? `dicom_notes_file_${originalFilename.replace(/[^a-zA-Z0-9]/g, '_')}` : null,
        `dicom_notes_${imageId}`,
        // Also try with just the base filename
        originalFilename ? `dicom_notes_file_${originalFilename.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_')}` : null
    ].filter(key => key !== null);

    for (const key of possibleKeys) {
        try {
            const localNotes = localStorage.getItem(key);
            if (localNotes) {
                const noteData = JSON.parse(localNotes);
                this.notes.set(imageId, noteData);
                this.populateNotesFields(noteData);
                console.log(`Loaded notes from localStorage with key: ${key}`);
                return;
            }
        } catch (error) {
            console.error(`Error loading notes with key ${key}:`, error);
        }
    }

    // Clear fields if no notes found
    this.clearNotesFields();
    console.log('No existing notes found for:', originalFilename || imageId);
}

// Updated saveNotesToServer method
async saveNotesToServer(noteData) {
    try {
        const response = await fetch('save_notes.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(noteData)
        });
        
        const result = await response.json();
        if (result.success) {
            console.log('Notes saved to server file:', result.filename);
        } else {
            console.log('Server save failed:', result.message);
        }
    } catch (error) {
        console.log('Server save failed, using local storage only:', error);
    }
}

    autoSave() {
        if (this.currentImageId) {
            this.saveNotes();
            console.log('Auto-saved medical notes');
        }
    }

    clearNotes() {
        if (confirm('Are you sure you want to clear all notes for this image?')) {
            const fields = ['reportingPhysician', 'clinicalHistory', 'technique', 'findings', 'impression', 'recommendations'];
            fields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) field.value = '';
            });
            
            if (this.currentImageId) {
                this.notes.delete(this.currentImageId);
                localStorage.removeItem(`dicom_notes_${this.currentImageId}`);
                this.updateNotesHistory(this.currentImageId);
            }
            
            window.DICOM_VIEWER.showAISuggestion('Notes cleared');
        }
    }

    updateNotesHistory(imageId) {
        const historyDiv = document.getElementById('notesHistory');
        if (!historyDiv) return;

        const notes = this.notes.get(imageId);
        if (!notes || !notes.timestamp) {
            historyDiv.innerHTML = '<div class="text-muted small">No previous notes</div>';
            return;
        }

        const date = new Date(notes.timestamp);
        historyDiv.innerHTML = `
            <div class="border rounded p-2 mb-2 bg-dark">
                <div class="text-info small mb-1">
                    <strong>Last Updated:</strong> ${date.toLocaleDateString()} ${date.toLocaleTimeString()}
                </div>
                <div class="small">
                    <strong>By:</strong> ${notes.reportingPhysician || 'Unknown'}
                </div>
            </div>
        `;
    }

    exportReport() {
        if (!this.currentImageId) {
            window.DICOM_VIEWER.showAISuggestion('No image selected for report export');
            return;
        }

        const notes = this.notes.get(this.currentImageId) || {};
        const date = new Date();
        
        const reportContent = `
RADIOLOGY REPORT

Patient ID: ${notes.patientId || 'N/A'}
Study Date: ${notes.studyDate || 'N/A'}
Report Date: ${date.toLocaleDateString()}
Reporting Physician: ${notes.reportingPhysician || 'N/A'}

CLINICAL HISTORY:
${notes.clinicalHistory || 'No clinical history provided'}

TECHNIQUE:
${notes.technique || 'No technique details provided'}

FINDINGS:
${notes.findings || 'No findings documented'}

IMPRESSION:
${notes.impression || 'No impression provided'}

RECOMMENDATIONS:
${notes.recommendations || 'No recommendations provided'}

---
Report generated by DICOM Viewer Pro
Generated on: ${date.toLocaleString()}
        `.trim();

        // Create and download report
        const blob = new Blob([reportContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `RadiologyReport_${notes.patientId || 'Unknown'}_${date.toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        window.DICOM_VIEWER.showAISuggestion('Radiology report exported successfully');
    }

    async saveNotesToServer(noteData) {
        try {
            const response = await fetch('save_notes.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(noteData)
            });
            
            if (response.ok) {
                console.log('Notes saved to server');
            }
        } catch (error) {
            console.log('Server save failed, using local storage only:', error);
        }
    }

async loadNotesFromServer(imageId) {
    try {
        // Try server first
        const response = await fetch(`get_notes.php?imageId=${encodeURIComponent(imageId)}`);
        const data = await response.json();
        
        if (data.success && data.notes) {
            this.notes.set(imageId, data.notes);
            this.populateNotesFields(data.notes);
            console.log('Loaded notes from server for:', imageId);
            return;
        }
    } catch (error) {
        console.log('Server notes load failed, trying localStorage:', error);
    }

    // Fallback to localStorage
    try {
        const localNotes = localStorage.getItem(`dicom_notes_${imageId}`);
        if (localNotes) {
            const noteData = JSON.parse(localNotes);
            this.notes.set(imageId, noteData);
            this.populateNotesFields(noteData);
            console.log('Loaded notes from localStorage for:', imageId);
        } else {
            // Clear fields if no notes found
            this.clearNotesFields();
            console.log('No existing notes found for:', imageId);
        }
    } catch (error) {
        console.error('Error loading notes from localStorage:', error);
        this.clearNotesFields();
    }
}

populateNotesFields(noteData) {
    const fields = ['reportingPhysician', 'clinicalHistory', 'technique', 'findings', 'impression', 'recommendations'];
    
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && noteData[fieldId]) {
            field.value = noteData[fieldId];
        }
    });

    this.updateNotesHistory(this.currentImageId);
}

clearNotesFields() {
    const fields = ['reportingPhysician', 'clinicalHistory', 'technique', 'findings', 'impression', 'recommendations'];
    
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = '';
        }
    });

    const historyDiv = document.getElementById('notesHistory');
    if (historyDiv) {
        historyDiv.innerHTML = '<div class="text-muted small">No previous notes</div>';
    }
}
};