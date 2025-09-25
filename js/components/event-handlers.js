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
            console.error('Global error:', event.error);
            window.DICOM_VIEWER.showAISuggestion('An error occurred. Please refresh the page or contact support if the issue persists.');
        });
    }
};