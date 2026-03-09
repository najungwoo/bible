// State
// --- State Variables (상태 변수들) ---
var originalScriptures = []; // 전체 구절 데이타 (배열의 배열)
var originalFilenames = [];
var currentScripture = [];
var currentDayIndex = -1;
var currentMode = 1; // 1: Blank, 2: Verse, 3: Ref, 4: Whole
var blankNum = 5; // 50%
var wholeLevelNum = 1;


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
var maxAttempts = 3; // Number of chances
console.log('hintCount initialized:', hintCount);


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
const modeBtns = document.querySelectorAll('.btn-mode')
const btnChancesSettings = document.getElementById('btnChancesSettings');
const chancesSettingsModal = document.getElementById('chancesSettingsModal');
const closeChancesSettings = document.getElementById('closeChancesSettings');
const chancesCountText = document.getElementById('chancesCountText');

let tempVerses = [];


// 데이터 초기화 (앱 시작 시 호출)
function initData() {
    // 1. Load Data from DEFAULT_DATA (Source of Truth)
    originalScriptures = Object.values(DEFAULT_DATA);
    originalFilenames = Object.keys(DEFAULT_DATA);

    // 2. Legacy Data Cleanup (Remove old cached data)
    localStorage.removeItem('bible_scriptures');
    localStorage.removeItem('bible_filenames');
    localStorage.removeItem('bible_data_version');

    // 3. Populate Day Dropdown
    updateDaySelect();

    // 4. Load maxAttempts
    const savedAttempts = localStorage.getItem('bible_max_attempts');
    if (savedAttempts) {
        maxAttempts = savedAttempts === 'infinite' ? 'infinite' : parseInt(savedAttempts, 10);
    }
    updateChancesText();

    // 5. Select Initial Day (if exists)
    if (originalScriptures.length > 0) {
        daySelect.value = 0;
        selectDay(0);
        updateDayDropdown();
    }
}

initData();

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

            // Filter verses where level <= maxLevel
            currentScripture = allVerses.filter(line => {
                const match = line.match(/^(\d+)\\/);
                if (match) {
                    const verseLevel = parseInt(match[1], 10);
                    return verseLevel <= maxLevel;
                }
                return false;
            });
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

    currentProblem = verseText;
    currentAnswers = answers;
    currentReference = ref;
    attempts = 0;

    // If no answers (e.g. 0% blank mode), mark as completed immediately so Enter key skips
    if (currentAnswers.length === 0) {
        problemCompleted = true;
        answerInput.placeholder = "엔터(Enter)를 눌러 다음으로";
    } else {
        problemCompleted = false;
        answerInput.placeholder = "정답 입력...";
    }

    hintCount = 0;

    renderProblem(refView, verseText);
    answerInput.value = "";
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

    problemArea.style.setProperty('--app-font-size', fontSize + 'px');
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
        const refView = refMasked(reference, true, true);
        const answers = [book, chap];
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

        // Reference is Visible (false for masked) -> NOW MASKED (true), showVerse (true)
        const refView = refMasked(reference, true, true);

        let [book, chap, versePart] = parseRefParts(reference);
        let [_, verseParts] = splitVerseParts(versePart);

        const answers = [book, chap];

        hiddenWords.forEach(w => {
            if (WORD_TOKEN_RE.test(w)) {
                answers.push(normToken(w));
            }
        });


        return [refView, problemWords.join(" "), answers, reference];
    }
    else if (mode === 5) { // Chosung Mode
        // Problem words: All words masked with Chosung
        const problemWords = words.map(w => WORD_TOKEN_RE.test(w) ? maskWithChosung(w) : w);
        const refView = refMasked(reference, true, true);

        let [book, chap, versePart] = parseRefParts(reference);
        let [_, verseParts] = splitVerseParts(versePart);

        const answers = [book, chap];

        words.forEach(w => {
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
        if (maxAttempts !== 'infinite' && attempts >= maxAttempts) {
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
function replaceBlankWithAnswer(answer, correct) {
    // 1. Try Reference Block Reference
    const refContainer = problemArea.querySelector('.reference-block');
    if (refContainer) {
        if (replaceInContainer(refContainer, answer, correct, true)) return;
    }

    // 2. Try Verse Content
    const verseContainer = problemArea.querySelector('.verse-content');
    if (verseContainer) {
        if (replaceInContainer(verseContainer, answer, correct, false)) return;
    }
}

function replaceInContainer(container, answer, correct, isReference) {
    const children = Array.from(container.childNodes);
    let foundBlank = false;

    // Build new content
    const newContent = document.createDocumentFragment();

    for (let i = 0; i < children.length; i++) {
        const node = children[i];

        if (!foundBlank) {
            // Check if this is a text node
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                let match = null;

                if (currentMode === 5 && !isReference) {
                    match = findChosungMatch(text, answer);
                } else {
                    match = text.match(/(_+)/);
                }

                if (match) {
                    const blankIndex = match.index !== undefined ? match.index : text.indexOf(match[0]);
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

                // Skip any target mask immediately after the hint (underscores or chosung)
                if (i + 1 < children.length && children[i + 1].nodeType === Node.TEXT_NODE) {
                    const nextText = children[i + 1].textContent;
                    let afterTarget = nextText;
                    if (currentMode === 5 && !isReference) {
                        const hintLength = node.textContent.length;
                        const remainingMask = getRemainingChosungMask(answer, hintLength);
                        if (nextText.startsWith(remainingMask)) {
                            i++;
                            afterTarget = nextText.substring(remainingMask.length);
                        }
                    } else if (isReference || currentMode === 3) {
                        const hintLength = node.textContent.length;
                        const remainingMask = getRemainingUnderscoresMask(answer, hintLength);
                        if (nextText.startsWith(remainingMask)) {
                            i++;
                            afterTarget = nextText.substring(remainingMask.length);
                        } else if (nextText.match(/^_+/)) {
                            i++;
                            afterTarget = nextText.replace(/^_+/, '');
                        }
                    } else {
                        if (nextText.match(/^_+/)) {
                            i++; // Skip the underscore node (or modified node)
                            afterTarget = nextText.replace(/^_+/, '');
                        }
                    }
                    if (afterTarget) {
                        newContent.appendChild(document.createTextNode(afterTarget));
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

// 힌트 적용 로직 (현재 빈칸에 힌트 텍스트 표시)
function applyHintToDisplay(hintPart, fullAnswer) {
    // 1. Try Reference Block
    const refContainer = problemArea.querySelector('.reference-block');
    if (refContainer) {
        if (applyHintToContainer(refContainer, hintPart, fullAnswer, true)) return;
    }

    // 2. Try Verse Content
    const verseContainer = problemArea.querySelector('.verse-content');
    if (verseContainer) {
        applyHintToContainer(verseContainer, hintPart, fullAnswer, false);
    }
}

function applyHintToContainer(container, hintPart, fullAnswer, isReference) {
    const children = Array.from(container.childNodes);
    let foundBlank = false;
    const newContent = document.createDocumentFragment();

    for (let i = 0; i < children.length; i++) {
        const node = children[i];

        if (!foundBlank) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                let match = null;

                if (currentMode === 5 && !isReference) {
                    match = findChosungMatch(text, fullAnswer);
                } else {
                    match = text.match(/(_+)/);
                }

                if (match) {
                    const blankIndex = match.index !== undefined ? match.index : text.indexOf(match[0]);
                    const beforeBlank = text.substring(0, blankIndex);

                    // The original mask (e.g. ____ or ㅌㅊㅇ)
                    const originalMask = match[0];
                    let remainingMask = "";
                    if (currentMode === 5 && !isReference) {
                        remainingMask = getRemainingChosungMask(fullAnswer, hintPart.length);
                    } else if (isReference || currentMode === 3) {
                        // Reference mode or Reference block: use underscore mask based on hint length
                        remainingMask = getRemainingUnderscoresMask(fullAnswer, hintPart.length);
                    } else {
                        remainingMask = originalMask.substring(Math.min(hintPart.length, originalMask.length));
                    }

                    const afterBlankText = text.substring(blankIndex + originalMask.length);

                    if (beforeBlank) {
                        newContent.appendChild(document.createTextNode(beforeBlank));
                    }

                    const hintSpan = document.createElement('span');
                    hintSpan.className = 'hint-text';
                    hintSpan.textContent = hintPart;
                    newContent.appendChild(hintSpan);

                    if (remainingMask) {
                        newContent.appendChild(document.createTextNode(remainingMask));
                    }

                    if (afterBlankText) {
                        newContent.appendChild(document.createTextNode(afterBlankText));
                    }

                    foundBlank = true;
                    continue;
                }
            } else if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('hint-text')) {
                // Update existing hint
                const oldHintLength = node.textContent.length;
                node.textContent = hintPart;
                newContent.appendChild(node.cloneNode(true));
                foundBlank = true;

                // Update the remaining mask length
                if (i + 1 < children.length && children[i + 1].nodeType === Node.TEXT_NODE) {
                    const nextText = children[i + 1].textContent;
                    let afterTarget = nextText;
                    let remainingMask = "";
                    if (currentMode === 5 && !isReference) {
                        remainingMask = getRemainingChosungMask(fullAnswer, hintPart.length);
                        const oldRemainingMask = getRemainingChosungMask(fullAnswer, oldHintLength);

                        if (nextText.startsWith(oldRemainingMask)) {
                            i++;
                            afterTarget = nextText.substring(oldRemainingMask.length);
                        } else if (nextText === oldRemainingMask) {
                            i++;
                            afterTarget = "";
                        }

                        if (remainingMask) {
                            newContent.appendChild(document.createTextNode(remainingMask));
                        }
                        if (afterTarget) {
                            newContent.appendChild(document.createTextNode(afterTarget));
                        }
                    } else if (isReference || currentMode === 3) {
                        remainingMask = getRemainingUnderscoresMask(fullAnswer, hintPart.length);
                        const oldRemainingMask = getRemainingUnderscoresMask(fullAnswer, oldHintLength);

                        if (nextText.startsWith(oldRemainingMask)) {
                            i++;
                            afterTarget = nextText.substring(oldRemainingMask.length);
                        } else if (nextText === oldRemainingMask) {
                            i++;
                            afterTarget = "";
                        } else if (nextText.match(/^_+/)) {
                            // fallback for underscores
                            i++;
                            afterTarget = nextText.replace(/^_+/, '');
                        }

                        if (remainingMask) {
                            newContent.appendChild(document.createTextNode(remainingMask));
                        }
                        if (afterTarget) {
                            newContent.appendChild(document.createTextNode(afterTarget));
                        }
                    } else {
                        if (nextText.match(/^_+/)) {
                            i++;
                            const currentUnderscores = nextText.match(/^_+/)[0];
                            const afterUnderscores = nextText.replace(/^_+/, '');
                            const newUnderscoresLength = Math.max(0, currentUnderscores.length - (hintPart.length - oldHintLength));

                            if (newUnderscoresLength > 0) {
                                newContent.appendChild(document.createTextNode('_'.repeat(newUnderscoresLength)));
                            }
                            if (afterUnderscores) {
                                newContent.appendChild(document.createTextNode(afterUnderscores));
                            }
                        } else {
                            if (afterTarget) {
                                newContent.appendChild(document.createTextNode(afterTarget));
                            }
                        }
                    }
                }
                continue;
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

function ensureFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {
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


