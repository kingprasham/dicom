const state = {
    openReports: [],
    currentReportIndex: 0,
    patient: null,
    studies: []
};

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get('patient_id');
    if (!patientId) {
        alert('No patient selected');
        window.history.back();
        return;
    }
    loadStudies(patientId);
});

async function loadStudies(patientId) {
    try {
        const response = await fetch('../api/study_list_api.php?patient_id=' + encodeURIComponent(patientId));
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to load studies');
        state.patient = data.patient;
        state.studies = data.studies;
        displayPatientInfo(data.patient);
        displayStudies(data.studies);
    } catch (error) {
        console.error('Error loading studies:', error);
        document.getElementById('studiesList').innerHTML = '<div class="alert alert-danger"><i class="bi bi-exclamation-triangle"></i> Error: ' + error.message + '</div>';
    }
}

function displayPatientInfo(patient) {
    document.getElementById('patientName').textContent = patient.patient_name || 'Unknown Patient';
    document.getElementById('patientInfo').textContent = 'ID: ' + (patient.patient_id || 'N/A') + ' | DOB: ' + (patient.patient_birth_date || 'N/A') + ' | Sex: ' + (patient.patient_sex || 'N/A');
}

function displayStudies(studies) {
    const container = document.getElementById('studiesList');
    if (studies.length === 0) {
        container.innerHTML = '<div class="alert alert-info"><i class="bi bi-info-circle"></i> No studies found for this patient.</div>';
        return;
    }
    
    // Log studies for debugging
    console.log('=== STUDIES LOADED ===');
    console.log('Total studies:', studies.length);
    studies.forEach((study, index) => {
        console.log(`Study ${index + 1}:`, {
            study_instance_uid: study.study_instance_uid,
            orthanc_id: study.orthanc_id,
            study_description: study.study_description
        });
    });
    
    container.innerHTML = studies.map(study => createStudyCard(study)).join('');
}

function createStudyCard(study) {
    // Check if report exists - will be verified when button is clicked
    const hasReport = !!study.orthanc_id;
    const hasDoctor = !!(study.performed_by || study.referring_physician);
    const isStarred = study.is_starred == 1 || study.is_starred === '1';
    
    return '<div class="study-card ' + (isStarred ? 'starred' : '') + '" id="study-' + study.study_instance_uid + '" data-study-uid="' + study.study_instance_uid + '">' +
        '<div class="study-header">' +
        '<div>' +
        '<div class="study-title">' + escapeHtml(study.study_description || 'Unnamed Study') + '</div>' +
        '<div class="study-id">Study ID: ' + (study.study_id || 'N/A') + ' | Instance UID: ' + study.study_instance_uid.substring(0, 20) + '...</div>' +
        '</div>' +
        '<span class="status-badge badge-success"><i class="bi bi-check-circle-fill"></i> Available</span>' +
        '</div>' +
        '<div class="study-meta">' +
        '<div class="meta-item">' +
        '<i class="bi bi-calendar3"></i>' +
        '<div><span class="label">Date:</span><span class="value">' + formatDate(study.study_date) + '</span></div>' +
        '</div>' +
        '<div class="meta-item">' +
        '<i class="bi bi-clock"></i>' +
        '<div><span class="label">Time:</span><span class="value">' + formatTime(study.study_time) + '</span></div>' +
        '</div>' +
        
        // === THIS IS THE MODIFIED SECTION ===
        '<div class="meta-item">' +
        '<i class="bi bi-images"></i>' +
        '<div><span class="label">Images:</span><span class="value">' + (study.instance_count || '0') + '</span></div>' +
        '</div>' +
        // === END OF MODIFIED SECTION ===

        '<div class="meta-item">' +
        '<i class="bi bi-file-earmark-medical"></i>' +
        '<div><span class="label">Modality:</span><span class="value">' + (study.modality || 'N/A') + '</span></div>' +
        '</div>' +
        (study.performed_by ? '<div class="meta-item">' +
        '<i class="bi bi-person-badge"></i>' +
        '<div><span class="label">Performed by:</span><span class="value">' + escapeHtml(study.performed_by) + '</span></div>' +
        '</div>' : '') +
        '</div>' +
        '<div class="action-buttons">' +
        '<button class="btn-action" onclick="viewReport(\'' + study.study_instance_uid + '\', \'' + study.orthanc_id + '\')" ' + (!hasReport ? 'disabled' : '') + '>' +
        '<i class="bi bi-file-earmark-text"></i> View Report' +
        '</button>' +
        '<button class="btn-action" onclick="addPrescription(\'' + study.study_instance_uid + '\', \'' + study.orthanc_id + '\')">' +
        '<i class="bi bi-prescription2"></i> Prescription' +
        '</button>' +
        '<button class="btn-action" onclick="viewDoctorInfo(\'' + study.study_instance_uid + '\')" ' + (!hasDoctor ? 'disabled' : '') + '>' +
        '<i class="bi bi-person-badge"></i> Doctor Info' +
        '</button>' +
        '<button class="btn-action btn-success" onclick="openStudy(\'' + study.study_instance_uid + '\', \'' + study.orthanc_id + '\')">' +
        '<i class="bi bi-box-arrow-up-right"></i> Open Study' +
        '</button>' +
        '</div></div>';
}

async function toggleStar(studyUID, event) {
    event.stopPropagation();
    const study = state.studies.find(s => s.study_instance_uid === studyUID);
    if (!study) return;
    
    const newStarredState = study.is_starred == 1 ? 0 : 1;
    
    try {
        const response = await fetch('../toggle_star.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                id: studyUID,
                is_starred: newStarredState,
                type: 'study'
            })
        });
        
        const data = await response.json();
        if (data.success) {
            study.is_starred = newStarredState;
            const card = document.getElementById('study-' + studyUID);
            const starBtn = card.querySelector('.star-btn');
            const starIcon = starBtn.querySelector('i');
            
            if (newStarredState == 1) {
                card.classList.add('starred');
                starBtn.classList.add('starred');
                starIcon.className = 'bi bi-star-fill';
            } else {
                card.classList.remove('starred');
                starBtn.classList.remove('starred');
                starIcon.className = 'bi bi-star';
            }
        } else {
            alert('Failed to update star status');
        }
    } catch (error) {
        console.error('Error toggling star:', error);
        alert('Error toggling star status');
    }
}

async function viewReport(studyUID, orthancId) {
    const content = document.getElementById('reportContent');
    try {
        console.log('=== VIEW REPORT REQUESTED ===');
        console.log('Study UID:', studyUID);
        console.log('Orthanc ID:', orthancId);
        
        // Show the side panel and display a loading message
        showReportPanel();
        content.innerHTML = `
            <div class="spinner-container">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <div class="mt-2">Loading Report...</div>
            </div>
        `;
        
        markStudyAsOpened(studyUID);

        const apiUrl = `../api/get_study_report.php?study_uid=${encodeURIComponent(studyUID)}&study_orthanc_id=${encodeURIComponent(orthancId)}`;
        console.log('Calling API:', apiUrl);
        const response = await fetch(apiUrl);
        const data = await response.json();
        console.log('API Response:', data);

        if (data.success && data.exists) {
            console.log('Report found, rendering...');
            renderReport(data.report, studyUID);
        } else {
            console.log('No report found for this study.');
            content.innerHTML = `
                <div class="no-report-message">
                    <i class="bi bi-file-earmark-excel"></i>
                    <h5>No Report Found</h5>
                    <p>${data.message || 'A report has not been created for this study yet.'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading report:', error);
        content.innerHTML = `
            <div class="no-report-message text-danger">
                <i class="bi bi-exclamation-triangle"></i>
                <h5>Error Loading Report</h5>
                <p>${error.message}</p>
            </div>
        `;
    }
}
async function addPrescription(studyUID, orthancId) {
    try {
        showReportPanel();
        const existingIndex = state.openReports.findIndex(r => r.studyUID === studyUID && r.type === 'prescription');
        if (existingIndex === -1) {
            const study = state.studies.find(s => s.study_instance_uid === studyUID);
            state.openReports.push({studyUID, orthancId, type: 'prescription', study, title: (study.study_description || 'Study') + ' - Prescription'});
            state.currentReportIndex = state.openReports.length - 1;
            markStudyAsOpened(studyUID);
        } else {
            state.currentReportIndex = existingIndex;
        }
        updateReportTabs();
        updateOpenReportsCount();
        
        // Check if prescription exists first
        const response = await fetch('../api/get_prescription.php?study_uid=' + encodeURIComponent(studyUID));
        const data = await response.json();
        
        if (data.success && data.exists) {
            // Show existing prescription with option to edit
            renderExistingPrescription(data.prescription, studyUID, orthancId);
        } else {
            // Show new prescription form
            renderPrescriptionForm(studyUID, orthancId);
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('reportContent').innerHTML = 
            '<div class="alert alert-danger"><i class="bi bi-exclamation-triangle"></i> Error loading prescription: ' + error.message + '</div>';
    }
}

async function viewDoctorInfo(studyUID) {
    try {
        showReportPanel();
        const existingIndex = state.openReports.findIndex(r => r.studyUID === studyUID && r.type === 'doctor');
        if (existingIndex === -1) {
            const study = state.studies.find(s => s.study_instance_uid === studyUID);
            state.openReports.push({studyUID, type: 'doctor', study, title: (study.study_description || 'Study') + ' - Doctor'});
            state.currentReportIndex = state.openReports.length - 1;
            markStudyAsOpened(studyUID);
        } else {
            state.currentReportIndex = existingIndex;
        }
        updateReportTabs();
        updateOpenReportsCount();
        const study = state.studies.find(s => s.study_instance_uid === studyUID);
        renderDoctorInfo(study);
    } catch (error) {
        console.error('Error:', error);
    }
}

// REPLACE your old renderReport function with this one
function renderReport(report, studyUID) {
    const reportContent = report.report_content || {};
    const content = document.getElementById('reportContent');
    
    // Build the HTML for each section only if it has content
    const indicationHTML = reportContent.indication ? `
        <div class="report-section">
            <h6>Indication</h6>
            <p>${escapeHtml(reportContent.indication)}</p>
        </div>` : '';

    const techniqueHTML = reportContent.technique ? `
        <div class="report-section">
            <h6>Technique</h6>
            <p>${escapeHtml(reportContent.technique)}</p>
        </div>` : '';

    const findingsHTML = reportContent.findings ? `
        <div class="report-section">
            <h6>Findings</h6>
            <p>${escapeHtml(reportContent.findings).replace(/\n/g, '<br>')}</p>
        </div>` : '';

    const impressionHTML = reportContent.impression ? `
        <div class="report-section">
            <h6>Impression</h6>
            <p>${escapeHtml(reportContent.impression).replace(/\n/g, '<br>')}</p>
        </div>` : '';

    const recommendationsHTML = reportContent.recommendations ? `
        <div class="report-section">
            <h6>Recommendations</h6>
            <p>${escapeHtml(reportContent.recommendations)}</p>
        </div>` : '';
    
    // Assemble the final report card
    content.innerHTML = `
        <div class="report-card">
            <div class="report-header">
                <div>
                    <h4><i class="bi bi-file-earmark-text me-2"></i>Study Report</h4>
                    <div class="mt-2 text-light">
                        <i class="bi bi-calendar3"></i> ${formatDateTime(report.created_at || report.report_date)}
                    </div>
                </div>
                <div class="report-actions">
                    <button class="control-btn" onclick="printReport()" title="Print Report">
                        <i class="bi bi-printer"></i> Print
                    </button>
                </div>
            </div>
            ${indicationHTML}
            ${techniqueHTML}
            ${findingsHTML}
            ${impressionHTML}
            ${recommendationsHTML}
            <div class="mt-4 text-muted small">
                <p><strong>Reporting Physician:</strong> ${escapeHtml(report.reporting_physician || 'N/A')}</p>
                <p><strong>Status:</strong> <span class="badge bg-success">${escapeHtml(report.report_status || 'Final')}</span></p>
                ${report.version ? `<p><strong>Version:</strong> ${report.version}</p>` : ''}
            </div>
        </div>`;
}

function renderExistingPrescription(prescription, studyUID, orthancId) {
    const prescriptionData = JSON.parse(prescription.prescription_data || '{}');
    const medications = prescriptionData.medications || [];
    
    const content = document.getElementById('reportContent');
    let medicationsHtml = '';
    medications.forEach(med => {
        medicationsHtml += 
            '<div class="border rounded p-3 mb-2 bg-dark">' +
            '<div class="row">' +
            '<div class="col-md-6"><strong>Medication:</strong> ' + escapeHtml(med.name) + '</div>' +
            '<div class="col-md-6"><strong>Dosage:</strong> ' + escapeHtml(med.dosage) + '</div>' +
            '<div class="col-md-6 mt-2"><strong>Frequency:</strong> ' + escapeHtml(med.frequency) + '</div>' +
            '<div class="col-md-6 mt-2"><strong>Duration:</strong> ' + escapeHtml(med.duration) + '</div>' +
            '</div></div>';
    });
    
    content.innerHTML = '<div class="report-card">' +
        '<div class="report-header">' +
        '<div>' +
        '<h4><i class="bi bi-prescription2 me-2"></i>Prescription</h4>' +
        '<p class="text-muted mb-0"><i class="bi bi-calendar3"></i> Created: ' + formatDateTime(prescription.created_at) + '</p>' +
        '</div>' +
        '<button class="btn-action btn-primary" onclick="renderPrescriptionForm(\'' + studyUID + '\', \'' + orthancId + '\')"><i class="bi bi-pencil"></i> Edit</button>' +
        '</div>' +
        '<div class="report-section">' +
        '<h6>Prescribing Physician</h6>' +
        '<p class="fs-5">' + escapeHtml(prescription.prescribing_physician) + '</p>' +
        '</div>' +
        '<div class="report-section">' +
        '<h6>Medications</h6>' +
        medicationsHtml +
        '</div>' +
        (prescriptionData.instructions ? 
        '<div class="report-section">' +
        '<h6>General Instructions</h6>' +
        '<p>' + escapeHtml(prescriptionData.instructions) + '</p>' +
        '</div>' : '') +
        '<div class="mt-4 text-muted small">' +
        '<p>Created by: ' + (prescription.created_by_name || prescription.created_by || 'System') + '</p>' +
        (prescription.updated_at ? '<p>Last updated: ' + formatDateTime(prescription.updated_at) + '</p>' : '') +
        '</div>' +
        '</div>';
}

function renderPrescriptionForm(studyUID, orthancId) {
    const content = document.getElementById('reportContent');
    content.innerHTML = '<div class="report-card">' +
        '<div class="report-header">' +
        '<h4><i class="bi bi-prescription2 me-2"></i>Add Prescription</h4>' +
        '</div>' +
        '<form id="prescriptionForm" onsubmit="savePrescription(event, \'' + studyUID + '\')">' +
        '<div class="mb-3">' +
        '<label class="form-label">Prescribing Physician</label>' +
        '<input type="text" class="form-control" id="prescribingPhysician" required>' +
        '</div>' +
        '<div class="mb-3">' +
        '<label class="form-label">Medications</label>' +
        '<div id="medicationsList"></div>' +
        '<button type="button" class="btn btn-sm btn-outline-primary mt-2" onclick="addMedicationField()">' +
        '<i class="bi bi-plus-circle"></i> Add Medication' +
        '</button>' +
        '</div>' +
        '<div class="mb-3">' +
        '<label class="form-label">General Instructions</label>' +
        '<textarea class="form-control" id="generalInstructions" rows="3"></textarea>' +
        '</div>' +
        '<button type="submit" class="btn btn-success">' +
        '<i class="bi bi-save"></i> Save Prescription' +
        '</button>' +
        '</form>' +
        '</div>';
    
    addMedicationField();
}

function addMedicationField() {
    const container = document.getElementById('medicationsList');
    const index = container.children.length;
    const medDiv = document.createElement('div');
    medDiv.className = 'border rounded p-3 mb-2';
    medDiv.innerHTML = '<div class="row">' +
        '<div class="col-md-6 mb-2">' +
        '<input type="text" class="form-control" placeholder="Medication Name" name="medName[]" required>' +
        '</div>' +
        '<div class="col-md-6 mb-2">' +
        '<input type="text" class="form-control" placeholder="Dosage" name="medDosage[]" required>' +
        '</div>' +
        '<div class="col-md-4 mb-2">' +
        '<input type="text" class="form-control" placeholder="Frequency" name="medFrequency[]" required>' +
        '</div>' +
        '<div class="col-md-4 mb-2">' +
        '<input type="text" class="form-control" placeholder="Duration" name="medDuration[]" required>' +
        '</div>' +
        '<div class="col-md-4 mb-2">' +
        '<button type="button" class="btn btn-danger btn-sm w-100" onclick="this.parentElement.parentElement.parentElement.remove()">' +
        '<i class="bi bi-trash"></i> Remove' +
        '</button>' +
        '</div>' +
        '</div>';
    container.appendChild(medDiv);
}

async function savePrescription(event, studyUID) {
    event.preventDefault();
    
    const medications = [];
    const names = document.getElementsByName('medName[]');
    const dosages = document.getElementsByName('medDosage[]');
    const frequencies = document.getElementsByName('medFrequency[]');
    const durations = document.getElementsByName('medDuration[]');
    
    for (let i = 0; i < names.length; i++) {
        medications.push({
            name: names[i].value,
            dosage: dosages[i].value,
            frequency: frequencies[i].value,
            duration: durations[i].value
        });
    }
    
    const prescriptionData = {
        study_uid: studyUID,
        prescribing_physician: document.getElementById('prescribingPhysician').value,
        medications: medications,
        instructions: document.getElementById('generalInstructions').value
    };
    
    try {
        const response = await fetch('../api/save_prescription.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(prescriptionData)
        });
        
        const data = await response.json();
        if (data.success) {
            alert('Prescription saved successfully!');
            closeReportTab(state.currentReportIndex);
        } else {
            alert('Failed to save prescription: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error saving prescription: ' + error.message);
    }
}

function renderDoctorInfo(study) {
    let html = '<div class="report-card"><div class="report-header"><h4><i class="bi bi-person-badge me-2"></i>Doctor Information</h4></div>';
    if (study.performed_by) html += '<div class="report-section"><h6>Performed By</h6><p class="fs-5">' + escapeHtml(study.performed_by) + '</p></div>';
    if (study.referring_physician) html += '<div class="report-section"><h6>Referring Physician</h6><p class="fs-5">' + escapeHtml(study.referring_physician) + '</p></div>';
    if (!study.performed_by && !study.referring_physician) html += '<p class="text-secondary">No doctor information available</p>';
    html += '</div>';
    document.getElementById('reportContent').innerHTML = html;
}

function exportReport(studyUID) {
    window.print();
}

function printReport() {
    window.print();
}

function shareReportModal(studyUID) {
    const url = window.location.origin + '/dicom/php/index.php?studyUID=' + studyUID;
    const message = 'Share this report:\n\nURL: ' + url + '\n\nYou can copy this URL to share via email, WhatsApp, or other messaging apps.';
    
    if (navigator.share) {
        navigator.share({
            title: 'Medical Study Report',
            text: 'View medical study report',
            url: url
        }).catch(err => console.log('Error sharing:', err));
    } else {
        navigator.clipboard.writeText(url).then(() => {
            alert('Report URL copied to clipboard!\n\n' + url);
        }).catch(() => {
            alert(message);
        });
    }
}

function updateReportTabs() {
    const tabs = document.getElementById('reportTabs');
    if (state.openReports.length === 0) {
        tabs.innerHTML = '';
        return;
    }
    let html = '';
    state.openReports.forEach((report, i) => {
        html += '<div class="report-tab ' + (i === state.currentReportIndex ? 'active' : '') + '" onclick="switchToReport(' + i + ')">' +
            '<i class="bi bi-' + getReportIcon(report.type) + '"></i>' +
            '<span>' + truncateText(report.title, 25) + '</span>' +
            '<span class="close-tab" onclick="event.stopPropagation(); closeReportTab(' + i + ')"><i class="bi bi-x-lg"></i></span></div>';
    });
    tabs.innerHTML = html;
}

function getReportIcon(type) {
    return type === 'report' ? 'file-earmark-text' : type === 'prescription' ? 'prescription2' : 'person-badge';
}

function switchToReport(index) {
    if (index < 0 || index >= state.openReports.length) return;
    state.currentReportIndex = index;
    const report = state.openReports[index];
    updateReportTabs();
    if (report.type === 'report') viewReport(report.studyUID, report.orthancId);
    else if (report.type === 'prescription') addPrescription(report.studyUID, report.orthancId);
    else if (report.type === 'doctor') viewDoctorInfo(report.studyUID);
}

function closeReportTab(index) {
    const report = state.openReports[index];
    state.openReports.splice(index, 1);
    const hasMore = state.openReports.some(r => r.studyUID === report.studyUID);
    if (!hasMore) unmarkStudyAsOpened(report.studyUID);
    updateOpenReportsCount();
    if (state.openReports.length === 0) {
        closeAllReports();
    } else {
        if (state.currentReportIndex >= state.openReports.length) {
            state.currentReportIndex = state.openReports.length - 1;
        }
        switchToReport(state.currentReportIndex);
    }
}

function closeAllReports() {
    state.openReports = [];
    state.currentReportIndex = 0;
    document.querySelectorAll('.study-card').forEach(c => c.classList.remove('report-opened'));
    document.getElementById('reportsPanel').classList.remove('active', 'full');
    document.getElementById('studiesPanel').classList.remove('hidden');
    document.getElementById('reportContent').innerHTML = '<div class="no-report-message"><i class="bi bi-file-earmark-text"></i>' +
        '<h5>No Report Selected</h5><p>Click buttons on any study to view details</p></div>';
    updateReportTabs();
    updateOpenReportsCount();
}

function showReportPanel() {
    document.getElementById('reportsPanel').classList.add('active');
}

function toggleFullScreen() {
    const panel = document.getElementById('reportsPanel');
    const studies = document.getElementById('studiesPanel');
    const icon = document.getElementById('toggleIcon');
    if (panel.classList.contains('full')) {
        panel.classList.remove('full');
        studies.classList.remove('hidden');
        icon.className = 'bi bi-arrows-angle-expand';
    } else {
        panel.classList.add('full');
        studies.classList.add('hidden');
        icon.className = 'bi bi-arrows-angle-contract';
    }
}

function markStudyAsOpened(studyUID) {
    const card = document.getElementById('study-' + studyUID);
    if (card) card.classList.add('report-opened');
}

function unmarkStudyAsOpened(studyUID) {
    const card = document.getElementById('study-' + studyUID);
    if (card) card.classList.remove('report-opened');
}

function updateOpenReportsCount() {
    const count = state.openReports.length;
    const elem = document.getElementById('openReportsCount');
    if (count > 0) {
        elem.style.display = 'block';
        document.getElementById('reportCountText').textContent = count;
    } else {
        elem.style.display = 'none';
    }
}

function openStudy(studyUID, orthancId) {
    window.location.href = '../index.php?studyUID=' + encodeURIComponent(studyUID) + '&orthancId=' + encodeURIComponent(orthancId);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(date) {
    if (!date) return 'N/A';
    if (typeof date === 'string' && date.length === 8) {
        return date.substr(0,4) + '-' + date.substr(4,2) + '-' + date.substr(6,2);
    }
    return new Date(date).toLocaleDateString();
}

function formatTime(time) {
    if (!time) return 'N/A';

    // First, check if the time is already formatted (i.e., contains a colon)
    if (typeof time === 'string' && time.includes(':')) {
        // It's already in HH:MM:SS format, so just return it as is.
        return time;
    }

    // If not formatted, proceed with the original formatting logic for DICOM time (HHMMSS)
    if (typeof time === 'string') {
        const cleanTime = time.split('.')[0];
        const paddedTime = cleanTime.padEnd(6, '0');

        if (paddedTime.length >= 6) {
            const hours = paddedTime.substr(0, 2);
            const minutes = paddedTime.substr(2, 2);
            const seconds = paddedTime.substr(4, 2);
            return `${hours}:${minutes}:${seconds}`;
        }
    }
    
    return time; // Fallback for any other case
}

function formatDateTime(dateTime) {
    if (!dateTime) return 'N/A';
    try {
        return new Date(dateTime).toLocaleString();
    } catch (e) {
        return dateTime;
    }
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}
