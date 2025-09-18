/*
    This ensures the script runs only after the entire HTML document has been fully loaded. 
    It prevents errors from trying to access elements that don’t exist yet in the DOM.
*/
document.addEventListener('DOMContentLoaded', () => {
    const sourceInput = document.getElementById('sourceFile');
    const targetInput = document.getElementById('targetFile');
    const startButton = document.getElementById('startButton');
    const sourceFileText = document.getElementById('sourceFileText');
    const targetFileText = document.getElementById('targetFileText');
    const sourceFileName = document.getElementById('sourceFileName');
    const targetFileName = document.getElementById('targetFileName');

    /* 
        This function enables or disables the start button based on whether both files have been selected. 
        If both files are present, the button is enabled and given a visual "pulse" effect to attract attention. 
        If not, the button is disabled and the effect is removed. 
    */
    function updateButtonState() {
        startButton.disabled = !(sourceInput.files.length && targetInput.files.length);
        if (!startButton.disabled) {
            startButton.classList.add('pulse');
        } else {
            startButton.classList.remove('pulse');
        }
    }

    /* H
        When the user selects or removes a source file, this listener updates the page to show 
        the file name and hide the placeholder text. 
        If no file is selected, it restores the placeholder. 
        After any change, it calls updateButtonState to ensure the start button’s status is correct.
    */
    sourceInput.addEventListener('change', function () {
        if (this.files.length) {
            sourceFileName.textContent = this.files[0].name;
            sourceFileText.style.display = 'none';
        } else {
            sourceFileName.textContent = '';
            sourceFileText.style.display = 'inline';
        }
        updateButtonState();
    });

    targetInput.addEventListener('change', function () {
        if (this.files.length) {
            targetFileName.textContent = this.files[0].name;
            targetFileText.style.display = 'none';
        } else {
            targetFileName.textContent = '';
            targetFileText.style.display = 'inline';
        }
        updateButtonState();
    });

    startButton.addEventListener('click', function () {
        if (!startButton.disabled) {
            /* Visual feedback */
            startButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>  Loading...';
            startButton.disabled = true;

            const sourceFile = sourceInput.files[0];
            const targetFile = targetInput.files[0];

            let sourceBuffer, targetBuffer;
            let filesProcessed = 0;

            const sourceReader = new FileReader();
            const targetReader = new FileReader();

            sourceReader.onload = function (e) {
                sourceBuffer = Array.from(new Uint8Array(e.target.result));
                filesProcessed++;
                if (filesProcessed === 2) {
                    /* Send both buffers to main process */
                    window.electronAPI.sendExcelFiles(sourceBuffer, targetBuffer);
                    window.location.href = 'select-sheet-source.html';
                }
            };

            targetReader.onload = function (e) {
                targetBuffer = Array.from(new Uint8Array(e.target.result));
                filesProcessed++;
                if (filesProcessed === 2) {
                    /* Send both buffers to main process */
                    window.electronAPI.sendExcelFiles(sourceBuffer, targetBuffer);
                    window.location.href = 'select-sheet-source.html';
                }
            };

            sourceReader.readAsArrayBuffer(sourceFile);
            targetReader.readAsArrayBuffer(targetFile);
        }
    });

    /* Initial button state */
    updateButtonState();
});