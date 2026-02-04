// Constants & Regex
const PUNCT_RE = /[,\-]/g;
const WORD_TOKEN_RE = /[0-9A-Za-z가-힣]/;

// State
// --- State Variables (상태 변수들) ---
var originalScriptures = []; // 전체 구절 데이타 (배열의 배열)
var originalFilenames = [];
var currentScripture = [];
var currentDayIndex = -1;
var currentMode = 1; // 1: Blank, 2: Verse, 3: Ref, 4: Whole
var blankNum = 5; // 50%
var wholeLevelNum = 1;
var fontSize = 24;

var currentProblem = "";
var currentAnswers = [];
var currentReference = "";
var problemNum = 0;
var attempts = 0;
var problemCompleted = false;
var leftVerse = 0;
var failNum = 0;
var wrongVerses = [];
var hintCount = 0;
var score = 0;
// Audio state moved to audio.js
console.log('hintCount initialized:', hintCount);

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
// Audio buttons moved to audio.js
// Audio buttons moved to audio.js
const modeBtns = document.querySelectorAll('.btn-mode');

const modalVoiceHelp = document.getElementById('voiceHelpModal');
const btnCloseVoiceHelp = document.getElementById('btnCloseVoiceHelp');

const btnDelete = document.getElementById('btnDelete');

const inputRef = document.getElementById('inputRef');
const inputVerse = document.getElementById('inputVerse');
const inputLevel = document.getElementById('inputLevel');

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

let tempVerses = [];
// --- Helper Functions (Ported from Python) ---

// 기호 제거 및 트림 (문자열 정규화)
function normToken(s) {
    return s.replace(PUNCT_RE, '').trim();
}

// 단어 길이만큼 언더바(_)로 마스킹 (기호는 유지)
function maskLenKeepPunct(tok) {
    return tok.replace(/[0-9A-Za-z가-힣]+/g, (m) => '_'.repeat(m.length));
}

// 단어를 하나의 언더바(_)로 마스킹 (기호는 유지)
function maskOneKeepPunct(tok) {
    return tok.replace(/[0-9A-Za-z가-힣]+/g, '_');
}

// 성경 장절 파싱 (예: "(요 3:16)" -> ["요", "3", "16"])
function parseRefParts(ref) {
    let s = ref.trim();
    if (s.startsWith('(') && s.endsWith(')')) {
        s = s.substring(1, s.length - 1);
    }

    let book, chapVerse;
    let lastSpaceIdx = s.lastIndexOf(' ');
    if (lastSpaceIdx !== -1) {
        book = s.substring(0, lastSpaceIdx).trim();
        chapVerse = s.substring(lastSpaceIdx + 1).trim();
    } else {
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

// 절 부분 파싱 (예: "1-2" 또는 "1,3" 등 처리)
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

// 장절 표시 포맷팅 (masked가 true이면 장절 숫자를 숨김)
function refMasked(ref, masked) {
    let [book, chap, verse] = parseRefParts(ref);
    if (!masked) {
        return `(${book} ${chap}:${verse})`;
    }
    let [verseMask, _] = splitVerseParts(verse);
    return `(_ _:${verseMask})`;
}


// 파일 로드 및 초기화 (File Input 변경 시 호출)
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

            originalScriptures.push(lines);
            originalFilenames.push(file.name);

            const option = document.createElement('option');
            option.value = originalScriptures.length - 1; // Index
            option.textContent = file.name.replace('.txt', '');
            daySelect.appendChild(option);

            loadedCount++;
            if (loadedCount === files.length) {
                saveDataToStorage();
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

// 데이터를 로컬 스토리지에 저장 (새로운 파일 로드 또는 데이터 변경 시)
function saveDataToStorage() {
    localStorage.setItem('bible_scriptures', JSON.stringify(originalScriptures));
    localStorage.setItem('bible_filenames', JSON.stringify(originalFilenames));
    localStorage.setItem('bible_data_version', DATA_VERSION);
}

const DATA_VERSION = "1.6";

// 로컬 스토리지에서 데이터 로드 (앱 시작 시 호출)
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

// 특정 일차 선택 (Dropdown 변경 시)
function selectDay(index) {
    currentDayIndex = index;
    dayReset();
}

// 선택된 일차와 레벨에 맞게 문제 데이터 초기화 및 첫 문제 표시
function dayReset() {
    if (currentDayIndex !== -1) {
        const selectedLevel = levelSelect.value;
        const allVerses = originalScriptures[currentDayIndex];

        if (selectedLevel === "all") {
            currentScripture = [...allVerses];
        } else {
            const maxLevel = parseInt(selectedLevel, 10);

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

// 상태 텍스트 업데이트 (남은 구절, 틀린 갯수, 점수)
function updateStatus() {
    statusText.textContent = `남은 구절: ${leftVerse} | 틀린 갯수: ${failNum} | 점수: ${score}`;
}

// 새로운 문제 표시 (랜덤 선택 및 화면 렌더링)
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

// 문제 화면 렌더링 (참조와 구절 텍스트 표시)
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

    problemArea.style.fontSize = fontSize + 'px';
}

// 문제 생성 로직 (현재 모드에 따라 빈칸 뚫기 등 처리)
function createProblem(line, mode) {
    let cleanLine = line;
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

// 정답 제출 처리 (Enter 키 또는 입력 시)
function submitAnswer() {
    const userAnswer = answerInput.value.trim();

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

// 오답 3회 이상 시 처리 (정답 공개 및 오답 노트 추가)
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
    attempts = 0;
    hintCount = 0; // Reset hint count for next blank
    answerInput.placeholder = "정답 입력..."; // Reset hint placeholder
    if (currentAnswers.length === 0) {
        problemCompleted = true;
    }
}

// 정답을 맞췄을 때 빈칸을 실제 텍스트로 교체 (색상 표시 포함)
// 정답을 맞췄을 때 빈칸을 실제 텍스트로 교체 (색상 표시 포함)
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

// 다음 문제로 이동 (현재 문제 제거 및 상태 업데이트)
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

// Mode Button Logic
// Mode Button Logic
modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const clickedMode = parseInt(btn.dataset.mode);

        // Always switch mode first if it's different
        if (currentMode !== clickedMode) {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = clickedMode;
            displayProblem();
        }

        // Always check to open settings for specific modes
        if (clickedMode === 1) { // Blank Mode
            updateBlankGridActive();
            blankSettingsModal.style.display = 'flex';
        } else if (clickedMode === 4) { // Whole Mode
            updateWholeGridActive();
            wholeSettingsModal.style.display = 'flex';
        }
    });
});


btnHint.addEventListener('click', () => {
    if (!currentAnswers.length || problemCompleted) return;

    const answer = currentAnswers[0];
    let hintPart = '';

    if (hintCount === 0) {
        hintPart = answer.charAt(0);
    } else if (hintCount === 1) {
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

// 힌트 적용 로직 (현재 빈칸에 힌트 텍스트 표시)
function applyHintToDisplay(hintPart, fullAnswer) {
    // 1. Try Reference Block
    const refContainer = problemArea.querySelector('.reference-block');
    if (refContainer) {
        if (applyHintToContainer(refContainer, hintPart, fullAnswer)) return;
    }

    // 2. Try Verse Content
    const verseContainer = problemArea.querySelector('.verse-content');
    if (verseContainer) {
        applyHintToContainer(verseContainer, hintPart, fullAnswer);
    }
}

function applyHintToContainer(container, hintPart, fullAnswer) {
    const children = Array.from(container.childNodes);
    let foundBlank = false;
    const newContent = document.createDocumentFragment();

    for (let i = 0; i < children.length; i++) {
        const node = children[i];

        if (!foundBlank) {
            // 1. Check for existing hint span to update
            if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('hint-text')) {
                const hintSpan = document.createElement('span');
                hintSpan.className = 'hint-text';

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

    if (foundBlank) {
        container.textContent = '';
        container.appendChild(newContent);
        return true;
    }
    return false;
}

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

// Font Size Logic
btnFontUp.addEventListener('click', () => {
    if (fontSize < 50) { // Max limit
        fontSize += 2;
        problemArea.style.fontSize = fontSize + 'px';
    }
});

btnFontDown.addEventListener('click', () => {
    if (fontSize > 14) { // Min limit
        fontSize -= 2;
        problemArea.style.fontSize = fontSize + 'px';
    }
});

// --- Add Day Modal Logic ---
const btnAddDay = document.getElementById('btnAddDay');
const addDayModal = document.getElementById('addDayModal');
const closeAddDay = document.getElementById('closeAddDay');
const btnSaveDay = document.getElementById('btnSaveDay');
const newDayTitle = document.getElementById('newDayTitle');

btnAddDay.addEventListener('click', () => {
    addDayModal.style.display = "flex";
    newDayTitle.value = "";
    newDayTitle.focus();
});

closeAddDay.addEventListener('click', () => {
    addDayModal.style.display = "none";
});

btnSaveDay.addEventListener('click', () => {
    const title = newDayTitle.value.trim();
    if (!title) {
        customAlert("일차 제목을 입력해주세요.");
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

    addVerseModal.style.display = "flex";
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
        customAlert("추가할 일차를 선택해주세요.");
        return;
    }
    if (!ref || !text) {
        customAlert("장절과 내용을 모두 입력해주세요.");
        return;
    }

    // Format: Level\(Ref)^Text
    const formatted = `${level}\\(${ref})^${text}`;

    // Add to selected day
    originalScriptures[targetIndex].push(formatted);
    saveDataToStorage();

    customAlert("추가되었습니다!");

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

    deleteVerseModal.style.display = "flex";
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
    customConfirm("정말 이 구절을 삭제하시겠습니까?", () => {
        // Remove verse
        originalScriptures[dayIndex].splice(verseIndex, 1);
        saveDataToStorage();

        // Re-render list
        renderDeleteVerseList(dayIndex);

        // If we deleted from the currently viewed day, refresh the view
        if (dayIndex === currentDayIndex) {
            dayReset();
        }
    });
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
        customAlert("삭제할 일차를 선택해주세요.");
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
    // Check if we have a custom background active and clear it
    // This allows the manual toggle to restore "Original" dark/light mode behavior
    const hasCustomBg = document.body.className.split(' ').some(c => c.startsWith('bg-'));
    if (hasCustomBg) {
        // Remove all bg- classes
        const classes = Array.from(document.body.classList);
        classes.forEach(c => {
            if (c.startsWith('bg-')) document.body.classList.remove(c);
        });

        // Remove legacy storage
        localStorage.removeItem('bible-bg-theme');

        // Reset grid selections
        const themeOptions = document.querySelectorAll('.theme-option');
        if (themeOptions) {
            themeOptions.forEach(b => b.classList.remove('active'));
        }
    }

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

// Fullscreen Logic
const btnFullscreen = document.getElementById('btnFullscreen');
if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((e) => {
                console.error(`Error attempting to enable full-screen mode: ${e.message} (${e.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    });

    // Update icon on state change
    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            btnFullscreen.textContent = '↙️';
        } else {
            btnFullscreen.textContent = '⛶';
        }
    });
}



// --- Settings Popups Logic ---
// btnSettingBlank and btnSettingWhole declarations removed
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
// btnSettingBlank removed - logic moved to modeBtns click handler

if (closeBlankSettings) {
    closeBlankSettings.addEventListener('click', () => blankSettingsModal.style.display = 'none');
}

// --- Font Settings Logic ---
const btnFontSettings = document.getElementById('btnFontSettings');
const fontSettingsModal = document.getElementById('fontSettingsModal');
const closeFontSettings = document.getElementById('closeFontSettings');
const btnLoadSystemFonts = document.getElementById('btnLoadSystemFonts');
const fontList = document.getElementById('fontList');
const fontSizeSlider = document.getElementById('fontSizeSlider');
const fontSizeDisplay = document.getElementById('fontSizeDisplay');
const fontBoldCheckbox = document.getElementById('fontBoldCheckbox');
const btnResetFont = document.getElementById('btnResetFont');
const btnCloseFontSettings = document.getElementById('btnCloseFontSettings');

// Default Fonts
const defaultFonts = [
    { name: '기본 (Noto Sans KR)', family: "'Noto Sans KR', sans-serif" },
    { name: '나눔고딕 (Nanum Gothic)', family: "'Nanum Gothic', sans-serif" },
    { name: '나눔명조 (Nanum Myeongjo)', family: "'Nanum Myeongjo', serif" },
    { name: '고운돋움 (Gowun Dodum)', family: "'Gowun Dodum', sans-serif" },
    { name: '고운바탕 (Gowun Batang)', family: "'Gowun Batang', serif" },
    { name: '주아 (Jua)', family: "'Jua', sans-serif" },
    { name: '도현 (Do Hyeon)', family: "'Do Hyeon', sans-serif" },
    { name: '나눔손글씨 펜 (Nanum Pen)', family: "'Nanum Pen Script', cursive" },
    { name: '해바라기 (Sunflower)', family: "'Sunflower', sans-serif" },
    { name: '동글 (Dongle)', family: "'Dongle', sans-serif" },
    { name: '검은고딕 (Black Han Sans)', family: "'Black Han Sans', sans-serif" },
    { name: '개구 (Gaegu)', family: "'Gaegu', cursive" },
    { name: '감자꽃 (Gamja Flower)', family: "'Gamja Flower', cursive" },
    { name: '하이멜로디 (Hi Melody)', family: "'Hi Melody', cursive" },
    { name: '본명조 (Noto Serif KR)', family: "'Noto Serif KR', serif" }
];

let systemFonts = [];
let selectedFontFamily = defaultFonts[0].family;
let isBold = true; // Default style reference

// Initialize Font Settings
function initFontSettings() {
    renderFontList();

    // Sync slider with current font size
    fontSizeSlider.value = fontSize;
    updateFontSizeDisplay(fontSize);

    // Sync bold state (check style.css or current inline)
    isBold = document.body.style.fontWeight !== '400';
    fontBoldCheckbox.checked = isBold;
}

function renderFontList() {
    fontList.innerHTML = '';

    // Add Default Fonts
    defaultFonts.forEach(font => {
        createFontItem(font);
    });

    // Add System Fonts (if any)
    if (systemFonts.length > 0) {
        const divider = document.createElement('div');
        divider.className = 'divider';
        divider.style.margin = '10px 0';
        divider.style.borderBottom = '1px solid var(--border)';
        fontList.appendChild(divider);

        systemFonts.forEach(font => {
            createFontItem(font);
        });
    }
}

function createFontItem(font) {
    const div = document.createElement('div');
    div.className = 'font-item';
    if (selectedFontFamily.includes(font.family) || (font.postscriptName && selectedFontFamily.includes(font.postscriptName))) {
        div.classList.add('active');
    }
    div.textContent = font.name;
    div.style.fontFamily = font.family;

    div.addEventListener('click', () => {
        selectedFontFamily = font.family;
        document.documentElement.style.setProperty('--app-font', selectedFontFamily);

        // Update active class
        const items = fontList.querySelectorAll('.font-item');
        items.forEach(item => item.classList.remove('active'));
        div.classList.add('active');
    });

    fontList.appendChild(div);
}

// Event Listeners
if (btnFontSettings) {
    btnFontSettings.addEventListener('click', () => {
        initFontSettings();
        fontSettingsModal.style.display = 'flex';
    });
}

if (closeFontSettings) closeFontSettings.addEventListener('click', () => fontSettingsModal.style.display = 'none');
if (btnCloseFontSettings) btnCloseFontSettings.addEventListener('click', () => fontSettingsModal.style.display = 'none');

btnLoadSystemFonts.addEventListener('click', async () => {
    try {
        if (!window.queryLocalFonts) {
            customAlert('이 브라우저는 시스템 폰트 불러오기를 지원하지 않습니다. (Chrome/Edge PC 버전 권장)');
            return;
        }

        const permission = await navigator.permissions.query({ name: 'local-fonts' });
        if (permission.state === 'denied') {
            customAlert('폰트 접근 권한이 거부되었습니다.');
            return;
        }

        const fonts = await window.queryLocalFonts();
        // Filter Korean capable fonts (simple heuristic or just list all unique families)
        const uniqueFamilies = [...new Set(fonts.map(f => f.family))];

        systemFonts = uniqueFamilies.map(fam => ({ name: fam, family: `"${fam}"` })).sort((a, b) => a.name.localeCompare(b.name));

        customAlert(`시스템 폰트 ${systemFonts.length}개를 불러왔습니다.`);
        renderFontList();
        btnLoadSystemFonts.style.display = 'none';

    } catch (err) {
        console.error(err);
        customAlert('시스템 폰트를 불러오는 중 오류가 발생했습니다: ' + err.message);
    }
});

// Font Size Slider
fontSizeSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    fontSize = val;
    problemArea.style.fontSize = fontSize + 'px';
    updateFontSizeDisplay(val);
});

function updateFontSizeDisplay(size) {
    // approx rem calculation based on 16px base, roughly
    const rem = (size / 16).toFixed(1);
    fontSizeDisplay.textContent = `${size}px (${rem}rem)`;
}

// Bold Checkbox
fontBoldCheckbox.addEventListener('change', (e) => {
    isBold = e.target.checked;
    if (isBold) {
        document.body.style.fontWeight = '700';
    } else {
        document.body.style.fontWeight = '400';
    }
});

// Reset
btnResetFont.addEventListener('click', () => {
    selectedFontFamily = defaultFonts[0].family;
    document.documentElement.style.setProperty('--app-font', selectedFontFamily);
    fontSize = 28; // Default size
    isBold = true;

    // Apply
    document.body.style.fontFamily = '';
    problemArea.style.fontSize = '28px';
    document.body.style.fontWeight = ''; // Revert to CSS default (700)

    initFontSettings();
});

// btnSettingWhole removed - logic moved to modeBtns click handler
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
    const koVoices = voices.filter(v => v.lang.includes('ko'));

    if (btnVoiceHelp) btnVoiceHelp.style.display = 'inline-block';

    voiceSelect.innerHTML = "";

    if (koVoices.length === 0) {
        voiceSelect.style.display = 'none';
        return;
    }

    voiceSelect.style.display = 'inline-block';

    const savedVoiceURI = localStorage.getItem('bible-voice-uri');
    let foundSaved = false;

    koVoices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.textContent = voice.name;
        option.value = voice.voiceURI;

        if (savedVoiceURI === voice.voiceURI) {
            option.selected = true;
            foundSaved = true;
        }

        voiceSelect.appendChild(option);
    });

    if (!foundSaved && !savedVoiceURI) {
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

populateVoices();
if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = populateVoices;
}

if (btnTTS) {
    btnTTS.addEventListener('click', () => {
        if (isSpeaking) {
            stopTTS();
        } else {
            speakCurrentVerse();
        }
    });
}



// Background Theme Logic
// Background Theme Logic
const bgThemes = {
    solid: [
        // Light Themes
        { id: 'solid-white', class: 'bg-solid-white', color: '#F8F9FA', isDark: false, name: 'White' },
        { id: 'solid-cream', class: 'bg-solid-cream', color: '#FDFBF7', isDark: false, name: 'Cream' },
        { id: 'solid-paper', class: 'bg-solid-paper', color: '#F4ECD8', isDark: false, name: 'Paper' },

        // Dark Themes
        { id: 'solid-dark-gray', class: 'bg-solid-dark-gray', color: '#343A40', isDark: true, name: 'Dark Gray' },
        { id: 'solid-black', class: 'bg-solid-black', color: '#121212', isDark: true, name: 'Black' },
        { id: 'solid-navy', class: 'bg-solid-navy', color: '#1A237E', isDark: true, name: 'Navy' },
        { id: 'solid-forest', class: 'bg-solid-forest', color: '#1B5E20', isDark: true, name: 'Forest' }
    ]
};

const btnBackground = document.getElementById('btnBackground');
const backgroundModal = document.getElementById('backgroundModal');
const closeBackgroundSettings = document.getElementById('closeBackgroundSettings');
const btnCloseBackgroundSettings = document.getElementById('btnCloseBackgroundSettings');

function initBackgrounds() {
    renderThemeGrid('themeSimpleGrid', bgThemes.solid);

    // Load saved theme
    const savedTheme = localStorage.getItem('bible-bg-theme');
    if (savedTheme) {
        // Find theme object to check isDark status
        const themeObj = bgThemes.solid.find(t => t.class === savedTheme);
        if (themeObj) {
            applyTheme(savedTheme, themeObj.isDark);
        } else {
            // Fallback if saved theme no longer exists (e.g. was gradient)
            applyTheme('bg-solid-white', false);
        }
    }
}

function renderThemeGrid(gridId, themes) {
    const container = document.getElementById(gridId);
    if (!container) return;
    container.innerHTML = '';

    themes.forEach(theme => {
        const btn = document.createElement('div');
        btn.className = 'theme-option';
        // btn.dataset.themeClass = theme.class; // Not strictly needed if we use closure
        btn.style.background = theme.color;
        btn.title = theme.name;

        btn.addEventListener('click', () => {
            // Highlight selection
            document.querySelectorAll('.theme-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyTheme(theme.class, theme.isDark);
        });

        // Mark active if matches current
        if (document.body.classList.contains(theme.class)) {
            btn.classList.add('active');
        }

        container.appendChild(btn);
    });
}

function applyTheme(themeClass, isDark) {
    // Remove all old bg classes
    const solidClasses = bgThemes.solid.map(t => t.class);
    // Also remove legacy classes just in case
    const legacyClasses = [
        'bg-simple', 'bg-gradient-pastel', 'bg-gradient-sky', 'bg-gradient-soda', 'bg-gradient-sunset',
        'bg-nature-forest', 'bg-nature-sea', 'bg-nature-sky', 'bg-nature-stars'
    ];

    document.body.classList.remove(...solidClasses, ...legacyClasses);

    // Add new class
    document.body.classList.add(themeClass);
    localStorage.setItem('bible-bg-theme', themeClass);

    // Adaptive Dark Mode Logic
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        if (btnTheme) btnTheme.textContent = '☀️';
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        if (btnTheme) btnTheme.textContent = '🌙';
    }
}

if (btnBackground) {
    btnBackground.addEventListener('click', () => {
        if (backgroundModal) backgroundModal.style.display = 'flex';
    });
}

if (closeBackgroundSettings) {
    closeBackgroundSettings.addEventListener('click', () => {
        if (backgroundModal) backgroundModal.style.display = 'none';
    });
}

if (btnCloseBackgroundSettings) {
    btnCloseBackgroundSettings.addEventListener('click', () => {
        if (backgroundModal) backgroundModal.style.display = 'none';
    });
}

window.addEventListener('click', (e) => {
    if (e.target === backgroundModal) {
        backgroundModal.style.display = 'none';
    }
});

// Initialize
initBackgrounds();
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

// --- Generic Modal Logic ---
const genericAlertModal = document.getElementById('genericAlertModal');
const genericAlertMessage = document.getElementById('genericAlertMessage');
const btnGenericAlertClose = document.getElementById('btnGenericAlertClose');

const genericConfirmModal = document.getElementById('genericConfirmModal');
const genericConfirmMessage = document.getElementById('genericConfirmMessage');
const btnGenericConfirmCancel = document.getElementById('btnGenericConfirmCancel');
const btnGenericConfirmOk = document.getElementById('btnGenericConfirmOk');

let onConfirmCallback = null;

function customAlert(msg) {
    if (!genericAlertModal) {
        alert(msg);
        return;
    }
    genericAlertMessage.textContent = msg;
    genericAlertModal.style.display = 'flex';
}

if (btnGenericAlertClose) {
    btnGenericAlertClose.addEventListener('click', () => {
        genericAlertModal.style.display = 'none';
    });
}

function customConfirm(msg, callback) {
    if (!genericConfirmModal) {
        if (confirm(msg)) callback();
        return;
    }
    genericConfirmMessage.textContent = msg;
    onConfirmCallback = callback;
    genericConfirmModal.style.display = 'flex';
}

if (btnGenericConfirmCancel) {
    btnGenericConfirmCancel.addEventListener('click', () => {
        genericConfirmModal.style.display = 'none';
        onConfirmCallback = null;
    });
}

if (btnGenericConfirmOk) {
    btnGenericConfirmOk.addEventListener('click', () => {
        if (onConfirmCallback) onConfirmCallback();
        genericConfirmModal.style.display = 'none';
        onConfirmCallback = null;
    });
}

// Close generic modals on outside click
window.addEventListener('click', (e) => {
    if (e.target === genericAlertModal) genericAlertModal.style.display = 'none';
    if (e.target === genericConfirmModal) genericConfirmModal.style.display = 'none';
});
