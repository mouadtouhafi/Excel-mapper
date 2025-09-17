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

        /* 
            After reading the sheet names, this part populates the dropdown menu dynamically. 
            It first sets a default placeholder option, then loops through all sheet names to 
            create <option> elements, which are appended to the dropdown. 
            The statusText is updated to inform the user how many sheets were found. 
            The try...catch block ensures that if an error occurs during file reading or 
            sheet extraction, it is logged to the console and the user sees an error message in the interface.
        */
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
        This code listens for changes in the dropdown. 
        When the user selects a sheet, it enables the validate button and adds a visual 
        cue (pulse class) to indicate readiness. 
        If no sheet is selected, the button is disabled and the status instructs the user to select one. 
        This ensures the user cannot proceed without picking a sheet and provides immediate visual 
        feedback about their selection.
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
        When the validate button is clicked, this code first ensures it’s enabled. 
        It updates the button to show a spinning loader to indicate processing and disables 
        it to prevent multiple clicks. 
        The selected sheet name is saved in localStorage for use on the next page. 
        After a 1-second delay (using setTimeout), the page redirects to display-source-content.html 
        to display the content of the selected sheet.
    */
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