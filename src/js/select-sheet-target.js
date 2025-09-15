document.addEventListener('DOMContentLoaded', async () => {
    const sheetsSelect = document.getElementById('sheetsSelect');
    const validateButton = document.getElementById('validateButton');
    const backButton = document.getElementById('backButton');
    const statusText = document.getElementById('statusText');

    try {
        statusText.textContent = 'Loading sheets from file...';

        /* Here we get file from Electron main process (via preload.js) */
        const files = await window.electronAPI.getBothExcelFiles();
        const byteArray = files.target;


        if (!byteArray || byteArray.length === 0) {
            statusText.textContent = 'No source file found. Please go back and select a file.';
            return;
        }

        const uint8Array = new Uint8Array(byteArray);
        const workbook = XLSX.read(uint8Array, { type: 'array' });
        const sheetNames = workbook.SheetNames;

        /* In this part we populate the dropdown menu */
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

    /* 
        This listens for when we select a sheet from the dropdown menu. 
        If a sheet is selected, the validate button is enabled and gets a "pulse" effect to highlight it. 
        The status text also updates to show which sheet was chosen. 
        If the selection is cleared, the button is disabled, the pulse is removed, 
        and the status tells us to pick a sheet. 
    */
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

    /* 
        When the validate button is clicked, the code first checks that it’s enabled. 
        Then, it grabs the selected sheet, changes the button text to a spinner (loading animation), 
        and disables it to prevent multiple clicks. 
        The chosen sheet name is stored in localStorage (so it can be accessed on the next page). 
        Finally, after a short delay (1 second), the app redirects us to display-data-content.html, 
        where the sheet data will be displayed. 
    */
    validateButton.addEventListener('click', () => {
        if (!validateButton.disabled) {
            const selectedSheet = sheetsSelect.value;
            validateButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            validateButton.disabled = true;
            localStorage.setItem('selectedSheet', selectedSheet);
            setTimeout(() => {
                window.location.href = 'display-data-content.html';
            }, 1000);
        }
    });

    /* 
        This part is simple: when the back button is clicked, it redirects us back to the 
        display-source-content.html page. 
        This allows us to go back and select a different source file if needed. 
    */
    backButton.addEventListener('click', () => {
        window.location.href = 'display-source-content.html';
    });
});