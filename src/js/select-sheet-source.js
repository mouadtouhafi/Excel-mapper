document.addEventListener('DOMContentLoaded', async () => {
    const sheetsSelect = document.getElementById('sheetsSelect');
    const validateButton = document.getElementById('validateButton');
    const backButton = document.getElementById('backButton');
    const statusText = document.getElementById('statusText');

    try {

        /*
            This section attempts to load Excel files from the Electron main process using a custom 
            API (window.electronAPI.getBothExcelFiles). 
            It first updates the statusText to inform the user. 
            Then it checks if a valid file exists. 
            If not, it updates the status and stops execution. 
            If a file is found, the raw byte array is converted into a Uint8Array suitable for XLSX.read(), 
            which reads the Excel file into a workbook object. 
            The SheetNames property is extracted to get a list of all sheets in the Excel file.    
        */
        statusText.textContent = 'Loading sheets from file...';

        /* Here we get file from Electron main process (via preload.js) */
        const files = await window.electronAPI.getBothExcelFiles();
        const byteArray = files.source;

        if (!byteArray || byteArray.length === 0) {
            statusText.textContent = 'No source file found. Please go back and select a file.';
            return;
        }

        const uint8Array = new Uint8Array(byteArray);
        const workbook = XLSX.read(uint8Array, { type: 'array' });
        const sheetNames = workbook.SheetNames;

        sheetsSelect.innerHTML = '<option value="">Select a sheet...</option>';
        sheetNames.forEach(sheetName => {
            const option = document.createElement('option');
            option.value = sheetName;
            option.textContent = sheetName;
            sheetsSelect.appendChild(option);
        });
        statusText.textContent = `Found ${sheetNames.length} sheet(s). Select one to continue.`;
    } catch (error) {
        console.error('Error loading sheets:', error);
        statusText.textContent = 'Error loading sheets from file.';
        return;
    }

    sheetsSelect.addEventListener('change', () => {
        const selectedSheet = sheetsSelect.value;
        validateButton.disabled = !selectedSheet;
        if (selectedSheet) {
            validateButton.classList.add('pulse');
            statusText.textContent = `Selected sheet: ${selectedSheet}`;
        } else {
            validateButton.classList.remove('pulse');
            statusText.textContent = 'Select a sheet to continue';
        }
    });


    validateButton.addEventListener('click', () => {
        if (!validateButton.disabled) {
            const selectedSheet = sheetsSelect.value;
            validateButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            validateButton.disabled = true;
            localStorage.setItem('selectedSheet', selectedSheet);
            setTimeout(() => {
                window.location.href = 'display-source-content.html';
            }, 1000);
        }
    });

  
    backButton.addEventListener('click', () => {
        window.location.href = 'main-page.html';
    });
});