// Event Handlers Component
window.DICOM_VIEWER.EventHandlers = {
    initialize() {
        this.setupWindowResize();
        this.setupErrorHandling();
    },

    setupWindowResize() {
        window.addEventListener('resize', function() {
            document.querySelectorAll('.viewport').forEach(element => {
                try {
                    cornerstone.resize(element);
                } catch (error) {
                    // Can happen if element is not enabled yet
                }
            });
        });
    },

setupErrorHandling() {
    window.addEventListener('error', function(event) {
        // Log the full event for more context
        console.error('A global error was caught:', event);
        
        let errorMessage = 'An unexpected error occurred.';
        if (event.message) {
            errorMessage = event.message;
        } else if (event.error && event.error.message) {
            errorMessage = event.error.message;
        }
        
        // Use your existing UI function to show the error
        window.DICOM_VIEWER.showAISuggestion(`Error: ${errorMessage}. See console for details.`);
    });

    window.addEventListener('unhandledrejection', function(event) {
        console.error('Caught an unhandled promise rejection:', event.reason);
        const errorMessage = event.reason.message || 'Promise rejection';
        window.DICOM_VIEWER.showAISuggestion(`Async Error: ${errorMessage}.`);
    });
}
};


window.DICOM_VIEWER.ReportingEvents = {
    initialize() {
        this.attachGlobalEvents();
        this.attachReportingShortcuts();
    },

    // Helper method to clean JSON responses
    cleanJSONResponse(responseText) {
        if (!responseText) return responseText;
        
        // Remove HTML error messages that might be appended to JSON
        const jsonStart = responseText.indexOf('{');
        const jsonEnd = responseText.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            return responseText.substring(jsonStart, jsonEnd + 1);
        }
        
        return responseText;
    },

    attachGlobalEvents() {
        this.addReportingButton();
        this.enhanceSeriesListWithReportStatus();
    },

    addReportingButton() {
        // Create floating reporting button for quick access
        const floatingButton = document.createElement('button');
        floatingButton.id = 'floating-report-btn';
        floatingButton.className = 'btn btn-primary floating-btn';
        floatingButton.innerHTML = '<i class="bi bi-file-medical-fill"></i>';
        floatingButton.title = 'Create Medical Report (Ctrl+R)';
        floatingButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
            display: none;
            align-items: center;
            justify-content: center;
        `;

        floatingButton.addEventListener('click', () => {
            if (window.DICOM_VIEWER.MANAGERS.reportingSystem) {
                window.DICOM_VIEWER.MANAGERS.reportingSystem.enterReportingMode();
            }
        });

        document.body.appendChild(floatingButton);

        // Show floating button when images are loaded
        const originalLoadImageSeries = window.DICOM_VIEWER.loadImageSeries;
        if (originalLoadImageSeries) {
            window.DICOM_VIEWER.loadImageSeries = async function(uploadedFiles) {
                const result = await originalLoadImageSeries.call(this, uploadedFiles);
                
                if (uploadedFiles && uploadedFiles.length > 0) {
                    floatingButton.style.display = 'flex';
                }
                
                return result;
            };
        }
    },

    enhanceSeriesListWithReportStatus() {
        // Override the populateSeriesList function to add report indicators
        const originalPopulateSeriesList = window.DICOM_VIEWER.populateSeriesList;
        
        if (originalPopulateSeriesList) {
            window.DICOM_VIEWER.populateSeriesList = async function(files) {
                // Call original function
                originalPopulateSeriesList.call(this, files);
                
                // Add report status indicators with better error handling
                if (window.DICOM_VIEWER.MANAGERS.reportingSystem) {
                    await window.DICOM_VIEWER.ReportingEvents.addReportStatusToSeriesList(files);
                }
            };
        }
    },

async addReportStatusToSeriesList(files) {
    console.log(`Checking report status for ${files.length} files`);
    
    // Use Promise.all for concurrent checks (faster)
    const checkPromises = files.map(async (file) => {
        try {
            const response = await fetch(`check_report.php?imageId=${file.id}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) {
                console.warn(`Check report failed for ${file.id}: HTTP ${response.status}`);
                return { fileId: file.id, hasReport: false };
            }
            
            const responseText = await response.text();
            const cleanedResponse = this.cleanJSONResponse(responseText);
            
            let result;
            try {
                result = JSON.parse(cleanedResponse);
            } catch (parseError) {
                console.warn(`JSON parse error for ${file.id}:`, parseError);
                return { fileId: file.id, hasReport: false };
            }
            
            const hasReport = result && result.success && result.exists;
            return { fileId: file.id, hasReport: hasReport };
            
        } catch (error) {
            console.error(`Failed to check report status for ${file.id}:`, error);
            return { fileId: file.id, hasReport: false };
        }
    });
    
    // Wait for all checks to complete
    const results = await Promise.all(checkPromises);
    
    // Add indicators for files with reports
    let reportCount = 0;
    results.forEach(result => {
        if (result.hasReport) {
            reportCount++;
            const seriesItem = document.querySelector(`[data-file-id="${result.fileId}"]`);
            if (seriesItem) {
                this.addReportIndicatorToSeriesItem(seriesItem);
            }
        }
    });
    
    console.log(`Found ${reportCount} reports out of ${files.length} files`);
},

    addReportIndicatorToSeriesItem(seriesItem) {
        // Check if indicator already exists
        if (seriesItem.querySelector('.report-indicator')) return;

        const indicator = document.createElement('div');
        indicator.className = 'report-indicator';
        indicator.innerHTML = '<i class="bi bi-file-medical-fill"></i>';
        indicator.title = 'Medical report available';
        indicator.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            background: #28a745;
            color: white;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            z-index: 5;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;

        seriesItem.style.position = 'relative';
        seriesItem.appendChild(indicator);

        // Add click handler to load existing report
        indicator.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.DICOM_VIEWER.MANAGERS.reportingSystem) {
                window.DICOM_VIEWER.MANAGERS.reportingSystem.loadExistingReport();
            }
        });
    },

    attachReportingShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when not in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const reportingSystem = window.DICOM_VIEWER.MANAGERS.reportingSystem;
            if (!reportingSystem) return;

            switch (true) {
                case (e.ctrlKey && e.key === 'r'): // Ctrl+R: Start reporting
                    e.preventDefault();
                    if (!reportingSystem.reportingMode) {
                        reportingSystem.enterReportingMode();
                    }
                    break;

                case (e.key === 'Escape' && reportingSystem.reportingMode): // ESC: Exit reporting
                    reportingSystem.exitReportingMode();
                    break;

                case (e.ctrlKey && e.key === 's' && reportingSystem.reportingMode): // Ctrl+S: Save report
                    e.preventDefault();
                    reportingSystem.saveReport();
                    break;

                case (e.ctrlKey && e.key === 'p' && reportingSystem.reportingMode): // Ctrl+P: Print report
                    e.preventDefault();
                    reportingSystem.printReport();
                    break;
            }
        });
    }
};