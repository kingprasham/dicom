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
            
            // Group by series
            const seriesGroups = {};
            data.images.forEach(img => {
                if (!seriesGroups[img.seriesInstanceUID]) {
                    seriesGroups[img.seriesInstanceUID] = {
                        seriesUID: img.seriesInstanceUID,
                        seriesNumber: img.seriesNumber,
                        seriesDescription: img.seriesDescription || 'Unnamed Series',
                        images: [],
                        instanceId: img.instanceId // Store first instance ID for thumbnail
                    };
                }
                seriesGroups[img.seriesInstanceUID].images.push(img);
            });
            
            const seriesArray = Object.values(seriesGroups).sort((a, b) => a.seriesNumber - b.seriesNumber);
            console.log('Series found:', seriesArray.length);
            
            // Convert images to format expected by main viewer
            const formattedImages = data.images.map((img, index) => ({
                id: img.instanceId, // Use Orthanc instance ID as the ID
                patient_name: img.patientName || data.patientName || 'Anonymous',
                series_description: img.seriesDescription,
                study_description: data.studyDescription || 'PACS Study',
                file_name: img.fileName || `image-${String(img.instanceNumber || index + 1).padStart(6, '0')}.dcm`,
                orthancInstanceId: img.instanceId, // Mark as Orthanc image
                isOrthancImage: true, // Flag to identify this is from Orthanc
                sopInstanceUID: img.sopInstanceUID,
                seriesInstanceUID: img.seriesInstanceUID,
                originalIndex: index
            }));
            
            // FIXED: Populate series list first, then load images
            if (window.DICOM_VIEWER && window.DICOM_VIEWER.loadImageSeries) {
                // First populate the series list so it's visible
                window.DICOM_VIEWER.populateSeriesList(formattedImages);
                
                // Then load the images
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
