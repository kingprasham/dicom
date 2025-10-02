/**
 * Auto-load studies from Orthanc via URL parameters
 */

(function() {
    let viewerReady = false;
    let domReady = false;
    
    document.addEventListener('DOMContentLoaded', function() {
        domReady = true;
        checkAndLoad();
    });
    
    setTimeout(() => {
        viewerReady = true;
        checkAndLoad();
    }, 2000);
    
    async function checkAndLoad() {
        if (!domReady || !viewerReady) return;
        
        const urlParams = new URLSearchParams(window.location.search);
        const studyUID = urlParams.get('studyUID');
        
        if (studyUID) {
            console.log('Auto-loading study:', studyUID);
            await autoLoadStudyFromOrthanc(studyUID);
        }
    }
    
// orthanc-autoload.js

async function autoLoadStudyFromOrthanc(studyUID) {
    try {
        showLoadingIndicator('Loading study from PACS...');
        
        const response = await fetch(`api/load_study_fast.php?studyUID=${encodeURIComponent(studyUID)}`);
        const text = await response.text();
        
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error('Invalid response from server');
        }
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to load study');
        }
        
        console.log('Study loaded:', data.imageCount, 'images');
        
        if (!data.images || data.images.length === 0) {
            throw new Error('No images found');
        }
        
        // Convert images to format expected by main viewer
        // MODIFIED: Added study_instance_uid to each formatted image object.
        const formattedImages = data.images.map((img, index) => ({
            id: img.instanceId,
            patient_name: img.patientName || data.patientName || 'Anonymous',
            series_description: img.seriesDescription,
            study_description: data.studyDescription || 'PACS Study',
            file_name: img.fileName || `image-${String(img.instanceNumber || index + 1).padStart(6, '0')}.dcm`,
            orthancInstanceId: img.instanceId,
            isOrthancImage: true,
            sopInstanceUID: img.sopInstanceUID,
            seriesInstanceUID: img.seriesInstanceUID,
            study_instance_uid: data.studyUID, // <-- THIS IS THE CRITICAL FIX
            originalIndex: index
        }));
        
        if (window.DICOM_VIEWER && window.DICOM_VIEWER.loadImageSeries) {
            window.DICOM_VIEWER.populateSeriesList(formattedImages);
            await window.DICOM_VIEWER.loadImageSeries(formattedImages);
        }
        
        hideLoadingIndicator();
        console.log('All series loaded into viewer');
        
    } catch (error) {
        console.error('Error:', error);
        hideLoadingIndicator();
        showError('Failed to load study: ' + error.message);
    }
}
    
    function showLoadingIndicator(message) {
        let indicator = document.getElementById('autoLoadIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'autoLoadIndicator';
            indicator.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.95); color: white; padding: 30px 50px;
                border-radius: 10px; z-index: 10000; text-align: center;
            `;
            document.body.appendChild(indicator);
        }
        indicator.innerHTML = `
            <div class="spinner-border text-primary mb-3"></div>
            <div>${message}</div>
        `;
        indicator.style.display = 'block';
    }
    
    function hideLoadingIndicator() {
        const indicator = document.getElementById('autoLoadIndicator');
        if (indicator) indicator.style.display = 'none';
    }
    
    function showError(message) {
        hideLoadingIndicator();
        alert('Error: ' + message);
    }
})();

console.log('Orthanc auto-load script loaded');
