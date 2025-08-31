document.addEventListener('DOMContentLoaded', async () => {
    const backButton = document.getElementById('backButton');
    const continueButton = document.getElementById('continueButton');
    const refreshButton = document.getElementById('refreshButton');
    const statusText = document.getElementById('statusText');

    const sheetInfo = document.getElementById('sheetInfo');
    const sheetNameText = document.getElementById('sheetNameText');

    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const tableWrapper = document.getElementById('tableWrapper');
    const tableBody = document.getElementById('tableBody');

    let currentWorkbook = null;
    let currentSheetName = null;
    let currentSheetData = null;

    let selectedColumns = [];

    /* This variable is to detect the index of the last row in the original excel file */
    let lastExcelRowNumber = 0;

    /* This variable is to detect the index of the selected header in the original excel file */
    let headerRowOriginalIndex = 1; 

    /*
        The 'loadSheetData' function loads the data from out Excel sheet.
        First, we get the sheet name stored in localStorage, then we convert our
        sheet to uint8Array format so we can read it using XSLX library.
        The sheet is converted to JSON format.
    */
    async function loadSheetData() {
        try {
            currentSheetName = localStorage.getItem('selectedSheet');
            if (!currentSheetName) {
                statusText.textContent = 'No sheet selected. Please go back and select a sheet.';
                return;
            }

            /* Get file from Electron main process */
            const { source: byteArray } = await window.electronAPI.getBothExcelFiles();
            if (!byteArray || byteArray.length === 0) {
                statusText.textContent = 'No source file found. Please go back and select a file.';
                return;
            }

            const uint8Array = new Uint8Array(byteArray);
            currentWorkbook = XLSX.read(uint8Array, { type: 'array' });

            const worksheet = currentWorkbook.Sheets[currentSheetName];
            if (!worksheet) {
                statusText.textContent = 'Selected sheet not found in file.';
                return;
            }

            /* 
                here we convert the sheet to JSON
                This special option tells SheetJS:
                “Don’t treat the first row as field names — just give me each row as an array.”
            */
            currentSheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            displaySheetInfo();
            displayDataTable();

            statusText.textContent = 'Sheet data loaded successfully';

        } catch (error) {
            console.error('Error loading sheet data:', error);
            statusText.textContent = 'Error loading sheet data';
            showEmptyState();
        }
    }

    function displaySheetInfo() {
        sheetNameText.textContent = currentSheetName;
        sheetInfo.style.display = 'block';
    }

    function displayDataTable() {
        if (!currentSheetData || currentSheetData.length === 0) {
            showEmptyState();
            return;
        }

        /* Count empty rows that XLSX skipped */
        const emptyRowsAtTop = countEmptyRowsAtTop();

        loadingState.style.display = 'none';
        emptyState.style.display = 'none';
        tableWrapper.style.display = 'block';

        /*  Clear existing table content  */
        tableBody.innerHTML = '';

        /*  Find the maximum number of columns across all rows  */
        const maxColumns = Math.max(...currentSheetData.map(row => row ? row.length : 0));

        /*  Get headers (first row) and ensure we have enough columns  */
        const firstRow = currentSheetData[0] || [];
        const headers = [];
        for (let i = 0; i < maxColumns; i++) {
            headers.push(firstRow[i] || `Column ${i + 1}`);
        }

        /* Here, we create table rows (limit to first 1000 rows for performance) */
        const maxRows = Math.min(currentSheetData.length, 1000);

        for (let i = 0; i < maxRows; i++) {
            const tr = document.createElement('tr');
            const row = currentSheetData[i] || [];

            /* Here we store 1-based original Excel index accounting for skipped empty rows */
            tr.setAttribute('data-original-excel-index', emptyRowsAtTop + i + 1);


            /* At the first element of each row, we add checkbox cell */
            const checkboxTd = document.createElement('td');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkboxTd.appendChild(checkbox);
            tr.appendChild(checkboxTd);

            for (let j = 0; j < maxColumns; j++) {
                const td = document.createElement('td');
                const val = row[j];

                td.textContent = val ? val.toString() : '';
                if (!val && val !== 0) td.style.color = '#666';
                else td.title = val.toString();

                tr.appendChild(td);
            }
            tableBody.appendChild(tr);
        }

        lastExcelRowNumber = findLastRowWithData() + 1;

        /* Set initial header index accounting for skipped empty rows */
        headerRowOriginalIndex = emptyRowsAtTop + 1;
        console.log('Initial header row original Excel index:', headerRowOriginalIndex);



        const deleteRowBtn = document.getElementById("deleteRowButton");
        if (maxColumns > 0) {
            deleteRowBtn.hidden = false;
            deleteRowBtn.disabled = false;

            /*
            * Here, if we click the delete button, every row with checked checkbox
            * will be deleted.
            */
            deleteRowBtn.addEventListener('click', () => {
                const rows = tableBody.querySelectorAll("tr");

                rows.forEach(row => {
                    const checkbox = row.querySelector('input[type="checkbox"]');
                    if (checkbox.checked) {
                        row.remove();
                    }
                });

                const remainingRows = tableBody.querySelectorAll("tr");
                if (remainingRows.length > 0) {
                    const newHeaderOriginalIndex = parseInt(remainingRows[0].getAttribute('data-original-excel-index'));
                    if (!isNaN(newHeaderOriginalIndex)) {
                        headerRowOriginalIndex = newHeaderOriginalIndex;
                        console.log('New header row original Excel index after deletion:', headerRowOriginalIndex);
                    }
                } else {
                    console.log('No rows remaining after deletion');
                    headerRowOriginalIndex = -1;
                }
            })
        }

        /*  Show truncation message if needed  */
        if (currentSheetData.length > 1000) {
            statusText.textContent = `Showing first 1000 rows of ${currentSheetData.length} total rows`;
        }
    }

    function showEmptyState() {
        loadingState.style.display = 'none';
        emptyState.style.display = 'block';
        tableWrapper.style.display = 'none';
    }

    backButton.addEventListener('click', () => {
        window.location.href = 'select-sheet-source.html';
    });

    continueButton.addEventListener('click', async () => {
        await window.electronAPI.setFinalSelectedTable(tableBody.innerHTML);
        /* Store in localStorage for other JS files to access */
        localStorage.setItem('lastExcelRowNumber', lastExcelRowNumber);
        localStorage.setItem('headerRowOriginalIndex', headerRowOriginalIndex);

        console.log('Storing header row original Excel index:', headerRowOriginalIndex);
        if (currentSheetData && currentSheetData.length > 0) {
            window.location.href = 'select-sheet-target.html';
        } else {
            statusText.textContent = 'No data available to map. Please select a different sheet.';
        }
    });

    refreshButton.addEventListener('click', () => {
        loadingState.style.display = 'block';
        emptyState.style.display = 'none';
        tableWrapper.style.display = 'none';
        sheetInfo.style.display = 'none';

        headerRowOriginalIndex = 1;
        countEmptyRowsAtTop();

        setTimeout(() => {
            loadSheetData();
        }, 500);
    });

    /* 
        Here we calculate the number of empty rows at the top first of the excel table 
        We stop the calculation when we find the first row with data.
    */
    function countEmptyRowsAtTop() {
        if (!currentWorkbook || !currentSheetName) {
            return 0;
        }
        const worksheet = currentWorkbook.Sheets[currentSheetName];
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
        const startRow = range.s.r; // First row with any data in the sheet
        return startRow;
    }



    const selectColumnsBtn = document.getElementById("selectColumnsButton");
    selectColumnsBtn.addEventListener("click", () => {
        /*
            When the popup appears, it must display the list of columns names to the user,
            for that we read the first row which is equivalent to the header : "firstRow",
            after this we read the list of "td" elements inside that header : "columnsNames".
        */
        document.getElementById("popupModal").style.display = "flex";
        const firstRow = tableBody.querySelectorAll("tr")[0];
        const columnsNames = firstRow.querySelectorAll("td");
        const popupDivContent = document.querySelector(".popup-column-list");
        popupDivContent.innerHTML = "";
        let checkboxCount = 0;
        for (let k = 1; k < columnsNames.length; k++) {
            const text = columnsNames[k].textContent?.trim();
            if (text) {
                const div = document.createElement('div');
                div.className = 'col-item';
                const input = document.createElement('input');
                input.type = 'checkbox';
                const label = document.createElement('label');
                label.textContent = columnsNames[k].textContent;

                /* Add event listener to update button state when checkbox changes */
                input.addEventListener('change', updateValidateButtonState);

                div.appendChild(input);
                div.appendChild(label);
                popupDivContent.appendChild(div);

                checkboxCount++;
            }
        }
        /*
            Here we create the button that gonna validate our selection
        */
        const popup_content = document.querySelector(".popup-content");
        let button_col_validation = document.getElementById('col-validation-btn');

        /*
            Before creating the 'Validate' button, we need to make sure there is
            columns to check. 'checkboxCount' returns the number of checkboxes
            inside the popupDivContent.
        */
        if (checkboxCount > 0) {
            if (!button_col_validation) {
                const button_i_element = document.createElement('i');
                button_i_element.className = 'fas fa-check';

                button_col_validation = document.createElement('button');
                button_col_validation.id = 'col-validation-btn';
                button_col_validation.className = 'action-button';
                button_col_validation.disabled = true;

                const labelText = document.createElement('span');
                labelText.textContent = " Validate";

                button_col_validation.appendChild(button_i_element);
                button_col_validation.appendChild(labelText);

                /*
                When the columns to keep are selected, if the validation button is clicked,
                the columns names are saved in 'selectedColumns'.
                */
                button_col_validation.addEventListener('click', () => {
                    handleColumnValidation();
                })
                popup_content.appendChild(button_col_validation);
            }
            /* If button already exists, just make sure it's visible */
            if (button_col_validation) {
                button_col_validation.style.display = 'flex';
            }
        } else {
            if (button_col_validation) {
                button_col_validation.remove();
            }
            const paragraph = document.createElement('p');
            paragraph.textContent = "Your header row doesn't contain any names values. Make sure you header is compliant."
            popupDivContent.appendChild(paragraph);
        }
    })

    /*
        When the columns to keep are selected, if the validation button is clicked,
        the columns names are saved in 'selectedColumns'.
    */
    function handleColumnValidation() {
        selectedColumns = [];
        const list_selected_col_divs = document.querySelectorAll('.col-item');
        for (let p = 0; p < list_selected_col_divs.length; p++) {
            const checkbox = list_selected_col_divs[p].querySelector('input[type="checkbox"]');
            const label = list_selected_col_divs[p].querySelector('label');
            if (checkbox && checkbox.checked && label) {
                const col_name = label.textContent?.trim();
                if (col_name) {
                    selectedColumns.push(col_name);
                }
            }
        }

        const headerRow = tableBody.querySelectorAll("tr")[0];
        const headerCells = headerRow.querySelectorAll("td");

        /*  Here, we find indexes of columns to keep  */
        const columnIndexesToKeep = [];
        for (let i = 1; i < headerCells.length; i++) {
            const colText = headerCells[i].textContent?.trim();
            if (selectedColumns.includes(colText)) {
                columnIndexesToKeep.push(i);
            }
        }

        /*  Looping through each row in the table  */
        const rows = tableBody.querySelectorAll("tr");
        rows.forEach(row => {
            const cells = row.querySelectorAll("td");

            /*  We loop **backward** to safely remove  */
            for (let i = cells.length - 1; i > 0; i--) {
                if (!columnIndexesToKeep.includes(i)) {
                    row.removeChild(cells[i]);
                }
            }
        });

        /*
            close the popup after the button is clicked
        */
        document.getElementById("popupModal").style.display = "none";
    }

    /* This function finds the last row in a worksheet that contains actual data */
    function findLastRowWithData() {
        if (!currentSheetData || currentSheetData.length === 0) {
            return 0;
        }
        /* We start from the last row and work backwards */
        for (let rowIndex = currentSheetData.length - 1; rowIndex >= 0; rowIndex--) {
            const row = currentSheetData[rowIndex];
            /* Check if this row has any non-empty cells */
            if (row && row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
                return rowIndex + 1; // +1 because Excel rows are 1-indexed
            }
        }
        /* If no data found */
        return 0; 
    }

    /*
        This function checks if at least one checkbox is checked,
        if yes, the validate button is enabled
        if no, the validate button stays at disabled state
    */
    function updateValidateButtonState() {
        const button_col_validation = document.getElementById('col-validation-btn');
        if (!button_col_validation) return;
        const checkboxes = document.querySelectorAll('.col-item input[type="checkbox"]');
        const hasCheckedBox = Array.from(checkboxes).some(checkbox => checkbox.checked);

        /* Enable/disable button based on checkbox state */
        button_col_validation.disabled = !hasCheckedBox;
    }

    document.getElementById("closePopupBtn").addEventListener("click", () => {
        document.getElementById("popupModal").style.display = "none";
    });

    window.addEventListener("click", (e) => {
        const modal = document.getElementById("popupModal");
        if (e.target === modal) {
            modal.style.display = "none";
        }
    });
    await loadSheetData();
});