let startCell = null, endCell = null;
let json = [];
let firstOriginalTableHTML = '';

function highlightSelection(start, end) {
    const cells = document.querySelectorAll('td');
    cells.forEach(cell => cell.classList.remove('selected'));

    if (!start || !end) return;

    const startCoords = getCellCoords(start.dataset.cell);
    const endCoords = getCellCoords(end.dataset.cell);

    const minRow = Math.min(startCoords.row, endCoords.row);
    const maxRow = Math.max(startCoords.row, endCoords.row);

    const minCol = Math.min(+start.dataset.colIndex, +end.dataset.colIndex);
    const maxCol = Math.max(+start.dataset.colIndex, +end.dataset.colIndex);

    cells.forEach(cell => {
        const row = parseInt(cell.dataset.row, 10);
        const col = parseInt(cell.dataset.colIndex, 10);
        if (row >= minRow && row <= maxRow && col >= minCol && col <= maxCol) {
            cell.classList.add('selected');
        }
    });

    const colStart = getColumnLabel(minCol);
    const colEnd = getColumnLabel(maxCol);
    rangeInfo.textContent = `Selected range: ${colStart}${minRow}:${colEnd}${maxRow}`;
}

function getColumnLabel(index) {
    let label = '';
    while (index >= 0) {
        label = String.fromCharCode((index % 26) + 65) + label;
        index = Math.floor(index / 26) - 1;
    }
    return label;
}

function getCellCoords(cellAddress) {
    const match = cellAddress.match(/^([A-Z]+)(\d+)$/);
    return {
        col: match[1],
        row: parseInt(match[2], 10),
    };
}

let rangeInfo = null;

(async () => {
    const excelContainer = document.getElementById('excel-container');
    rangeInfo = document.getElementById('range-info');

    try {
        const files = await window.electronAPI.getBothExcelFiles();

        if (!files || (!files.target && !files.target)) {
            excelContainer.innerHTML = '<div class="error">No Excel files loaded. Please go back and select files.</div>';
            return;
        }

        let buffer = files.target;

        /* Convert array to Uint8Array if needed */
        const uint8Array = Array.isArray(buffer) ? new Uint8Array(buffer) : buffer;

        /* Read the workbook */
        const workbook = XLSX.read(uint8Array, { type: 'array' });

        /* Get the selected sheet name from localStorage (set in the previous page) */
        const selectedSheetName = localStorage.getItem('selectedSheet');

        let sheetName;
        if (selectedSheetName && workbook.SheetNames.includes(selectedSheetName)) {
            /* Use the user's selected sheet */
            sheetName = selectedSheetName;
            console.log(`Loading selected sheet: ${sheetName}`);
        } else {
            /* Fallback to first sheet if no selection or sheet not found */
            sheetName = workbook.SheetNames[0];
            console.warn(`Selected sheet "${selectedSheetName}" not found. Using first sheet: ${sheetName}`);
        }

        const sheet = workbook.Sheets[sheetName];
        json = XLSX.utils.sheet_to_json(sheet, { header: 1 });



        /*  Build the table */
        let table = '<table>';
        json.forEach((row, rowIndex) => {
            table += '<tr>';
            row.forEach((cell, colIndex) => {
                const colLabel = getColumnLabel(colIndex);
                const cellAddress = `${colLabel}${rowIndex + 1}`;
                table += `<td data-cell="${cellAddress}" data-row="${rowIndex + 1}" data-col-index="${colIndex}">${cell || ''}</td>`;
            });
            table += '</tr>';
        });
        table += '</table>';
        excelContainer.innerHTML = table;
        firstOriginalTableHTML = table;





        /*
         * Adding event listeners to table cells
        */
        const tds = document.querySelectorAll('td');
        tds.forEach(td => {
            td.addEventListener('mousedown', () => {
                startCell = td;
                endCell = null;
                highlightSelection(startCell, startCell);
            });

            td.addEventListener('mouseenter', (e) => {
                if (startCell && e.buttons === 1) {
                    endCell = td;
                    highlightSelection(startCell, endCell);
                }
            });

            td.addEventListener('mouseup', () => {
                if (startCell && endCell) {
                    highlightSelection(startCell, endCell);
                }
            });
        });


        const validateButton = document.querySelector('.validate-button');
        validateButton.addEventListener('click', () => {
            if (!startCell || !endCell) {
                alert("Please select at least two cells.");
                return;
            }

            const startCoords = getCellCoords(startCell.dataset.cell);
            const endCoords = getCellCoords(endCell.dataset.cell);

            const minRow = Math.min(startCoords.row, endCoords.row);
            const maxRow = Math.max(startCoords.row, endCoords.row);
            const minCol = Math.min(+startCell.dataset.colIndex, +endCell.dataset.colIndex);
            const maxCol = Math.max(+startCell.dataset.colIndex, +endCell.dataset.colIndex);

            const totalCells = (maxRow - minRow + 1) * (maxCol - minCol + 1);

            if (totalCells < 2) {
                alert("Please select at least two cells.");
                return;
            }

            /* Build new table from selected range */
            let selectedTable = '<table>';
            for (let i = minRow - 1; i < maxRow; i++) {
                selectedTable += '<tr>';
                for (let j = minCol; j <= maxCol; j++) {
                    const cellValue = json[i] && json[i][j] !== undefined ? json[i][j] : '';
                    selectedTable += `<td>${cellValue}</td>`;
                }
                selectedTable += '</tr>';
            }
            selectedTable += '</table>';

            /* Replace table with selected content */
            document.getElementById('excel-container').innerHTML = selectedTable;

            /* Optional: update range info */
            const colStart = getColumnLabel(minCol);
            const colEnd = getColumnLabel(maxCol);
            document.getElementById('range-info').textContent = `Validated range: ${colStart}${minRow}:${colEnd}${maxRow}`;
        });

    } catch (error) {
        console.error('Error loading Excel file:', error);
        excelContainer.innerHTML = '<div class="error">Error loading Excel file. Please try again.</div>';
    }
})();

const popup = document.querySelector('.popup');
const popupDevContent = document.querySelector('.popup-content');

/* Utility: Show popup with title */
function openPopup(titleText) {
    popupDevContent.innerHTML = '';
    popup.style.display = "flex";
    document.body.classList.add('modal-open');

    const title = document.createElement('h2');
    title.className = 'popup-title';
    title.textContent = titleText;
    popupDevContent.appendChild(title);
}

/* Utility: Add Close button to popup */
function addCloseButton(marginTop = "5%") {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'closeBtn';
    closeBtn.textContent = 'Close';
    closeBtn.style.marginTop = marginTop;
    popupDevContent.appendChild(closeBtn);

    closeBtn.addEventListener('click', () => {
        popup.style.display = "none";
        document.body.classList.remove('modal-open');
    });
}

/* Notes Button Logic */
document.querySelector('.notes-button').addEventListener('click', () => {
    openPopup("Instructions");

    const messageDiv = document.createElement('div');
    messageDiv.className = "message-content";
    popupDevContent.appendChild(messageDiv);

    const messages = [
        "1- Select your table which contains data and make sure the first row of it is the table header.",
        "2- The first line in the table will be considered as table header.",
        "3- Press 'Validate' button to confirm your selection."
    ];

    messages.forEach(text => {
        const p = document.createElement('p');
        p.className = 'p-tag';
        p.textContent = text;
        messageDiv.appendChild(p);
    });

    addCloseButton("5%");
});

const refreshButton = document.querySelector('.refresh-button');
refreshButton.addEventListener('click', () => {
    document.getElementById('excel-container').innerHTML = firstOriginalTableHTML;
    document.getElementById('range-info').textContent = "Selected range: None";

    /* Re-add event listeners for selection after restoring table */
    const tds = document.querySelectorAll('td');
    tds.forEach(td => {
        td.addEventListener('mousedown', () => {
            startCell = td;
            endCell = null;
            highlightSelection(startCell, startCell);
        });

        td.addEventListener('mouseenter', (e) => {
            if (startCell && e.buttons === 1) {
                endCell = td;
                highlightSelection(startCell, endCell);
            }
        });

        td.addEventListener('mouseup', () => {
            if (startCell && endCell) {
                highlightSelection(startCell, endCell);
            }
        });
    });
});

const backButton = document.getElementById('backButton');
backButton.addEventListener('click', () => {
    window.location.href = 'select-sheet-target.html';
});

const continueButton = document.querySelector('.continue-button');
continueButton.addEventListener('click', async () => {
    const tableDiv = document.getElementById('excel-container');
    const tableBody = tableDiv.querySelector('table');
    await window.electronAPI.setFinalSelectedTableData(tableBody.innerHTML);
    window.location.href = 'mapping.html';
});