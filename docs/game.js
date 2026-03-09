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

// Keep focus on the input field when clicking anywhere else
// (except when clicking buttons, selects, or modal overlays)
document.addEventListener('click', (e) => {
    const isInteractive = e.target.closest('button, select, .dropdown, .modal-content, input[type="range"], input[type="checkbox"]');
    if (!isInteractive && !problemCompleted && currentScripture.length > 0) {
        answerInput.focus();
    }
});

// 화면이 작아지거나 키보드가 올라올 때 정답 입력할 위치(빈칸)를 화면 중앙으로 스크롤합니다.
function scrollToActiveBlank() {
    setTimeout(() => {
        const walker = document.createTreeWalker(problemArea, NodeFilter.SHOW_ALL, null, false);
        let node;
        let rect = null;

        while ((node = walker.nextNode())) {
            if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('hint-text')) {
                rect = node.getBoundingClientRect();
                break;
            } else if (node.nodeType === Node.TEXT_NODE && node.textContent.includes('_')) {
                const matchIndex = node.textContent.indexOf('_');
                const range = document.createRange();
                range.setStart(node, matchIndex);
                range.setEnd(node, matchIndex + 1);
                rect = range.getBoundingClientRect();
                break;
            }
        }

        if (rect) {
            const mainContainer = document.querySelector('.main-container');
            if (mainContainer && rect.top !== 0) {
                const containerRect = mainContainer.getBoundingClientRect();
                const scrollTop = mainContainer.scrollTop + (rect.top - containerRect.top) - (containerRect.height / 2) + (rect.height / 2);
                mainContainer.scrollTo({ top: scrollTop, behavior: 'smooth' });
            }
        }
    }, 150);
}

answerInput.addEventListener('focus', scrollToActiveBlank);

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

    // Auto-scroll to first blank
    scrollToActiveBlank();
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
    let replaced = false;
    // 1. Try Reference Block Reference
    const refContainer = problemArea.querySelector('.reference-block');
    if (refContainer) {
        if (replaceInContainer(refContainer, answer, correct, true)) replaced = true;
    }

    // 2. Try Verse Content
    if (!replaced) {
        const verseContainer = problemArea.querySelector('.verse-content');
        if (verseContainer) {
            if (replaceInContainer(verseContainer, answer, correct, false)) replaced = true;
        }
    }

    // Automatically scroll to the next blank
    scrollToActiveBlank();
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
