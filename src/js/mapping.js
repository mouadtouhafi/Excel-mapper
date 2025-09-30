const menuDiv = document.querySelector('.menu-container');
const actionButtonContainer = document.getElementById('actionButtonContainer');

const canvas = document.getElementById('linkCanvas');
const ctx = canvas.getContext('2d');
let connections = [];

let resizeTimeout;


/*
    This resizeCanvas() function ensures that a canvas element and its container dynamically adjust 
    to the size of two side-by-side lists so that visual connections between their items remain accurate. 
    When triggered (typically on window resize or content change), it first clears any pending resize 
    operation and waits 150 ms before running to avoid excessive recalculations. 
    It then measures the total scrollable height of both the left and right lists (dataList-1 and dataList-2), 
    adds a margin of 60 pixels to each, and picks the larger value (with a minimum of 600) as the required 
    canvas height. 
    This value is applied to both the .links-container and the canvas, while the canvas width is set 
    based on the container’s bounding box. 
    Finally, it calls redrawConnections(), which presumably redraws the linking lines or graphics 
    so they stay properly aligned after the resize.
*/
function resizeCanvas() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const leftContainer = document.getElementById('colsXlxToFill');
        const rightContainer = document.getElementById('colsXlxWithData');
        const leftList = document.getElementById('dataList-1');
        const rightList = document.getElementById('dataList-2');
        const linksContainer = document.querySelector('.links-container');

        /* Calculate the total content height including scrollable areas */
        const leftContentHeight = leftList.scrollHeight + 60; 
        const rightContentHeight = rightList.scrollHeight + 60;

        /* Use the larger of the two content heights, with a minimum */
        const maxHeight = Math.max(leftContentHeight, rightContentHeight, 600);

        console.log(`Left content: ${leftContentHeight}, Right content: ${rightContentHeight}, Canvas height: ${maxHeight}`);

        /* Setting the links container height to match the full content */
        linksContainer.style.height = maxHeight + 'px';

        /* Setting canvas dimensions */
        const containerRect = linksContainer.getBoundingClientRect();
        canvas.width = containerRect.width;
        canvas.height = maxHeight;
        canvas.style.height = maxHeight + 'px';

        redrawConnections();
    }, 150);
}

/* 
    The forceResizeAfterContentChange() function is designed to handle situations where the page content 
    changes (for example, when items are added to or removed from the lists), and the canvas needs to be 
    resized accordingly. 
    Instead of relying on a single resize call, it schedules two delayed executions of resizeCanvas(): 
    the first after 200 milliseconds and the second after 500 milliseconds. 
    This staggered approach accounts for cases where the DOM or scrollable content might not finish 
    updating immediately, ensuring that the canvas size and the redrawn connections are properly synchronized 
    with the final layout. 
    The console logs help track when each resize attempt is triggered.
*/
function forceResizeAfterContentChange() {
    setTimeout(() => {
        console.log('Forcing resize after content change...');
        resizeCanvas();
    }, 200);

    setTimeout(() => {
        console.log('Second resize call...');
        resizeCanvas();
    }, 500);
}

/* 
    The setupResizeObserver() function sets up an automatic way to detect layout changes and keep the canvas 
    in sync. 
    It first checks if the browser supports the ResizeObserver API. 
    If available, it creates a new observer that calls resizeCanvas() whenever the observed elements change size. 
    In this case, it watches the two column containers (colsXlxToFill and colsXlxWithData), 
    which likely hold the lists on either side of the canvas. 
    This ensures that whenever these containers grow or shrink (for example, when content is added, 
    removed, or resized), the canvas will automatically adjust its dimensions and redraw connections 
    without requiring manual intervention. 
*/
function setupResizeObserver() {
    if (window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(() => {
            resizeCanvas();
        });

        /* Observe both column containers for height changes */
        resizeObserver.observe(document.getElementById('colsXlxToFill'));
        resizeObserver.observe(document.getElementById('colsXlxWithData'));
    }
}


/*
    This snippet adds two related pieces of functionality. 
    First, it attaches the resizeCanvas function to the window’s resize event, 
    ensuring the canvas and its connections are recalculated whenever the browser window is resized. 
    Second, it defines a helper function getElementCenter(el, isSource = true) that computes the 
    exact coordinates of the vertical center point of a given DOM element relative to the canvas. 
    It does so by comparing the element’s bounding rectangle with the canvas’s bounding rectangle. 
    If the element is a “source” (on the left), it takes the element’s right edge as the x-coordinate; 
    otherwise (for a “target” on the right), it uses the left edge. 
    The y-coordinate is always the element’s vertical midpoint. This function is particularly useful 
    for drawing lines between paired elements on the two sides of the canvas.
*/
window.addEventListener('resize', resizeCanvas);
function getElementCenter(el, isSource = true) {
    const rect = el.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    return {
        x: isSource ? rect.right - canvasRect.left : rect.left - canvasRect.left,
        y: rect.top + rect.height / 2 - canvasRect.top
    };
}

function drawLine(from, to, color = '#578757') {
    const midX = (from.x + to.x) / 2;
    const controlPoint1X = from.x + (midX - from.x) * 0.8;
    const controlPoint2X = to.x - (to.x - midX) * 0.8;

    /* Draw smooth curved line using bezier curve */
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.bezierCurveTo(
        controlPoint1X, from.y,
        controlPoint2X, to.y,
        to.x, to.y
    );
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    /*
     Draw arrow at the end
     Calculate the angle at the end point for proper arrow direction
    */
    const dx = to.x - controlPoint2X;
    const dy = to.y - to.y;
    const angle = Math.atan2(dy, dx);
    const arrowLength = 10;

    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - arrowLength * Math.cos(angle - Math.PI / 6),
        to.y - arrowLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - arrowLength * Math.cos(angle + Math.PI / 6),
        to.y - arrowLength * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
}

function redrawConnections() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    connections.forEach(conn => {
        const fromPos = getElementCenter(conn.from, true);
        const toPos = getElementCenter(conn.to, false);
        drawLine(fromPos, toPos);
    });
}

let selectedFrom = null;

async function initLists() {
    try {
        const finalProcessedColumnData = new Map();
        const containerTable = document.getElementById('dataList-1');
        const containerTableTarget = document.getElementById('dataList-2');

        const tableData = await window.electronAPI.getFinalSelectedTable();
        const tempTable = document.createElement('table');
        tempTable.innerHTML = tableData;
        const firstRow = tempTable.rows[0];

        for (const td of firstRow.querySelectorAll('td')) {
            const text = td.textContent;
            if (text !== "") {
                const liItem = document.createElement('li');
                liItem.textContent = text;
                containerTable.appendChild(liItem);
            }
        }

        const tableDataTarget = await window.electronAPI.getFinalSelectedTableData();
        const tempTableTarget = document.createElement('table');
        tempTableTarget.innerHTML = tableDataTarget;
        const firstRowTarget = tempTableTarget.rows[0];

        for (const td of firstRowTarget.querySelectorAll('td')) {
            const text = td.textContent;
            if (text !== "") {
                const liItem = document.createElement('li');
                liItem.textContent = text;
                containerTableTarget.appendChild(liItem);
            }
        }

        forceResizeAfterContentChange();
        document.querySelectorAll('#dataList-1 li').forEach(li => {
            li.addEventListener('click', () => {
                document.querySelectorAll('#dataList-1 li').forEach(item => {
                    item.classList.remove('selected');
                });

                selectedFrom = li;
                li.classList.add('selected');
            });
        });

        document.querySelectorAll('#dataList-2 li').forEach(li => {
            li.addEventListener('click', () => {
                if (selectedFrom) {
                    /* Check if connection already exists */
                    const existingConnection = connections.find(conn =>
                        conn.from === selectedFrom && conn.to === li
                    );

                    if (!existingConnection) {
                        /* Create new connection */
                        const from = getElementCenter(selectedFrom, true);
                        const to = getElementCenter(li, false);

                        connections.push({ from: selectedFrom, to: li });

                        forceResizeAfterContentChange();

                        /* Mark elements as connected */
                        selectedFrom.classList.add('connected');
                        li.classList.add('connected');

                        setTimeout(() => { resizeCanvas(); }, 50);
                    }

                    /* Clear selection */
                    selectedFrom.classList.remove('selected');
                    selectedFrom = null;
                }
            });
        });


        setTimeout(() => {
            resizeCanvas();
        }, 100);

        /* Adding double-click to remove the old connection */
        document.addEventListener('dblclick', (e) => {
            if (e.target.tagName === 'LI') {
                /* Here we remove all connections involving this element */
                connections = connections.filter(conn =>
                    conn.from !== e.target && conn.to !== e.target
                );

                /* Check if this element still has any connections */
                const stillHasConnections = connections.some(conn =>
                    conn.from === e.target || conn.to === e.target
                );

                /* Only remove 'connected' class if no connections remain */
                if (!stillHasConnections) {
                    e.target.classList.remove('connected');
                }

                /* Also check and update other elements that might have lost their last connection */
                document.querySelectorAll('li.connected').forEach(li => {
                    const hasConnection = connections.some(conn =>
                        conn.from === li || conn.to === li
                    );
                    if (!hasConnection) {
                        li.classList.remove('connected');
                    }
                });

                redrawConnections();
            }
        });

        /* Clearing all connections when refresh button is clicked */
        document.getElementById('refreshButton').addEventListener('click', () => {
            connections = [];
            document.querySelectorAll('li').forEach(li => {
                li.classList.remove('connected', 'selected');
            });

            selectedFrom = null;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            menuDiv.innerHTML = '';
            actionButtonContainer.style.display = 'none';
        });

        document.getElementById('processDataButton').addEventListener('click', async () => {
            try {
                /* Creating a new workbook */
                const newWorkbook = XLSX.utils.book_new();

                /* Getting all column names from "Table To Fill" (left side) */
                const allSourceColumns = [];
                document.querySelectorAll('#dataList-1 li').forEach(li => {
                    allSourceColumns.push(li.textContent.trim());
                });

                if (allSourceColumns.length === 0) {
                    alert('No source columns found. Please ensure your data is loaded properly.');
                    return;
                }

                /* Determine the number of data rows (use the first mapped column or get from source data) */
                let maxRows = 0;
                if (finalProcessedColumnData.size > 0) {
                    /* Use mapped data to determine row count */
                    const firstMappedData = finalProcessedColumnData.values().next().value;
                    maxRows = firstMappedData ? firstMappedData.length : 0;
                } else {
                    /* If no mapped data, get row count from source table */
                    try {
                        const tableDataTarget = await window.electronAPI.getFinalSelectedTableData();
                        const tempTableTarget = document.createElement('table');
                        tempTableTarget.innerHTML = tableDataTarget;
                        /* Subtract header row */
                        maxRows = tempTableTarget.rows.length - 1;
                    } catch (error) {
                        console.error('Error getting source data row count:', error);
                        maxRows = 0;
                    }
                }

                if (maxRows === 0) {
                    alert('No data rows found. Please ensure your data is loaded properly.');
                    return;
                }

                /* Prepare data for the new sheet */
                const sheetData = [];

                /* Create header row with all column names */
                sheetData.push([...allSourceColumns]);

                /* Create data rows */
                for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
                    const dataRow = [];

                    allSourceColumns.forEach(columnName => {
                        if (finalProcessedColumnData.has(columnName)) {
                            /* Use processed/mapped data */
                            const columnData = finalProcessedColumnData.get(columnName);
                            dataRow.push(columnData[rowIndex] || 'N/A');
                        } else {
                            /* Column not mapped, use N/A */
                            dataRow.push('N/A');
                        }
                    });

                    sheetData.push(dataRow);
                }

                /* Create worksheet from the data */
                const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

                /* Add the worksheet to workbook with the specified name */
                XLSX.utils.book_append_sheet(newWorkbook, worksheet, "output mapping");

                /* Convert workbook to buffer */
                const newBuffer = XLSX.write(newWorkbook, {
                    bookType: 'xlsx',
                    type: 'array'
                });

                /* Send to Electron to save the new file */
                const result = await window.electronAPI.saveNewExcelFile(newBuffer);

                if (result && result.success) {
                    alert(`New Excel file created successfully!\nSaved to: ${result.filePath}\nSheet name: "output mapping"\n\nColumns: ${allSourceColumns.length}\nMapped columns: ${finalProcessedColumnData.size}\nUnmapped columns filled with: N/A`);
                } else {
                    alert('Error creating new file: ' + (result?.reason || result?.error || 'Unknown error'));
                }

            } catch (error) {
                console.error('Error creating new Excel file:', error);
                alert('Error creating new Excel file. Check console for details.');
            }
        });


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
                "1- Map your source column (column to fill) to Data columns (columns with data tou want to integrate).",
                "2- Each source column can be linked to one or many Data columns.",
                "3- Click the validate button to validate your mapping links.",
                "4- A menu block buttons is created, each block contains informations about the data linked.",
                "5- Enter your JavaScript code to customize your data.",
                "6- Save and load your save codes for a simple experience."
            ];

            messages.forEach(text => {
                const p = document.createElement('p');
                p.className = 'p-tag';
                p.textContent = text;
                messageDiv.appendChild(p);
            });

            addCloseButton("5%");
        });

        const backButton = document.getElementById('backButton');
        /*  Back button handling */
        backButton.addEventListener('click', () => {
            window.location.href = 'display-data-content.html';
        });

        /* Creating a map list for the selected list items when the validate button is clicked*/
        document.getElementById('validateButton').addEventListener('click', () => {
            menuDiv.innerHTML = '';
            const mappedLinks = connections.map(conn => ({
                source: conn.from.textContent.trim(),
                target: conn.to.textContent.trim()
            }));

            /* Group by source */
            const grouped = mappedLinks.reduce((acc, curr) => {
                if (!acc[curr.source]) {
                    acc[curr.source] = [];
                }
                acc[curr.source].push(curr.target);
                return acc;
            }, {});

            if (Object.keys(grouped).length > 0) {
                menuDiv.style.display = 'block';
                actionButtonContainer.style.display = 'block';

                const keys = Object.keys(grouped);
                finalProcessedColumnData.clear();
                for (let i = 0; i < keys.length; i++) {
                    const menuButtonBlock = document.createElement('div');
                    menuButtonBlock.className = 'menu-button-block';
                    menuDiv.appendChild(menuButtonBlock);

                    const button = document.createElement('button');
                    button.className = 'menu-button';
                    button.textContent = "Target column : " + keys[i];
                    menuButtonBlock.appendChild(button);

                    const content = document.createElement('div');
                    content.className = 'block-content';
                    content.style.height = 'auto';
                    content.style.display = 'none';
                    menuButtonBlock.appendChild(content);

                    const globalLabelDiv = document.createElement('div');
                    const globalLabel = document.createElement('label');
                    globalLabel.className = 'menu-block-label';
                    globalLabel.textContent = 'Process your data before mapping it to the target file';
                    globalLabelDiv.appendChild(globalLabel);
                    content.appendChild(globalLabelDiv);

                    const label1Div = document.createElement('div');
                    const label1 = document.createElement('label');
                    label1.className = 'menu-block-description-label';
                    label1.innerHTML = '➜ Use <span class="highlight">cells[i]</span> to transform each cell using a JavaScript syntax';
                    label1Div.appendChild(label1);
                    content.appendChild(label1Div);


                    const columnsToEdit = grouped[keys[i]];

                    /* Create table */
                    const table = document.createElement('table');
                    table.className = 'menu-button-table';

                    /* Create header row */
                    const thead = document.createElement('thead');
                    const headerRow = document.createElement('tr');

                    ['Column name', 'Argument', 'Example value'].forEach(headerText => {
                        const th = document.createElement('th');
                        th.textContent = headerText;
                        headerRow.appendChild(th);
                    });
                    thead.appendChild(headerRow);
                    table.appendChild(thead);

                    /* Here we are going to create the table inside each menu button */
                    const tbody = document.createElement('tbody');
                    const allIndexes = [];
                    for (let j = 0; j < columnsToEdit.length; j++) {
                        const tr = document.createElement('tr');
                        const tdName = document.createElement('td');
                        tdName.textContent = columnsToEdit[j];
                        tr.appendChild(tdName);

                        /* Second table column 'Argument' */
                        const tdArg = document.createElement('td');
                        tdArg.innerHTML = `<span class="highlight">cells[${j}]</span>`;
                        tr.appendChild(tdArg);

                        /* Third table column 'Example value' */
                        const tdExample = document.createElement('td');
                        const firstRowTarget = tempTableTarget.rows[0];
                        const secondRowTarget = tempTableTarget.rows[1];

                        /* Here we are going to extract the indexes of the all columns we will edit in a menu container*/
                        let foundIndex = -1;
                        for (let p = 0; p < firstRowTarget.cells.length; p++) {
                            if (firstRowTarget.cells[p].textContent.trim() === columnsToEdit[j]) {
                                foundIndex = p;
                                allIndexes.push(p);
                                break;
                            }
                        }

                        /* Here we display the first value as an example value in the table */
                        if (foundIndex !== -1) {
                            const exampleValue = secondRowTarget.cells[foundIndex].textContent.trim();
                            tdExample.innerHTML = exampleValue;
                        }
                        tr.appendChild(tdExample);
                        tbody.appendChild(tr);
                    }
                    table.appendChild(tbody);

                    const tableDiv = document.createElement('div');
                    tableDiv.className = 'menu-button-table-div';
                    tableDiv.appendChild(table);
                    content.appendChild(tableDiv);

                    /* Creating the textarea element */
                    const textAreaDiv = document.createElement('div');
                    const textarea = document.createElement('textarea');
                    textarea.rows = 4;
                    textarea.placeholder = 'Custom your cell output via JavaScript code. Default code is "return cells[0] + cells[1] + cells[n] + ..."';
                    textarea.className = 'js-code-textarea';
                    textAreaDiv.className = 'text-area-div';

                    textAreaDiv.appendChild(textarea);
                    content.appendChild(textAreaDiv);

                    /* Creating the buttons div*/
                    const menuButtonsDiv = document.createElement('div');
                    menuButtonsDiv.className = "menu-button-div";
                    const runJSCodeButton = document.createElement('button');
                    runJSCodeButton.className = 'run-code-button';
                    runJSCodeButton.textContent = 'Run your code';
                    menuButtonsDiv.appendChild(runJSCodeButton);

                    const saveJSCodeButton = document.createElement('button');
                    saveJSCodeButton.className = 'save-code-button';
                    saveJSCodeButton.textContent = 'Save code';
                    menuButtonsDiv.appendChild(saveJSCodeButton);

                    const savedCodesButton = document.createElement('button');
                    savedCodesButton.className = 'saved-codes-button';
                    const saveIcon = document.createElement('i');
                    saveIcon.className = 'fas fa-save';
                    savedCodesButton.appendChild(saveIcon);
                    menuButtonsDiv.appendChild(savedCodesButton);

                    content.appendChild(menuButtonsDiv);

                    /* Handling events when the run button is clicked */
                    runJSCodeButton.addEventListener('click', () => {
                        /* Each time the run button for a specific column is clicked, we need to remove that column from finalProcessedColumnData if existed*/
                        const processedValues = [];
                        if (finalProcessedColumnData.has(keys[i])) {
                            finalProcessedColumnData.delete(keys[i]);
                        }

                        /*
                          Here we iterate over rows of the source data
                          for each row, we read 
                         */
                        const numberOfTrElementsInTable = tempTableTarget.querySelectorAll("tr").length;
                        const userCode = content.querySelector('.js-code-textarea').value;
                        for (let trElement = 1; trElement < numberOfTrElementsInTable; trElement++) {
                            const targetedCells = [];
                            const row = tempTableTarget.querySelectorAll("tr")[trElement];
                            const cells = row.querySelectorAll("td");
                            for (let tdIter = 0; tdIter < cells.length; tdIter++) {
                                if (allIndexes.includes(tdIter)) {
                                    targetedCells.push(cells[tdIter]);
                                }
                            }

                            let processedValue = "";
                            if (userCode === "") {
                                targetedCells.forEach(cell => { processedValue += cell.textContent });
                            } else if (userCode.includes("cells[")) {
                                let isUserCodeValid = true;
                                let transformFn;
                                try {
                                    transformFn = new Function("cells", userCode);
                                } catch (error) {
                                    isUserCodeValid = false;
                                }
                                if (isUserCodeValid) {
                                    try {
                                        const cellValues = targetedCells.map(cell => cell.textContent);
                                        /* the console prints : cellValues : Expleo,IT Engineer – Sage X3 & AQUIWEB MES,CDI */
                                        /* applying the user code */
                                        const newValue = transformFn(cellValues);
                                        processedValue = newValue;
                                    } catch (error) {
                                        console.error(`Error running code on row ${trElement}:`, error.message);
                                    }
                                }
                            } else {
                                targetedCells.forEach(cell => { processedValue += cell.textContent });
                            }
                            processedValues.push(processedValue);
                        }
                        finalProcessedColumnData.set(keys[i], processedValues);

                        /* Display a value example when running the code entered by user */
                        let instanceCodeExampleDiv = content.querySelector('.instance-code-example-div');
                        if (!instanceCodeExampleDiv) {
                            instanceCodeExampleDiv = document.createElement('div');
                            instanceCodeExampleDiv.className = 'instance-code-example-div';
                            const instanceCodeExampleLabel1 = document.createElement('label');
                            instanceCodeExampleLabel1.className = 'instance-code-example-label-1';
                            instanceCodeExampleLabel1.textContent = 'Result after run : ';

                            const instanceCodeExampleLabel2 = document.createElement('label');
                            instanceCodeExampleLabel2.className = 'instance-code-example-label-2';
                            instanceCodeExampleLabel2.textContent = processedValues[0];

                            instanceCodeExampleDiv.appendChild(instanceCodeExampleLabel1);
                            instanceCodeExampleDiv.appendChild(instanceCodeExampleLabel2);
                            content.appendChild(instanceCodeExampleDiv);
                        } else {
                            const instanceCodeExampleLabel2 = instanceCodeExampleDiv.querySelector('.instance-code-example-label-2');
                            if (instanceCodeExampleLabel2) {
                                instanceCodeExampleLabel2.textContent = processedValues[0];
                            }
                        }
                    })

                    /* Handling events when the save code button is clicked */
                    saveJSCodeButton.addEventListener('click', async () => {
                        const userCode = content.querySelector('.js-code-textarea').value;
                        const columnName = keys[i];
                        if (userCode.trim()) {
                            try {
                                /* Here we create the data object to save with all necessary information */
                                const codeData = {
                                    code: userCode,
                                    columnName: columnName,
                                    timestamp: new Date().toISOString(),
                                    mappedColumns: grouped[keys[i]]
                                };

                                /* Here we call the Electron API to save the code */
                                const result = await window.electronAPI.saveCodeToFile(codeData);
                            } catch (error) {
                                console.error('Error saving code:', error);
                            }
                        }
                    });
                    initSavedCodesButton(savedCodesButton, content.querySelector('.js-code-textarea'));
                }

                /* 
                Handling events when the saved codes button is clicked.
                Opening popup with saved codes 
                */
                function initSavedCodesButton(savedCodesButton, textarea) {
                    savedCodesButton.addEventListener('click', async () => {
                        try {
                            /* Here we load saved codes from file with proper error handling */
                            const savedCodes = await window.electronAPI.loadSavedCodes();

                            /* Here we ensure savedCodes is an array */
                            const codesArray = Array.isArray(savedCodes) ? savedCodes : [];

                            if (codesArray.length === 0) {
                                return;
                            }
                            showSavedCodesPopup(codesArray, textarea);
                        } catch (error) {
                            console.error('Error loading saved codes:', error);
                        }
                    });
                }

                /* This function is to show saved codes popup */
                function showSavedCodesPopup(savedCodes, textarea) {
                    if (!Array.isArray(savedCodes)) {
                        console.error('savedCodes is not an array:', savedCodes);
                        return;
                    }

                    /* We remove existing popup if any */
                    const existingPopup = document.getElementById('savedCodesPopup');
                    if (existingPopup) {
                        document.body.removeChild(existingPopup);
                    }

                    /* We create the popup */
                    const popupOverlay = document.createElement('div');
                    popupOverlay.id = 'savedCodesPopup';
                    popupOverlay.className = 'popup-overlay';

                    const popupContent = document.createElement('div');
                    popupContent.className = 'js-popup-content';

                    /* Header section */
                    const header = document.createElement('div');
                    header.className = 'popup-header';

                    const headerTitle = document.createElement('h3');
                    headerTitle.className = 'popup-title';
                    headerTitle.textContent = `Saved Codes (${savedCodes.length})`;

                    const closeButton = document.createElement('button');
                    closeButton.className = 'popup-close-btn';
                    closeButton.innerHTML = '×';

                    header.appendChild(headerTitle);
                    header.appendChild(closeButton);

                    /* Codes list container section */
                    const codesContainer = document.createElement('div');
                    codesContainer.className = 'codes-container';

                    const instruction = document.createElement('div');
                    instruction.className = 'popup-instruction';
                    instruction.innerHTML = '<i class="fas fa-info-circle"></i> Click on any code to load it into the textarea';

                    /* creating codes list items */
                    savedCodes.forEach((codeItem, index) => {
                        const codeDiv = document.createElement('div');
                        codeDiv.className = 'code-item';

                        /* Handle both old format (just string) and new format (object with metadata) */
                        let displayCode, columnName, timestamp, mappedColumns;

                        if (typeof codeItem === 'string') {
                            /* It is the case of old format - just the code string */
                            displayCode = codeItem.length > 80 ? codeItem.substring(0, 80) + '...' : codeItem;
                            columnName = 'Unknown';
                            timestamp = 'Unknown';
                            mappedColumns = [];
                        } else if (typeof codeItem === 'object' && codeItem !== null) {
                            /* This is the case of new format - object with metadata */
                            displayCode = codeItem.code ? (codeItem.code.length > 80 ? codeItem.code.substring(0, 80) + '...' : codeItem.code) : 'No code';
                            columnName = codeItem.columnName || 'Unknown';
                            timestamp = codeItem.timestamp ? new Date(codeItem.timestamp).toLocaleDateString() + ' ' + new Date(codeItem.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown';
                            mappedColumns = codeItem.mappedColumns || [];
                        } else {
                            /* This is the case of an invalid format */
                            displayCode = 'Invalid code format';
                            columnName = 'Unknown';
                            timestamp = 'Unknown';
                            mappedColumns = [];
                        }

                        codeDiv.innerHTML = `
                            <div class="code-header">
                                <strong class="code-column-name">${columnName}</strong>
                                <span class="code-timestamp">${timestamp}</span>
                            </div>
                            <div class="code-preview">
                                ${displayCode}
                            </div>
                            ${mappedColumns.length > 0 ? `<div class="code-mapping">
                                <i class="fas fa-arrow-right"></i>Maps: ${mappedColumns.join(', ')}
                            </div>` : ''}
                            `;

                        /* Adding the click event to load code */
                        codeDiv.addEventListener('click', () => {
                            const actualCode = typeof codeItem === 'string' ? codeItem : (codeItem.code || '');
                            textarea.value = actualCode;
                            codeDiv.classList.add('code-selected');

                            setTimeout(() => {
                                document.body.removeChild(popupOverlay);
                            }, 200);
                            textarea.focus();
                        });

                        codesContainer.appendChild(codeDiv);
                    });

                    /* Footer section for popup */
                    const footer = document.createElement('div');
                    footer.className = 'popup-footer';

                    const clearAllButton = document.createElement('button');
                    clearAllButton.className = 'clear-all-btn';
                    clearAllButton.innerHTML = '<i class="fas fa-trash"></i> Clear All';
                    clearAllButton.addEventListener('click', async () => {
                        const result = await window.electronAPI.clearAllSavedCodes();
                        document.body.removeChild(popupOverlay);

                    });

                    footer.appendChild(clearAllButton);

                    popupContent.appendChild(header);
                    popupContent.appendChild(instruction);
                    popupContent.appendChild(codesContainer);
                    popupContent.appendChild(footer);
                    popupOverlay.appendChild(popupContent);

                    closeButton.addEventListener('click', () => {
                        document.body.removeChild(popupOverlay);
                        textarea.focus();
                    });

                    popupOverlay.addEventListener('click', (e) => {
                        if (e.target === popupOverlay) {
                            document.body.removeChild(popupOverlay);
                            textarea.focus();
                        }
                    });

                    /* close the popup with escape key */
                    const escapeHandler = (e) => {
                        if (e.key === 'Escape') {
                            document.body.removeChild(popupOverlay);
                            document.removeEventListener('keydown', escapeHandler);
                            textarea.focus();
                        }
                    };
                    document.addEventListener('keydown', escapeHandler);
                    document.body.appendChild(popupOverlay);
                }

                /* 
                  Handling the display of each menu button when clicked
                  Adding padding for each button when it is opened 
                  Removing the padding when the button menu is closed 
                  Adding an auto scroll to center each button menu when it is opened
                */
                const allButtons = document.querySelectorAll('.menu-button');
                allButtons.forEach((item) => {
                    item.addEventListener('click', () => {
                        const content = item.nextElementSibling;
                        const menuButtonBlock = item.parentElement;
                        const isHidden = content.style.display === 'none' || content.style.display === '';
                        if (isHidden) {
                            content.style.display = 'flex';
                            content.style.flexDirection = 'column';
                            content.style.alignItems = 'center';
                            content.style.padding = '20px';
                            content.style.gap = '10px';
                            menuButtonBlock.classList.add('expanded');

                            setTimeout(() => {
                                menuButtonBlock.scrollIntoView({
                                    behavior: "smooth",
                                    block: "center"
                                });
                            }, 100);
                        } else {
                            content.style.display = 'none';
                            menuButtonBlock.classList.remove('expanded');
                        }
                    });
                });
                setTimeout(() => {
                    menuDiv.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }, 100);
            }
        });
    } catch (error) {
        console.error("Error getting table data:", error);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    setupResizeObserver();
    initLists();
});