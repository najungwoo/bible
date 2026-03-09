



// --- Event Listeners ---

daySelect.addEventListener('change', (e) => {
    const index = parseInt(e.target.value);
    if (!isNaN(index)) {
        selectDay(index);
    }
});

levelSelect.addEventListener('change', () => {
    dayReset();
});



answerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        // Prevent default spacebar behavior (scrolling or simply adding a space)
        if (e.key === ' ') e.preventDefault();
        submitAnswer();
    }
});

// Restore fullscreen when keyboard closes (blur)
answerInput.addEventListener('blur', () => {
    if (currentMode === 4) {
        setTimeout(ensureFullscreen, 100); // Small delay to allow UI to settle
    }
});

// Mode Button Logic
modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const clickedMode = parseInt(btn.dataset.mode);

        // Always switch mode first if it's different
        if (currentMode !== clickedMode) {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = clickedMode;
            if (currentDayIndex !== -1) {
                dayReset();
            } else {
                displayProblem();
            }
        }

        // Always check to open settings for specific modes
        if (clickedMode === 1) { // Blank Mode
            updateBlankGridActive();
            blankSettingsModal.style.display = 'flex';
        } else if (clickedMode === 4) { // Whole Mode ONLY
            updateWholeGridActive();
            wholeSettingsModal.style.display = 'flex';
        }
    });
});

// --- Chances Settings Logic ---
function updateChancesText() {
    if (chancesCountText) {
        chancesCountText.textContent = maxAttempts === 'infinite' ? '무제한' : `${maxAttempts}번`;
    }
}

function updateChancesGridActive() {
    const options = document.querySelectorAll('#chancesGrid .btn-option');
    options.forEach(opt => {
        if (opt.dataset.chances === String(maxAttempts)) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });
}

if (btnChancesSettings) {
    btnChancesSettings.addEventListener('click', () => {
        updateChancesGridActive();
        if (chancesSettingsModal) {
            chancesSettingsModal.style.display = 'flex';
        }
    });
}

if (closeChancesSettings) {
    closeChancesSettings.addEventListener('click', () => {
        if (chancesSettingsModal) {
            chancesSettingsModal.style.display = 'none';
        }
    });
}

document.querySelectorAll('#chancesGrid .btn-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const value = e.target.dataset.chances;
        maxAttempts = value === 'infinite' ? 'infinite' : parseInt(value, 10);
        localStorage.setItem('bible_max_attempts', maxAttempts);
        updateChancesText();

        // Highlight selection
        document.querySelectorAll('#chancesGrid .btn-option').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        setTimeout(() => {
            if (chancesSettingsModal) {
                chancesSettingsModal.style.display = 'none';
            }
        }, 300);
    });
});

window.addEventListener('click', (e) => {
    if (e.target === chancesSettingsModal) {
        chancesSettingsModal.style.display = 'none';
    }
});


btnHint.addEventListener('click', () => {
    if (!currentAnswers.length || problemCompleted) return;

    const answer = currentAnswers[0];
    let hintPart = '';

    // Determine hint portion based on how many hints have been used for this answer
    if (hintCount === 0) {
        // First hint: reveal first character
        hintPart = answer.charAt(0);
    } else if (hintCount === 1) {
        // Second hint: reveal half or full if short
        if (answer.length <= 2) {
            hintPart = answer;
        } else {
            const half = Math.ceil(answer.length / 2);
            hintPart = answer.substring(0, half);
        }
    } else {
        // Third or later hint: reveal full answer
        hintPart = answer;
    }

    hintCount++;
    score -= 2;
    attempts++; // count as an attempt
    updateStatus();

    answerInput.placeholder = `힌트: ${hintPart}...`;
    answerInput.focus();

    // Apply the hint visually
    applyHintToDisplay(hintPart, answer);

    // In Reference mode (mode 3) we treat the hint as completing the current blank
    // after the second hint (full answer) to move to the next part (e.g., chapter).
    if (currentMode === 3 && hintCount >= 2) {
        // Consider the current answer as revealed
        currentAnswers.shift();
        hintCount = 0; // reset for the next blank
        // If no more blanks remain, mark problem as completed
        if (currentAnswers.length === 0) {
            problemCompleted = true;
        }
    }
});


btnWrong.addEventListener('click', () => {
    if (wrongVerses.length === 0) {
        customAlert("틀린 구절이 없습니다.");
        return;
    }
    currentScripture = wrongVerses.map(w => w.full_text);
    leftVerse = currentScripture.length;
    failNum = 0;
    wrongVerses = [];
    updateStatus();
    displayProblem();
});

function updateDaySelect() {
    daySelect.innerHTML = '<option value="" disabled selected>일차 선택</option>';
    originalFilenames.forEach((name, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = name.replace('.txt', '');
        daySelect.appendChild(option);
    });
}

btnSkip.addEventListener('click', () => {
    if (currentScripture.length === 0) return;
    nextProblem();
});

btnReset.addEventListener('click', () => {
    customConfirm("정말 초기화 하시겠습니까?", () => {
        // Reset view without reloading data (preserves selections)
        if (currentDayIndex !== -1) {
            dayReset();
        } else {
            // If no day selected, clear everything
            currentScripture = [];
            leftVerse = 0;
            failNum = 0;
            wrongVerses = [];
            score = 0;
            updateStatus();
            problemArea.innerHTML = '<p class="placeholder">파일을 열거나 붙여넣기로 시작하세요.</p>';
            answerInput.disabled = true;
        }
    });
});



// Fullscreen Logic
const btnFullscreen = document.getElementById('btnFullscreen');
if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
        const docElm = document.documentElement;
        const reqFullscreen = docElm.requestFullscreen || docElm.webkitRequestFullScreen || docElm.msRequestFullscreen;
        const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;

        const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;

        if (!isFullscreen) {
            if (reqFullscreen) {
                reqFullscreen.call(docElm).catch((e) => {
                    console.error(`Error attempting to enable full-screen mode: ${e.message} (${e.name})`);
                });
            }
        } else {
            if (exitFullscreen) {
                exitFullscreen.call(document);
            }
        }
    });

    // Update icon on state change
    const updateFullscreenIcon = () => {
        const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
        if (isFullscreen) {
            btnFullscreen.textContent = '↙️';
        } else {
            btnFullscreen.textContent = '⛶';
        }
    };

    document.addEventListener('fullscreenchange', updateFullscreenIcon);
    document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
    document.addEventListener('msfullscreenchange', updateFullscreenIcon);
}

function ensureFullscreen() {
    const docElm = document.documentElement;
    const reqFullscreen = docElm.requestFullscreen || docElm.webkitRequestFullScreen || docElm.msRequestFullscreen;
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;

    if (!isFullscreen && reqFullscreen) {
        reqFullscreen.call(docElm).catch(() => {
            // Silently fail if blocked by browser policy
        });
    }
}

// --- Settings Popups Logic ---

const blankSettingsModal = document.getElementById('blankSettingsModal');
const wholeSettingsModal = document.getElementById('wholeSettingsModal');
const closeBlankSettings = document.getElementById('closeBlankSettings');
const closeWholeSettings = document.getElementById('closeWholeSettings');
const blankRatioGrid = document.getElementById('blankRatioGrid');
const wholeLevelGrid = document.getElementById('wholeLevelGrid');

// Active State Updaters
function updateBlankGridActive() {
    const currentRatio = Math.round(blankNum * 10);
    const btns = blankRatioGrid.querySelectorAll('.btn-option');
    btns.forEach(btn => {
        if (parseInt(btn.dataset.ratio) === currentRatio) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

function updateWholeGridActive() {
    const btns = wholeLevelGrid.querySelectorAll('.btn-option');
    btns.forEach(btn => {
        if (parseInt(btn.dataset.words) === wholeLevelNum) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

// Handlers


if (closeBlankSettings) {
    closeBlankSettings.addEventListener('click', () => blankSettingsModal.style.display = 'none');
}




if (closeWholeSettings) {
    closeWholeSettings.addEventListener('click', () => wholeSettingsModal.style.display = 'none');
}

// Close on outside click
window.addEventListener('click', (e) => {
    if (e.target === blankSettingsModal) blankSettingsModal.style.display = 'none';
    if (e.target === wholeSettingsModal) wholeSettingsModal.style.display = 'none';
});

// Grid Selection Handlers
if (blankRatioGrid) {
    blankRatioGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-option')) {
            const ratio = parseInt(e.target.dataset.ratio);
            blankNum = ratio / 10;
            blankSettingsModal.style.display = 'none';
            if (currentMode === 1) {

                reloadCurrentProblem();
            }
        }
    });
}

if (wholeLevelGrid) {
    wholeLevelGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-option')) {
            const words = parseInt(e.target.dataset.words);
            if (words) {
                wholeLevelNum = words;
                wholeSettingsModal.style.display = 'none';
                if (currentMode === 4 || currentMode === 5) {
                    reloadCurrentProblem();
                }
            }
        }
    });
}

function reloadCurrentProblem() {
    if (currentDayIndex === -1 || currentScripture.length === 0) return;
    // regenerate using SAME problemNum
    const line = currentScripture[problemNum];
    let [refView, verseText, answers, ref] = createProblem(line, currentMode);
    currentProblem = verseText;
    currentAnswers = answers;
    currentReference = ref;
    attempts = 0;
    problemCompleted = false;
    hintCount = 0;
    renderProblem(refView, verseText);
    answerInput.value = "";
    answerInput.focus();
    updateStatus(); // score doesn't change
}


// --- Dropdown Logic ---
const levelDropdownItems = document.querySelectorAll('#levelDropContent .dropdown-item');
const levelDropBtn = document.getElementById('levelDropBtn');

levelDropdownItems.forEach(item => {
    item.addEventListener('click', (e) => {
        // Prevent default anchor behavior
        e.preventDefault();

        // 1. Update UI (Active State)
        levelDropdownItems.forEach(d => d.classList.remove('active'));
        item.classList.add('active');

        // 2. Update Button Text
        const text = item.textContent;
        // Keep the arrow ▾
        levelDropBtn.innerText = text + " ▾";

        // 3. Update Hidden Select & Trigger Change
        const value = item.getAttribute('data-value');
        levelSelect.value = value;

        // Trigger generic change event
        levelSelect.dispatchEvent(new Event('change'));
    });
});

// Removed dayDropBtn/dayDropContent from here (moved to top)

function updateDayDropdown() {
    dayDropContent.innerHTML = ''; // Clear existing

    // Use originalFilenames as source
    originalFilenames.forEach((name, index) => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        // Remove .txt extension and trim
        item.textContent = name.replace('.txt', '').trim();
        item.dataset.value = index;

        if (index === currentDayIndex) {
            item.classList.add('active');
            dayDropBtn.innerText = item.textContent + " ▾";
        }

        item.addEventListener('click', (e) => {
            e.preventDefault();

            // UI Update
            const allItems = dayDropContent.querySelectorAll('.dropdown-item');
            allItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            dayDropBtn.innerText = item.textContent + " ▾";

            // Logic Update
            daySelect.value = index;
            selectDay(index);
        });

        dayDropContent.appendChild(item);
    });
}


// Initialize application
initData();
