// Upload Handler Component
window.DICOM_VIEWER.UploadHandler = {
    initialize() {
        const fileInput = document.getElementById('dicomFileInput');
        const folderInput = document.getElementById('dicomFolderInput');
        const uploadSingleBtn = document.getElementById('uploadSingle');
        const uploadSeriesBtn = document.getElementById('uploadSeries');
        const uploadFolderBtn = document.getElementById('uploadFolder');

        fileInput.addEventListener('change', this.handleFileUpload.bind(this));
        folderInput.addEventListener('change', this.handleFolderUpload.bind(this));

        uploadSingleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            fileInput.removeAttribute('multiple');
            fileInput.removeAttribute('webkitdirectory');
            fileInput.click();
        });

        uploadSeriesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            fileInput.setAttribute('multiple', 'multiple');
            fileInput.removeAttribute('webkitdirectory');
            fileInput.click();
        });

        uploadFolderBtn.addEventListener('click', (e) => {
            e.preventDefault();
            folderInput.click();
        });

        const mainUploadLabel = document.querySelector('label[for="dicomFileInput"]');
        if (mainUploadLabel) {
            mainUploadLabel.addEventListener('click', (e) => {
                e.preventDefault();
                fileInput.setAttribute('multiple', 'multiple');
                fileInput.removeAttribute('webkitdirectory');
                fileInput.click();
            });
        }
    },

    handleFileUpload(event) {
        const files = event.target.files;
        if (files && files.length > 0) {
            console.log(`Selected ${files.length} file(s) for upload`);
            window.DICOM_VIEWER.STATE.uploadQueue = Array.from(files);
            window.DICOM_VIEWER.showLoadingIndicator(`Uploading ${files.length} file(s)...`);
            this.processUploadQueue();
        } else {
            console.log('No files selected');
        }
    },

    handleFolderUpload(event) {
        console.log('Folder input changed, files selected:', event.target.files.length);
        const files = Array.from(event.target.files);
        const seriesGroups = this.groupFilesBySeries(files);
        this.uploadSeriesGroups(seriesGroups);
    },

    groupFilesBySeries(files) {
        const groups = {};
        files.forEach(file => {
            const pathParts = file.webkitRelativePath.split('/');
            const seriesFolder = pathParts[pathParts.length - 2] || 'default';
            if (!groups[seriesFolder]) {
                groups[seriesFolder] = [];
            }
            groups[seriesFolder].push(file);
        });
        return groups;
    },

    uploadSeriesGroups(seriesGroups) {
        console.log('Processing series groups:', Object.keys(seriesGroups));
        Object.keys(seriesGroups).forEach(seriesName => {
            const files = seriesGroups[seriesName];
            console.log(`Processing series: ${seriesName} with ${files.length} files`);
            window.DICOM_VIEWER.STATE.uploadQueue = [...window.DICOM_VIEWER.STATE.uploadQueue, ...files];
        });
        if (window.DICOM_VIEWER.STATE.uploadQueue.length > 0) {
            window.DICOM_VIEWER.showLoadingIndicator(`Uploading ${window.DICOM_VIEWER.STATE.uploadQueue.length} file(s) from folders...`);
            this.processUploadQueue();
        }
    },

    async processUploadQueue() {
        const state = window.DICOM_VIEWER.STATE;
        
        if (state.uploadInProgress || state.uploadQueue.length === 0) return;

        state.uploadInProgress = true;
        window.DICOM_VIEWER.showLoadingIndicator(`Processing ${state.uploadQueue.length} files...`);

        try {
            let allUploadedFiles = [];
            let processedCount = 0;

            for (const file of state.uploadQueue) {
                try {
                    processedCount++;
                    window.DICOM_VIEWER.showLoadingIndicator(`Processing files... ${processedCount}/${state.uploadQueue.length}`);

                    const result = await this.uploadSingleFile(file);
                    allUploadedFiles.push(result);
                } catch (error) {
                    console.error(`Error uploading ${file.name}:`, error);
                }
            }

            if (allUploadedFiles.length > 0) {
                await window.DICOM_VIEWER.loadImageSeries(allUploadedFiles);
            } else {
                window.DICOM_VIEWER.showErrorMessage('No files were uploaded successfully');
            }

        } finally {
            state.uploadInProgress = false;
            state.uploadQueue = [];
            document.getElementById('dicomFileInput').value = '';
            window.DICOM_VIEWER.hideLoadingIndicator();
        }
    },

    uploadSingleFile(file) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('dicomFile', file);

            fetch('upload.php', { method: 'POST', body: formData })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(errorData => {
                            throw new Error(errorData.message || `HTTP ${response.status}`);
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success === false) {
                        throw new Error(data.message || 'Upload failed');
                    }
                    resolve(data);
                })
                .catch(error => reject(error));
        });
    }
};