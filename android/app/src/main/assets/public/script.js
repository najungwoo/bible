// Constants & Regex
const PUNCT_RE = /[,\-]/g;
const WORD_TOKEN_RE = /[0-9A-Za-z가-힣]/;

// State
let originalScriptures = []; // Array of arrays of strings
let originalFilenames = [];
let currentScripture = [];
let currentDayIndex = -1;
let currentMode = 1; // 1: Blank, 2: Verse, 3: Ref, 4: Whole
let blankNum = 5; // 50%
let wholeLevelNum = 1;
let fontSize = 24;

let currentProblem = "";
let currentAnswers = [];
let currentReference = "";
let problemNum = 0;
let attempts = 0;
let problemCompleted = false;
let leftVerse = 0;
let failNum = 0;
let wrongVerses = [];
let hintCount = 0;
let score = 0;
let isSpeaking = false; // Moved to top
console.log('hintCount initialized:', hintCount);

// DOM Elements
const fileInput = document.getElementById('fileInput');
const daySelect = document.getElementById('daySelect');
const dayDropBtn = document.getElementById('dayDropBtn');
const dayDropContent = document.getElementById('dayDropContent');
const levelSelect = document.getElementById('levelSelect');
const problemArea = document.getElementById('problemArea');
const answerInput = document.getElementById('answerInput');
const statusText = document.getElementById('statusText');
const btnReset = document.getElementById('btnReset');
const btnHint = document.getElementById('btnHint');
const btnSkip = document.getElementById('btnSkip');
const btnWrong = document.getElementById('btnWrong');
const btnFontUp = document.getElementById('btnFontUp');
const btnFontDown = document.getElementById('btnFontDown');
const btnTheme = document.getElementById('btnTheme');
const btnTTS = document.getElementById('btnTTS');
const voiceSelect = document.getElementById('voiceSelect');
const btnVoiceHelp = document.getElementById('btnVoiceHelp');
const modeBtns = document.querySelectorAll('.btn-mode');

// Voice Help Modal Elements
const modalVoiceHelp = document.getElementById('voiceHelpModal');
const btnCloseVoiceHelp = document.getElementById('btnCloseVoiceHelp');

// Paste Modal Elements
// Paste Modal Elements (Removed)
// const btnPaste = document.getElementById('btnPaste');
const btnDelete = document.getElementById('btnDelete');
// const pasteModal = document.getElementById('pasteModal');
// const closePasteModal = document.querySelector('.close');
// const btnSavePaste = document.getElementById('btnSavePaste');

// Easy Input Elements
// const pasteTitle = document.getElementById('pasteTitle');
const inputRef = document.getElementById('inputRef');
const inputVerse = document.getElementById('inputVerse');
const inputLevel = document.getElementById('inputLevel');

// Delete Verse Elements
const btnOpenDeleteVerse = document.getElementById('btnOpenDeleteVerse');
const deleteVerseModal = document.getElementById('deleteVerseModal');
const closeDeleteVerse = document.getElementById('closeDeleteVerse');
const deleteDaySelect = document.getElementById('deleteDaySelect');
const deleteVerseList = document.getElementById('deleteVerseList');

const deleteDayModal = document.getElementById('deleteDayModal');
const deleteDayMessage = document.getElementById('deleteDayMessage');
const btnCancelDeleteDay = document.getElementById('btnCancelDeleteDay');
const btnConfirmDeleteDay = document.getElementById('btnConfirmDeleteDay');
const closeDeleteDay = document.getElementById('closeDeleteDay');
// const verseList = document.getElementById('verseList');

let tempVerses = []; // Store verses temporarily before saving

// --- Helper Functions (Ported from Python) ---

function normToken(s) {
    return s.replace(PUNCT_RE, '').trim();
}

function maskLenKeepPunct(tok) {
    return tok.replace(/[0-9A-Za-z가-힣]+/g, (m) => '_'.repeat(m.length));
}

function maskOneKeepPunct(tok) {
    return tok.replace(/[0-9A-Za-z가-힣]+/g, '_');
}

function parseRefParts(ref) {
    let s = ref.trim();
    if (s.startsWith('(') && s.endsWith(')')) {
        s = s.substring(1, s.length - 1);
    }

    let book, chapVerse;
    // Try splitting by last space
    let lastSpaceIdx = s.lastIndexOf(' ');
    if (lastSpaceIdx !== -1) {
        book = s.substring(0, lastSpaceIdx).trim();
        chapVerse = s.substring(lastSpaceIdx + 1).trim();
    } else {
        // Fallback: find first digit
        let m = s.search(/\d/);
        if (m !== -1) {
            book = s.substring(0, m).trim();
            chapVerse = s.substring(m).trim();
        } else {
            return [s, "0", "0"];
        }
    }

    let chap, verse;
    if (chapVerse.includes(':')) {
        [chap, verse] = chapVerse.split(':', 2);
    } else {
        chap = chapVerse;
        verse = "0";
    }
    return [book, chap, verse];
}

function splitVerseParts(verse) {
    if (verse.includes('-')) {
        let [a, b] = verse.split('-', 2);
        return ['_-_', [a, b]];
    }
    if (verse.includes(',')) {
        let parts = verse.split(',').map(p => p.trim()).filter(p => p);
        let mask = Array(parts.length).fill('_').join(',');
        return [mask, parts];
    }
    return ['_', [verse]];
}

function refMasked(ref, masked) {
    let [book, chap, verse] = parseRefParts(ref);
    if (!masked) {
        return `(${book} ${chap}:${verse})`;
    }
    let [verseMask, _] = splitVerseParts(verse);
    return `(_ _:${verseMask})`;
}

// --- Core Logic ---

// DEFAULT_DATA is now loaded from data.js

function loadFiles(files) {
    originalScriptures = [];
    originalFilenames = [];
    daySelect.innerHTML = '<option value="" disabled selected>일차 선택</option>';

    let loadedCount = 0;

    Array.from(files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");

            // Store data
            originalScriptures.push(lines);
            originalFilenames.push(file.name);

            // Add to dropdown
            const option = document.createElement('option');
            option.value = originalScriptures.length - 1; // Index
            option.textContent = file.name.replace('.txt', '');
            daySelect.appendChild(option);

            loadedCount++;
            if (loadedCount === files.length) {
                saveDataToStorage();
                // Auto select first file
                if (originalScriptures.length > 0) {
                    daySelect.value = 0;
                    selectDay(0);
                    updateDayDropdown();
                }
            }
        };
        reader.readAsText(file, 'UTF-8');
    });
}

function saveDataToStorage() {
    localStorage.setItem('bible_scriptures', JSON.stringify(originalScriptures));
    localStorage.setItem('bible_filenames', JSON.stringify(originalFilenames));
    localStorage.setItem('bible_data_version', DATA_VERSION);
}

// Data Version - Increment this to force update default data for users
const DATA_VERSION = "1.9";

function loadDataFromStorage() {
    try {
        const storedVersion = localStorage.getItem('bible_data_version');
        const storedScriptures = localStorage.getItem('bible_scriptures');
        const storedFilenames = localStorage.getItem('bible_filenames');

        // Check if we need to force update (version mismatch or no data)
        if (storedVersion === DATA_VERSION && storedScriptures && storedFilenames) {
            originalScriptures = JSON.parse(storedScriptures);
            originalFilenames = JSON.parse(storedFilenames);
        } else {
            // Load Default Data (Force Update)
            console.log("Updating data to version " + DATA_VERSION);
            originalScriptures = Object.values(DEFAULT_DATA);
            originalFilenames = Object.keys(DEFAULT_DATA);
            saveDataToStorage();
        }

        daySelect.innerHTML = '<option value="" disabled selected>일차 선택</option>';
        originalFilenames.forEach((name, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = name.replace('.txt', '');
            daySelect.appendChild(option);
        });

        if (originalScriptures.length > 0) {
            daySelect.value = 0;
            selectDay(0);
            updateDayDropdown();
        }
    } catch (e) {
        console.error("Error loading data:", e);
        // Fallback to default data on error
        localStorage.clear();
        originalScriptures = Object.values(DEFAULT_DATA);
        originalFilenames = Object.keys(DEFAULT_DATA);
        saveDataToStorage();

        daySelect.innerHTML = '<option value="" disabled selected>일차 선택</option>';
        originalFilenames.forEach((name, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = name.replace('.txt', '');
            daySelect.appendChild(option);
        });

        if (originalScriptures.length > 0) {
            daySelect.value = 0;
            selectDay(0);
            updateDayDropdown();
        }
    }
}

// Initialize
loadDataFromStorage();

function selectDay(index) {
    currentDayIndex = index;
    dayReset();
}

function dayReset() {
    if (currentDayIndex !== -1) {
        const selectedLevel = levelSelect.value;
        const allVerses = originalScriptures[currentDayIndex];

        if (selectedLevel === "all") {
            currentScripture = [...allVerses];
        } else {
            // Cumulative filtering: 1 to maxLevel
            const maxLevel = parseInt(selectedLevel, 10);
            // Regex to match levels 1 to maxLevel followed by backslash and open paren
            // Data format: "1\(..."
            // We need to match digit + backslash + (
            // In JS string, \\\\ becomes \\ in regex, which matches literal \
            const levelRegex = new RegExp(`^[1-${maxLevel}]\\\\\\(`);
            currentScripture = allVerses.filter(line => levelRegex.test(line));
        }
        leftVerse = currentScripture.length;
    } else {
        currentScripture = [];
        leftVerse = 0;
    }
    failNum = 0;
    wrongVerses = [];
    score = 0;
    updateStatus();
    displayProblem();
}

function updateStatus() {
    statusText.textContent = `남은 구절: ${leftVerse} | 틀린 갯수: ${failNum} | 점수: ${score}`;
}

function displayProblem() {
    if (typeof stopTTS === 'function') stopTTS();
    if (currentScripture.length === 0) {
        problemArea.innerHTML = '<p class="placeholder">모든 구절을 완료했습니다!</p>';
        answerInput.disabled = true;
        return;
    }
    answerInput.disabled = false;

    problemNum = Math.floor(Math.random() * currentScripture.length);
    const line = currentScripture[problemNum];

    let [refView, verseText, answers, ref] = createProblem(line, currentMode);

    currentProblem = verseText; // Store just verse text for logic if needed? No, logic uses currentAnswers
    currentAnswers = answers;
    currentReference = ref;
    attempts = 0;
    problemCompleted = false;
    hintCount = 0;  // Reset hint counter for new problem

    renderProblem(refView, verseText);
    answerInput.value = "";
    answerInput.placeholder = "정답 입력..."; // Reset hint placeholder
    answerInput.focus();
}

function renderProblem(refText, verseText) {
    problemArea.innerHTML = '';

    // Create Layout
    const refDiv = document.createElement('div');
    refDiv.className = 'reference-block';
    refDiv.textContent = refText;

    // Append
    problemArea.appendChild(refDiv);

    // Create Verse Content Wrapper
    const verseDiv = document.createElement('div');
    verseDiv.className = 'verse-content';
    verseDiv.appendChild(document.createTextNode(verseText));
    problemArea.appendChild(verseDiv);

    // problemArea.textContent = text; // OLD
    problemArea.style.fontSize = fontSize + 'px';
}

function createProblem(line, mode) {
    // Handle Level prefix: "1\(Ref)^Text"
    // Remove level prefix if exists for display
    let cleanLine = line;
    // Regex to match "Number\" at start
    const levelMatch = line.match(/^(\d+)\\/);
    if (levelMatch) {
        cleanLine = line.substring(levelMatch[0].length);
    }

    let [reference, verse] = cleanLine.split('^');
    if (!verse) { // Handle cases without ^ separator if any
        verse = cleanLine;
        reference = "";
    }

    const words = verse.trim().split(/\s+/);

    if (mode === 1) { // Blank Mode
        const numWords = words.length;
        let numBlanks = Math.floor(numWords * blankNum * 0.1);
        numBlanks = Math.max(0, Math.min(numBlanks, numWords));

        const maskableIdx = words.map((w, i) => WORD_TOKEN_RE.test(w) ? i : -1).filter(i => i !== -1);
        numBlanks = Math.min(numBlanks, maskableIdx.length);

        // Random sample
        const shuffled = maskableIdx.sort(() => 0.5 - Math.random());
        const blankIndices = shuffled.slice(0, numBlanks).sort((a, b) => a - b);

        const answers = blankIndices.map(i => normToken(words[i]));
        const problemWords = words.map((w, i) => blankIndices.includes(i) ? maskLenKeepPunct(w) : w);

        const refView = refMasked(reference, false);
        return [refView, problemWords.join(" "), answers, reference];
    }
    else if (mode === 2) { // Verse Mode
        const answers = words.filter(w => WORD_TOKEN_RE.test(w)).map(w => normToken(w));
        const problemWords = words.map(w => WORD_TOKEN_RE.test(w) ? maskOneKeepPunct(w) : w);
        const refView = refMasked(reference, false);
        return [refView, problemWords.join(" "), answers, reference];
    }
    else if (mode === 3) { // Reference Mode
        let [book, chap, versePart] = parseRefParts(reference);
        let [_, verseParts] = splitVerseParts(versePart);
        const refView = refMasked(reference, true);
        const answers = [book, chap, ...verseParts];
        return [refView, words.join(" "), answers, reference];
    }
    else if (mode === 4) { // Whole Mode
        const n = Math.min(wholeLevelNum, words.length);

        // Always start visible words from the beginning (Index 0)
        const visibleWords = words.slice(0, n);
        const hiddenWords = words.slice(n);

        // Problem words: Visible words + Masked hidden words
        const problemWords = [
            ...visibleWords,
            ...hiddenWords.map(w => WORD_TOKEN_RE.test(w) ? maskOneKeepPunct(w) : w)
        ];

        // Reference is Visible (false for masked) -> NOW MASKED (true)
        const refView = refMasked(reference, true);

        // Answers: Only the hidden words (Skip reference input)
        // [New Logic] In Whole Mode, we also want to answer the reference parts
        let [book, chap, versePart] = parseRefParts(reference);
        let [_, verseParts] = splitVerseParts(versePart);

        const answers = [book, chap, ...verseParts]; // Start with reference parts

        hiddenWords.forEach(w => {
            if (WORD_TOKEN_RE.test(w)) {
                answers.push(normToken(w));
            }
        });

        return [refView, problemWords.join(" "), answers, reference];
    }

    return ["", "", [], ""];
}

let autoAdvanceTimer = null;

function submitAnswer() {
    const userAnswer = answerInput.value.trim();
    if (currentMode === 4) {
        ensureFullscreen();
    }

    if (problemCompleted) {
        nextProblem();
        return;
    }

    if (currentScripture.length === 0 || currentAnswers.length === 0) return;

    if (normToken(userAnswer) === normToken(currentAnswers[0])) {
        score += 10;
        updateStatus();
        replaceBlankWithAnswer(currentAnswers[0], true);
        currentAnswers.shift();
        answerInput.value = "";
        answerInput.placeholder = "정답 입력..."; // Reset hint placeholder
        attempts = 0;
        hintCount = 0; // Reset hint count for next blank
        if (currentAnswers.length === 0) {
            problemCompleted = true;
            // Auto-advance
            autoAdvanceTimer = setTimeout(nextProblem, 500);
        }
    } else {
        attempts++;
        answerInput.value = "";
        answerInput.placeholder = "정답 입력..."; // Reset hint if wrong? Or keep hint? Usually reset input state.
        if (attempts >= 3) {
            handleWrongAnswer();
        } else {
            score -= 1;
            updateStatus();
            // Visual feedback for wrong answer?
            problemArea.classList.add('shake');
            setTimeout(() => problemArea.classList.remove('shake'), 500);
        }
    }
}

function handleWrongAnswer() {
    const wrongVerse = {
        reference: currentReference,
        full_text: currentScripture[problemNum]
    };

    // Check duplicate
    if (!wrongVerses.some(w => w.full_text === wrongVerse.full_text)) {
        wrongVerses.push(wrongVerse);
    }

    replaceBlankWithAnswer(currentAnswers[0], false);
    currentAnswers.shift();
    failNum++;
    score -= 5;
    updateStatus();
    failNum++;
    score -= 5;
    updateStatus();
    attempts = 0;
    hintCount = 0; // Reset hint count for next blank
    answerInput.placeholder = "정답 입력..."; // Reset hint placeholder
    if (currentAnswers.length === 0) {
        problemCompleted = true;
    }
}

function replaceBlankWithAnswer(answer, correct) {
    // 1. Try Reference Block Reference
    const refContainer = problemArea.querySelector('.reference-block');
    if (refContainer) {
        if (replaceInContainer(refContainer, answer, correct)) return;
    }

    // 2. Try Verse Content
    const verseContainer = problemArea.querySelector('.verse-content');
    if (verseContainer) {
        if (replaceInContainer(verseContainer, answer, correct)) return;
    }
}

function replaceInContainer(container, answer, correct) {
    const children = Array.from(container.childNodes);
    let foundBlank = false;

    // Build new content
    const newContent = document.createDocumentFragment();

    for (let i = 0; i < children.length; i++) {
        const node = children[i];

        if (!foundBlank) {
            // Check if this is a text node with underscores
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                const match = text.match(/(_+)/);

                if (match) {
                    const blankIndex = text.indexOf(match[0]);
                    const beforeBlank = text.substring(0, blankIndex);
                    const afterBlank = text.substring(blankIndex + match[0].length);

                    // Add text before blank
                    if (beforeBlank) {
                        newContent.appendChild(document.createTextNode(beforeBlank));
                    }

                    // Add the answer with color
                    const answerSpan = document.createElement('span');
                    answerSpan.className = correct ? 'correct' : 'wrong';
                    answerSpan.textContent = answer;
                    newContent.appendChild(answerSpan);

                    // Add text after blank
                    if (afterBlank) {
                        newContent.appendChild(document.createTextNode(afterBlank));
                    }

                    foundBlank = true;
                    continue;
                }
            }
            // Check if this is a hint span
            else if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('hint-text')) {
                // Replace hint with answer
                const answerSpan = document.createElement('span');
                answerSpan.className = correct ? 'correct' : 'wrong';
                answerSpan.textContent = answer;
                newContent.appendChild(answerSpan);
                foundBlank = true;

                // Skip any underscores immediately after the hint
                if (i + 1 < children.length && children[i + 1].nodeType === Node.TEXT_NODE) {
                    const nextText = children[i + 1].textContent;
                    if (nextText.match(/^_+/)) {
                        i++; // Skip the underscore node
                        // Add any text after the underscores
                        const afterUnderscores = nextText.replace(/^_+/, '');
                        if (afterUnderscores) {
                            newContent.appendChild(document.createTextNode(afterUnderscores));
                        }
                    }
                }
                continue;
            }
        }


        // Preserve structure
        newContent.appendChild(node.cloneNode(true));
    }

    if (foundBlank) {
        // Clear and update container
        container.textContent = '';
        container.appendChild(newContent);
        return true;
    }
    return false;
}

function nextProblem() {
    if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
        autoAdvanceTimer = null;
    }
    currentScripture.splice(problemNum, 1);
    leftVerse--;
    updateStatus();
    displayProblem();
}


// --- Helper for Fullscreen Persistence ---
function ensureFullscreen() {
    if (currentMode === 4 && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log("Fullscreen attempt failed: ", err);
        });
    }
}

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

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        loadFiles(e.target.files);
    }
});

answerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        submitAnswer();
    }
});

// Restore fullscreen when keyboard closes (blur)
answerInput.addEventListener('blur', () => {
    if (currentMode === 4) {
        setTimeout(ensureFullscreen, 100); // Small delay to allow UI to settle
    }
});

modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = parseInt(btn.dataset.mode);

        if (currentMode === 4) {
            ensureFullscreen();
        } else if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => console.log("Exit Fullscreen failed:", err));
        }

        displayProblem();
    });
});


btnHint.addEventListener('click', () => {
    if (!currentAnswers.length || problemCompleted) return;

    ensureFullscreen();

    const answer = currentAnswers[0];
    let hintPart = '';

    // Step 1: First char
    // Step 2: Half length
    // Step 3: Full answer
    if (hintCount === 0) {
        hintPart = answer.charAt(0);
    } else if (hintCount === 1) {
        // If word is short (<=2 chars), show full answer immediately at step 2
        if (answer.length <= 2) {
            hintPart = answer;
        } else {
            const half = Math.ceil(answer.length / 2);
            hintPart = answer.substring(0, half);
        }
    } else {
        hintPart = answer;
    }

    hintCount++;
    score -= 2;
    attempts++; // Deduct attempt (increase attempt count)
    updateStatus();

    answerInput.placeholder = `힌트: ${hintPart}...`;
    answerInput.focus();

    applyHintToDisplay(hintPart, answer);
});

// function applyHintToDisplay(hintPart, fullAnswer) { ... }
// Needs update to target .verse-content as well
function applyHintToDisplay(hintPart, fullAnswer) {
    const verseContainer = problemArea.querySelector('.verse-content');
    if (!verseContainer) return;

    const children = Array.from(verseContainer.childNodes);
    let foundBlank = false;
    const newContent = document.createDocumentFragment();

    for (let i = 0; i < children.length; i++) {
        const node = children[i];

        if (!foundBlank) {
            // 1. Check for existing hint span to update
            if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('hint-text')) {
                const hintSpan = document.createElement('span');
                hintSpan.className = 'hint-text';
                // hintSpan.style.color value removed to use CSS variables

                const remainingUnderscores = '_'.repeat(Math.max(0, fullAnswer.length - hintPart.length));
                hintSpan.textContent = hintPart + remainingUnderscores;

                newContent.appendChild(hintSpan);
                foundBlank = true;
                continue;
            }

            // 2. Check for text node with underscores
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                const match = text.match(/(_+)/);

                if (match) {
                    const blankIndex = text.indexOf(match[0]);
                    const beforeBlank = text.substring(0, blankIndex);

                    if (beforeBlank) {
                        newContent.appendChild(document.createTextNode(beforeBlank));
                    }

                    const hintSpan = document.createElement('span');
                    hintSpan.className = 'hint-text';
                    // hintSpan.style.color value removed to use CSS variables

                    const remainingUnderscores = '_'.repeat(Math.max(0, fullAnswer.length - hintPart.length));
                    hintSpan.textContent = hintPart + remainingUnderscores;

                    newContent.appendChild(hintSpan);

                    const afterBlank = text.substring(blankIndex + match[0].length);
                    if (afterBlank) {
                        newContent.appendChild(document.createTextNode(afterBlank));
                    }

                    foundBlank = true;
                    continue;
                }
            }
        }

        // Preserve existing nodes
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SPAN' && !node.classList.contains('hint-text')) {
            newContent.appendChild(node.cloneNode(true)); // Preserve previous answers!
        } else {
            newContent.appendChild(node.cloneNode(true));
        }
    }

    verseContainer.textContent = '';
    verseContainer.appendChild(newContent);
}

btnWrong.addEventListener('click', () => {
    if (wrongVerses.length === 0) {
        alert("틀린 구절이 없습니다.");
        return;
    }
    currentScripture = wrongVerses.map(w => w.full_text);
    leftVerse = currentScripture.length;
    failNum = 0;
    wrongVerses = [];
    updateStatus();
    displayProblem();
});

btnFontUp.addEventListener('click', () => {
    fontSize += 2;
    problemArea.style.fontSize = fontSize + 'px';
});

btnFontDown.addEventListener('click', () => {
    if (fontSize > 10) fontSize -= 2;
    problemArea.style.fontSize = fontSize + 'px';
});

// --- Add Day Modal Logic ---
const btnAddDay = document.getElementById('btnAddDay');
const addDayModal = document.getElementById('addDayModal');
const closeAddDay = document.getElementById('closeAddDay');
const btnSaveDay = document.getElementById('btnSaveDay');
const newDayTitle = document.getElementById('newDayTitle');

btnAddDay.addEventListener('click', () => {
    addDayModal.style.display = "block";
    newDayTitle.value = "";
    newDayTitle.focus();
});

closeAddDay.addEventListener('click', () => {
    addDayModal.style.display = "none";
});

btnSaveDay.addEventListener('click', () => {
    const title = newDayTitle.value.trim();
    if (!title) {
        alert("일차 제목을 입력해주세요.");
        return;
    }

    // Create new empty day
    originalScriptures.push([]);
    originalFilenames.push(title);
    saveDataToStorage();

    // Update dropdowns
    updateDaySelect();

    // Select the new day
    daySelect.value = originalScriptures.length - 1;
    selectDay(originalScriptures.length - 1);

    addDayModal.style.display = "none";
});

// --- Add Verse Modal Logic ---
const btnOpenAddVerse = document.getElementById('btnOpenAddVerse');
const addVerseModal = document.getElementById('addVerseModal');
const closeAddVerse = document.getElementById('closeAddVerse');
const targetDaySelect = document.getElementById('targetDaySelect');
const btnAddVerseToDay = document.getElementById('btnAddVerseToDay');

btnOpenAddVerse.addEventListener('click', () => {
    // Populate target day select
    targetDaySelect.innerHTML = '<option value="" disabled selected>일차 선택</option>';
    originalFilenames.forEach((name, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = name.replace('.txt', '');
        targetDaySelect.appendChild(option);
    });

    // Pre-select current day if valid
    if (currentDayIndex !== -1) {
        targetDaySelect.value = currentDayIndex;
    }

    addVerseModal.style.display = "block";
    inputRef.value = "";
    inputVerse.value = "";
    inputRef.focus();
});

closeAddVerse.addEventListener('click', () => {
    addVerseModal.style.display = "none";
});

btnAddVerseToDay.addEventListener('click', () => {
    const targetIndex = parseInt(targetDaySelect.value);
    const ref = inputRef.value.trim();
    const text = inputVerse.value.trim();
    const level = inputLevel.value;

    if (isNaN(targetIndex)) {
        alert("추가할 일차를 선택해주세요.");
        return;
    }
    if (!ref || !text) {
        alert("장절과 내용을 모두 입력해주세요.");
        return;
    }

    // Format: Level\(Ref)^Text
    const formatted = `${level}\\(${ref})^${text}`;

    // Add to selected day
    originalScriptures[targetIndex].push(formatted);
    saveDataToStorage();

    alert("추가되었습니다!");

    // Clear inputs but keep modal open for more additions
    inputRef.value = "";
    inputVerse.value = "";
    inputRef.focus();

    // If we added to the currently viewed day, refresh the view
    if (targetIndex === currentDayIndex) {
        dayReset();
    }
});


// --- Delete Verse Modal Logic ---

btnOpenDeleteVerse.addEventListener('click', () => {
    // Populate day select
    deleteDaySelect.innerHTML = '<option value="" disabled selected>일차 선택</option>';
    originalFilenames.forEach((name, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = name.replace('.txt', '');
        deleteDaySelect.appendChild(option);
    });

    // Pre-select current day if valid
    if (currentDayIndex !== -1) {
        deleteDaySelect.value = currentDayIndex;
        renderDeleteVerseList(currentDayIndex);
    } else {
        deleteVerseList.innerHTML = '';
    }

    deleteVerseModal.style.display = "block";
});

closeDeleteVerse.addEventListener('click', () => {
    deleteVerseModal.style.display = "none";
});

deleteDaySelect.addEventListener('change', (e) => {
    const index = parseInt(e.target.value);
    if (!isNaN(index)) {
        renderDeleteVerseList(index);
    }
});

function renderDeleteVerseList(dayIndex) {
    deleteVerseList.innerHTML = '';
    const verses = originalScriptures[dayIndex];

    if (!verses || verses.length === 0) {
        deleteVerseList.innerHTML = '<li>구절이 없습니다.</li>';
        return;
    }

    verses.forEach((line, vIndex) => {
        const li = document.createElement('li');
        li.className = 'verse-item';

        // Parse line to show friendly text
        // Format: Level\(Ref)^Text
        let displayLevel = "?";
        let content = line;

        const levelMatch = line.match(/^(\d+)\\/);
        if (levelMatch) {
            displayLevel = levelMatch[1];
            if (displayLevel === "0") displayLevel = "전체";
            content = line.substring(levelMatch[0].length);
        }

        let [ref, text] = content.split('^');
        if (!text) text = content;

        li.innerHTML = `
            <div class="verse-info">
                <span class="verse-level">[${displayLevel}과정]</span>
                <span class="verse-ref">${ref}</span>
                <span class="verse-text">${text.substring(0, 30)}...</span>
            </div>
            <button class="btn-delete-item" onclick="deleteVerse(${dayIndex}, ${vIndex})">삭제</button>
        `;
        deleteVerseList.appendChild(li);
    });
}

// Global function for delete button onclick
window.deleteVerse = function (dayIndex, verseIndex) {
    if (!confirm("정말 이 구절을 삭제하시겠습니까?")) return;

    // Remove verse
    originalScriptures[dayIndex].splice(verseIndex, 1);
    saveDataToStorage();

    // Re-render list
    renderDeleteVerseList(dayIndex);

    // If we deleted from the currently viewed day, refresh the view
    if (dayIndex === currentDayIndex) {
        dayReset();
    }
};

// Update window click to close new modal
window.addEventListener('click', (e) => {
    if (e.target == addDayModal) {
        addDayModal.style.display = "none";
    }
    if (e.target == addVerseModal) {
        addVerseModal.style.display = "none";
    }
    if (e.target == deleteVerseModal) {
        deleteVerseModal.style.display = "none";
    }
    if (e.target == deleteDayModal) {
        deleteDayModal.style.display = "none";
    }
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

// Delete Day Logic
// Delete Day Logic
btnDelete.addEventListener('click', () => {
    if (currentDayIndex === -1) {
        alert("삭제할 일차를 선택해주세요.");
        return;
    }

    const dayName = originalFilenames[currentDayIndex];
    deleteDayMessage.textContent = `정말 '${dayName.replace('.txt', '')}'을(를) 삭제하시겠습니까?`;
    deleteDayModal.style.display = 'flex';
});

btnConfirmDeleteDay.addEventListener('click', () => {
    if (currentDayIndex === -1) return;

    originalScriptures.splice(currentDayIndex, 1);
    originalFilenames.splice(currentDayIndex, 1);
    saveDataToStorage();

    // Re-render dropdown
    updateDaySelect();

    // Reset view
    currentDayIndex = -1;
    daySelect.value = "";
    dayReset();

    deleteDayModal.style.display = 'none';
});

btnCancelDeleteDay.addEventListener('click', () => {
    deleteDayModal.style.display = 'none';
});

if (closeDeleteDay) {
    closeDeleteDay.addEventListener('click', () => deleteDayModal.style.display = 'none');
}



btnSkip.addEventListener('click', () => {
    if (currentScripture.length === 0) return;
    ensureFullscreen();
    nextProblem();
});

btnReset.addEventListener('click', () => {
    if (confirm("정말 초기화 하시겠습니까?")) {
        // Reload data from storage or default
        loadDataFromStorage();
        // Reset view
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
    }
});

// Theme Logic
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (btnTheme) btnTheme.textContent = '☀️';
    } else {
        document.documentElement.removeAttribute('data-theme');
        if (btnTheme) btnTheme.textContent = '🌙';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        btnTheme.textContent = '🌙';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        btnTheme.textContent = '☀️';
    }
}

if (btnTheme) {
    btnTheme.addEventListener('click', toggleTheme);
    initTheme();
}



// --- Settings Popups Logic ---
const btnSettingBlank = document.getElementById('btnSettingBlank');
const btnSettingWhole = document.getElementById('btnSettingWhole');
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
if (btnSettingBlank) {
    btnSettingBlank.addEventListener('click', (e) => {
        console.log("Blank Setting Clicked");
        e.stopPropagation();
        try {
            updateBlankGridActive();
            blankSettingsModal.style.display = 'block';
            console.log("Blank Modal Display Set to Block");
        } catch (err) {
            console.error("Error opening blank modal:", err);
        }
    });
} else {
    console.error("btnSettingBlank not found");
}

if (closeBlankSettings) {
    closeBlankSettings.addEventListener('click', () => blankSettingsModal.style.display = 'none');
}

if (btnSettingWhole) {
    btnSettingWhole.addEventListener('click', (e) => {
        console.log("Whole Setting Clicked");
        e.stopPropagation();
        try {
            updateWholeGridActive();
            wholeSettingsModal.style.display = 'block';
            console.log("Whole Modal Display Set to Block");
        } catch (err) {
            console.error("Error opening whole modal:", err);
        }
    });
} else {
    console.error("btnSettingWhole not found");
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
                // Determine if we need to reshuffle? displayProblem picks new random if we don't fix seed.
                // Actually displayProblem picks NEW problem line? No.
                // displayProblem:
                // problemNum = Math.floor(Math.random()...) -> Yes it picks NEW line.
                // If user just wants to adjust difficulty of SAME line?
                // renderProblem is pure render. createProblem creates mask.
                // If I call displayProblem(), it jumps to another verse.
                // User might find this annoying.
                // Ideally: recalculate mask for CURRENT line.
                // Line 503: const line = currentScripture[problemNum];
                // So I can reuse problemNum.
                // But displayProblem() picks new num.
                // Refactor displayProblem to accept optional index?
                // Or just call createProblem again?
                reloadCurrentProblem();
            }
        }
    });
}

if (wholeLevelGrid) {
    wholeLevelGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-option')) {
            const words = parseInt(e.target.dataset.words);
            wholeLevelNum = words;
            wholeSettingsModal.style.display = 'none';
            if (currentMode === 4) {
                reloadCurrentProblem();
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

// --- TTS Logic ---

function populateVoices() {
    if (!voiceSelect) return;
    const voices = window.speechSynthesis.getVoices();
    // Filter Korean
    const koVoices = voices.filter(v => v.lang.includes('ko'));

    // Toggle Help Button (Show always)
    if (btnVoiceHelp) btnVoiceHelp.style.display = 'inline-block';

    // Clear
    voiceSelect.innerHTML = "";

    if (koVoices.length === 0) {
        voiceSelect.style.display = 'none';
        return;
    }

    // Show select
    voiceSelect.style.display = 'inline-block';

    const savedVoiceURI = localStorage.getItem('bible-voice-uri');
    let foundSaved = false;

    koVoices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.textContent = voice.name; // Display name
        option.value = voice.voiceURI;   // Unique ID

        if (savedVoiceURI === voice.voiceURI) {
            option.selected = true;
            foundSaved = true;
        }

        voiceSelect.appendChild(option);
    });

    // If no saved voice found, try to default to "Male" if available, else first
    if (!foundSaved && !savedVoiceURI) {
        // Only if user hasn't chosen one.
        const maleVoice = koVoices.find(v => v.name.includes('Male') || v.name.includes('남자') || v.name.toUpperCase().includes('INJOON'));
        if (maleVoice) {
            voiceSelect.value = maleVoice.voiceURI;
        }
    }
}

if (voiceSelect) {
    voiceSelect.addEventListener('change', () => {
        localStorage.setItem('bible-voice-uri', voiceSelect.value);
    });
}
if (btnVoiceHelp) {
    btnVoiceHelp.addEventListener('click', () => {
        if (modalVoiceHelp) modalVoiceHelp.style.display = 'flex';
    });
}
if (btnCloseVoiceHelp) {
    btnCloseVoiceHelp.addEventListener('click', () => {
        if (modalVoiceHelp) modalVoiceHelp.style.display = 'none';
    });
}
window.addEventListener('click', (e) => {
    if (e.target === modalVoiceHelp) {
        modalVoiceHelp.style.display = 'none';
    }
});

// Populate on load
populateVoices();
if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = populateVoices;
}

if (btnTTS) {
    btnTTS.addEventListener('click', () => {
        ensureFullscreen();
        if (isSpeaking) {
            stopTTS();
        } else {
            speakCurrentVerse();
        }
    });
}

function stopTTS() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    isSpeaking = false;
    if (btnTTS) {
        btnTTS.classList.remove('active');
        btnTTS.style.color = "";
    }
}

function speakCurrentVerse() {
    if (!currentScripture || currentScripture.length === 0 || typeof problemNum === 'undefined') return;

    // Parse raw line
    const line = currentScripture[problemNum];
    if (!line) return;

    let cleanLine = line;
    const levelMatch = line.match(/^(\d+)\\/);
    if (levelMatch) {
        cleanLine = line.substring(levelMatch[0].length);
    }
    let [reference, verse] = cleanLine.split('^');
    if (!verse) {
        verse = cleanLine;
        reference = "";
    }

    let spokenReference = reference;
    if (spokenReference) {
        // Function to convert number to Sino-Korean text
        const numToText = (match, num, unit) => {
            const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
            let n = parseInt(num);
            if (n >= 1000) return num + unit;

            let res = "";
            if (n >= 100) {
                res += (n >= 200 ? digits[Math.floor(n / 100)] : "") + '백';
                n %= 100;
            }
            if (n >= 10) {
                res += (n >= 20 ? digits[Math.floor(n / 10)] : "") + '십';
                n %= 10;
            }
            if (n > 0 || res === "") {
                res += digits[n];
            }
            return res + unit;
        };

        spokenReference = spokenReference.replace(/:/g, '장 ');
        spokenReference = spokenReference.replace(/-/g, '에서 ');
        spokenReference += '절';

        // Convert numbers to Text (Sino-Korean)
        spokenReference = spokenReference.replace(/(\d+)(장|절)/g, numToText);
        spokenReference = spokenReference.replace(/(\d+)에서/g, (m, n) => numToText(m, n, "에서"));
    }

    const textToSpeak = (spokenReference ? spokenReference + ". " : "") + verse;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.0;

    // --- Voice Selection Logic ---
    const allVoices = window.speechSynthesis.getVoices();
    const koVoices = allVoices.filter(v => v.lang.includes('ko'));

    let targetVoice = null;

    // 1. check User Selection
    const savedURI = localStorage.getItem('bible-voice-uri');
    if (savedURI) {
        targetVoice = koVoices.find(v => v.voiceURI === savedURI);
    }

    // 2. If no saved or not found, try Male preference
    if (!targetVoice) {
        targetVoice = koVoices.find(v => v.name.includes('Male') || v.name.includes('남자') || v.name.toUpperCase().includes('INJOON'));
    }

    // 3. Fallback
    if (!targetVoice && koVoices.length > 0) {
        targetVoice = koVoices[0];
    }

    if (targetVoice) {
        utterance.voice = targetVoice;
    }

    utterance.onend = () => {
        isSpeaking = false;
        if (btnTTS) btnTTS.classList.remove('active');
    };

    utterance.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') return;
        console.error("TTS Error:", e);
        isSpeaking = false;
        if (btnTTS) btnTTS.classList.remove('active');
    };

    stopTTS();
    window.speechSynthesis.speak(utterance);
    isSpeaking = true;
    if (btnTTS) {
        btnTTS.classList.add('active');
    }
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


