// Image Enhancement Manager
window.DICOM_VIEWER.ImageEnhancementManager = class {
    constructor() {
        this.originalStates = new Map();
        this.currentEnhancements = new Map();
        this.enabled = true;
    }

    storeOriginalState(viewport, image) {
        if (!this.originalStates.has(viewport)) {
            this.originalStates.set(viewport, {
                windowWidth: image.windowWidth || 400,
                windowCenter: image.windowCenter || 40,
                minPixelValue: image.minPixelValue,
                maxPixelValue: image.maxPixelValue,
                slope: image.slope || 1,
                intercept: image.intercept || 0,
                photometricInterpretation: image.photometricInterpretation,
                originalViewport: cornerstone.getViewport(viewport)
            });
        }
    }

    applyEnhancement(viewport, brightness, contrast, sharpening) {
        if (!this.enabled) return;

        try {
            const enabledElement = cornerstone.getEnabledElement(viewport);
            if (!enabledElement || !enabledElement.image) return;

            const originalState = this.originalStates.get(viewport);
            if (!originalState) {
                this.storeOriginalState(viewport, enabledElement.image);
                return this.applyEnhancement(viewport, brightness, contrast, sharpening);
            }

            const baseWindowWidth = originalState.windowWidth;
            const baseWindowCenter = originalState.windowCenter;

            // Calculate new window/level values
            const newWindowWidth = Math.max(1, baseWindowWidth * contrast);
            const newWindowCenter = baseWindowCenter + (brightness * baseWindowWidth * 0.01);

            const currentViewport = cornerstone.getViewport(viewport);
            currentViewport.voi.windowWidth = newWindowWidth;
            currentViewport.voi.windowCenter = newWindowCenter;

            cornerstone.setViewport(viewport, currentViewport);

            // Apply CSS filters for sharpening
            const canvas = viewport.querySelector('canvas');
            if (canvas && sharpening > 0) {
                const filterValue = `contrast(${100 + sharpening * 20}%) brightness(${100 + brightness * 2}%)`;
                canvas.style.filter = filterValue;
            } else if (canvas) {
                canvas.style.filter = `brightness(${100 + brightness * 2}%)`;
            }

            this.currentEnhancements.set(viewport, { brightness, contrast, sharpening });

            console.log(`Applied enhancement: W=${Math.round(newWindowWidth)} L=${Math.round(newWindowCenter)}`);

        } catch (error) {
            console.error('Error applying image enhancement:', error);
        }
    }

    resetEnhancement(viewport) {
        try {
            const originalState = this.originalStates.get(viewport);
            if (!originalState) return;

            const currentViewport = cornerstone.getViewport(viewport);
            currentViewport.voi.windowWidth = originalState.windowWidth;
            currentViewport.voi.windowCenter = originalState.windowCenter;

            cornerstone.setViewport(viewport, currentViewport);

            const canvas = viewport.querySelector('canvas');
            if (canvas) {
                canvas.style.filter = '';
            }

            this.currentEnhancements.delete(viewport);

            console.log('Reset to original DICOM window/level');

        } catch (error) {
            console.error('Error resetting enhancement:', error);
        }
    }

    resetAllEnhancements() {
        const viewports = window.DICOM_VIEWER.MANAGERS.viewportManager ? 
            window.DICOM_VIEWER.MANAGERS.viewportManager.getAllViewports() : 
            document.querySelectorAll('.viewport');

        viewports.forEach(viewport => {
            this.resetEnhancement(viewport);
        });

        // Reset UI controls
        const brightnessSlider = document.getElementById('brightnessSlider');
        const contrastSlider = document.getElementById('contrastSlider');
        const sharpenSlider = document.getElementById('sharpenSlider');

        if (brightnessSlider) brightnessSlider.value = 0;
        if (contrastSlider) contrastSlider.value = 1;
        if (sharpenSlider) sharpenSlider.value = 0;

        console.log('All enhancements reset');
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }
};