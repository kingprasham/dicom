// ADD THIS TO THE END OF YOUR reporting-system.js FILE

// This method should be called after images are loaded to show the button container
async showReportButtons() {
    const buttonContainer = document.getElementById('report-buttons-container');
    if (buttonContainer) {
        buttonContainer.style.display = 'flex';
        console.log('✓ Report buttons container shown');
        
        // Check if current image has a report
        await this.checkCurrentImageForReports();
    }
}

// Call this method when images are loaded
// Add this to your loadImageSeries function at the end
// window.DICOM_VIEWER.MANAGERS.reportingSystem.showReportButtons();
