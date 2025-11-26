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

// DOM Elements
const fileInput = document.getElementById('fileInput');
const daySelect = document.getElementById('daySelect');
const levelSelect = document.getElementById('levelSelect');
const problemArea = document.getElementById('problemArea');
const answerInput = document.getElementById('answerInput');
const statusText = document.getElementById('statusText');
const btnReset = document.getElementById('btnReset');
const btnSkip = document.getElementById('btnSkip');
const btnWrong = document.getElementById('btnWrong');
const btnFontUp = document.getElementById('btnFontUp');
const btnFontDown = document.getElementById('btnFontDown');
const modeBtns = document.querySelectorAll('.btn-mode');

// Paste Modal Elements
const btnPaste = document.getElementById('btnPaste');
const pasteModal = document.getElementById('pasteModal');
const closePasteModal = document.querySelector('.close');
const btnSavePaste = document.getElementById('btnSavePaste');

// Easy Input Elements
const pasteTitle = document.getElementById('pasteTitle');
const inputRef = document.getElementById('inputRef');
const inputVerse = document.getElementById('inputVerse');
const btnAddVerse = document.getElementById('btnAddVerse');
const verseList = document.getElementById('verseList');

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

// Default Data (Embedded)
// Default Data (Embedded)
const DEFAULT_DATA = {
    "day1.txt": [
        "1\\(요 5:39)^너희가 성경에서 영생을 얻는줄 생각하고 성경을 상고하거니와 이 성경이 곧 내게 대하여 증거하는 것이로다",
        "1\\(롬 10:17)^그러므로 믿음은 들음에서 나며 들음은 그리스도의 말씀으로 말미암았느니라",
        "1\\(사 34:16)^너희는 여호와의 책을 자세히 읽어보라 이것들이 하나도 빠진 것이 없고 하나도 그 짝이 없는 것이 없으리니 이는 여호와의 입이 이를 명하셨고 그의 신이 이것들을 모으셨음이라",
        "1\\(딤후 3:16-17)^모든 성경은 하나님의 감동으로 된 것으로 교훈과 책망과 바르게 함과 의로 교육하기에 유익하니 이는 하나님의 사람으로 온전케 하며 모든 선한 일을 행하기에 온전케 하려 함이니라",
        "1\\(벧후 1:20-21)^먼저 알 것은 경의 모든 예언은 사사로이 풀 것이 아니니 예언은 언제든지 사람의 뜻으로 낸 것이 아니요 오직 성령의 감동하심을 입은 사람들이 하나님께 받아 말한 것임이니라",
        "1\\(딤전 6:16)^오직 그에게만 죽지 아니함이 있고 가까이 가지 못할 빛에 거하시고 아무 사람도 보지 못하였고 또 볼 수 없는 자시니 그에게 존귀와 영원한 능력을 돌릴찌어다 아멘",
        "1\\(히 3:4)^집마다 지은 이가 있으니 만물을 지으신 이는 하나님이시라",
        "1\\(롬 1:20)^창세로부터 그의 보이지 아니하는 것들 곧 그의 영원하신 능력과 신성이 그 만드신 만물에 분명히 보여 알게 되나니 그러므로 저희가 핑계치 못할찌니라",
        "1\\(욥 38:31)^네가 묘성을 매어 떨기 되게 하겠느냐 삼성의 띠를 풀겠느냐",
        "1\\(욥 26:7)^그는 북편 하늘을 허공에 펴시며 땅을 공간에 다시며",
        "2\\(레 11:6)^토끼도 새김질은 하되 굽이 갈라지지 아니하였으므로 너희에게 부정하고",
        "2\\(욥 39:26)^매가 떠올라서 날개를 펼쳐 남방으로 향하는 것이 어찌 네 지혜로 말미암음이냐",
        "1\\(살전 5:23)^평강의 하나님이 친히 너희로 온전히 거룩하게 하시고 또 너희 온 영과 혼과 몸이 우리 주 예수 그리스도 강림하실 때에 흠없게 보전되기를 원하노라",
        "1\\(롬 1:19)^이는 하나님을 알만한 것이 저희 속에 보임이라 하나님께서 이를 저희에게 보이셨느니라",
        "1\\(롬 2:15)^이런 이들은 그 양심이 증거가 되어 그 생각들이 서로 혹은 송사하며 혹은 변명하여 그 마음에 새긴 율법의 행위를 나타내느니라",
        "1\\(전 3:11)^하나님이 모든 것을 지으시되 때를 따라 아름답게 하셨고 또 사람에게 영원을 사모하는 마음을 주셨느니라 그러나 하나님의 하시는 일의 시종을 사람으로 측량할 수 없게 하셨도다",
        "1\\(욥 19:26)^나의 이 가죽, 이것이 썩은 후에 내가 육체 밖에서 하나님을 보리라",
        "2\\(창 1:27)^하나님이 자기 형상 곧 하나님의 형상대로 사람을 창조하시되 남자와 여자를 창조하시고",
        "3\\(출 33:20)^또 가라사대 네가 내 얼굴을 보지 못하리니 나를 보고 살 자가 없음이니라",
        "3\\(욥 36:27-28)^그가 물을 가늘게 이끌어 올리신즉 그것이 안개 되어 비를 이루고 그것이 공중에서 내려 사람 위에 쏟아지느니라",
        "3\\(욥 36:30-31)^그가 번개 빛으로 자기의 사면에 두르시며 바다 밑도 가리우시며 이런 것들로 만민을 징벌하시며 이런 것들로 식물을 풍비히 주시느니라",
        "4\\(사 45:18)^여호와는 하늘을 창조하신 하나님이시며 땅도 조성하시고 견고케 하시되 헛되이 창조치 아니하시고 사람으로 거하게 지으신 자시니라 그 말씀에 나는 여호와라 나 외에 다른 이가 없느니라",
        "4\\(사 40:26)^너희는 눈을 높이 들어 누가 이 모든 것을 창조하였나 보라 주께서는 수효대로 만상을 이끌어 내시고 각각 그 이름을 부르시나니 그의 권세가 크고 그의 능력이 강하므로 하나도 빠짐이 없느니라",
        "4\\(전 12:7)^흙은 여전히 땅으로 돌아가고 신은 그 주신 하나님께로 돌아가기 전에 기억하라"
    ]
};

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
const DATA_VERSION = "1.2";

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
            // Filter by level (e.g., "1\(...")
            currentScripture = allVerses.filter(line => {
                // Check if line starts with "Level\"
                // Note: In JS string, backslash is escaped.
                // Format: "1\(..."
                return line.startsWith(selectedLevel + "\\(");
            });
        }

        leftVerse = currentScripture.length;
    } else {
        currentScripture = [];
        leftVerse = 0;
    }
    failNum = 0;
    wrongVerses = [];
    updateStatus();
    displayProblem();
}

function updateStatus() {
    statusText.textContent = `남은 구절: ${leftVerse} | 틀린 갯수: ${failNum}`;
}

function displayProblem() {
    if (currentScripture.length === 0) {
        problemArea.innerHTML = '<p class="placeholder">모든 구절을 완료했습니다!</p>';
        answerInput.disabled = true;
        return;
    }
    answerInput.disabled = false;

    problemNum = Math.floor(Math.random() * currentScripture.length);
    const line = currentScripture[problemNum];

    let [text, answers, ref] = createProblem(line, currentMode);

    currentProblem = text;
    currentAnswers = answers;
    currentReference = ref;
    attempts = 0;
    problemCompleted = false;

    renderProblem(currentProblem);
    answerInput.value = "";
    answerInput.focus();
}

function renderProblem(text) {
    // Simple rendering, can be improved to highlight specific parts
    problemArea.textContent = text;
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
        return [refView + " " + problemWords.join(" "), answers, reference];
    }
    else if (mode === 2) { // Verse Mode
        const answers = words.filter(w => WORD_TOKEN_RE.test(w)).map(w => normToken(w));
        const problemWords = words.map(w => WORD_TOKEN_RE.test(w) ? maskOneKeepPunct(w) : w);
        const refView = refMasked(reference, false);
        return [refView + " " + problemWords.join(" "), answers, reference];
    }
    else if (mode === 3) { // Reference Mode
        let [book, chap, versePart] = parseRefParts(reference);
        let [_, verseParts] = splitVerseParts(versePart);
        const refView = refMasked(reference, true);
        const answers = [book, chap, ...verseParts];
        return [refView + " " + words.join(" "), answers, reference];
    }
    else if (mode === 4) { // Whole Mode
        const n = Math.min(wholeLevelNum, words.length);
        const randIndex = Math.floor(Math.random() * (words.length - n + 1));
        const visibleWords = words.slice(randIndex, randIndex + n);

        const problemWords = [];
        let i = 0;
        let firstOccurrence = true;

        while (i < words.length) {
            // Check if current slice matches visibleWords
            let match = true;
            if (i + n > words.length) match = false;
            else {
                for (let j = 0; j < n; j++) {
                    if (words[i + j] !== visibleWords[j]) {
                        match = false;
                        break;
                    }
                }
            }

            if (firstOccurrence && match) {
                problemWords.push(...visibleWords);
                firstOccurrence = false;
                i += n;
            } else {
                problemWords.push(maskOneKeepPunct(words[i]));
                i++;
            }
        }

        const refView = refMasked(reference, true);
        let [book, chap, versePart] = parseRefParts(reference);
        let [_, verseParts] = splitVerseParts(versePart);
        const answers = [book, chap, ...verseParts];

        i = 0;
        let skippedOnce = false;
        while (i < words.length) {
            let match = true;
            if (i + n > words.length) match = false;
            else {
                for (let j = 0; j < n; j++) {
                    if (words[i + j] !== visibleWords[j]) {
                        match = false;
                        break;
                    }
                }
            }

            if (!skippedOnce && match) {
                skippedOnce = true;
                i += n;
                continue;
            }

            let w = words[i];
            if (WORD_TOKEN_RE.test(w)) {
                answers.push(normToken(w));
            }
            i++;
        }

        return [refView + " " + problemWords.join(" "), answers, reference];
    }

    return ["", [], ""];
}

let autoAdvanceTimer = null;

function submitAnswer() {
    const userAnswer = answerInput.value.trim();

    if (problemCompleted) {
        nextProblem();
        return;
    }

    if (currentScripture.length === 0 || currentAnswers.length === 0) return;

    if (normToken(userAnswer) === normToken(currentAnswers[0])) {
        replaceBlankWithAnswer(currentAnswers[0], true);
        currentAnswers.shift();
        answerInput.value = "";
        attempts = 0;
        if (currentAnswers.length === 0) {
            problemCompleted = true;
            // Auto-advance
            autoAdvanceTimer = setTimeout(nextProblem, 500);
        }
    } else {
        attempts++;
        answerInput.value = "";
        if (attempts >= 3) {
            handleWrongAnswer();
        } else {
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
    updateStatus();
    attempts = 0;
    if (currentAnswers.length === 0) {
        problemCompleted = true;
    }
}

function replaceBlankWithAnswer(answer, correct) {
    // Find first underscore sequence
    const match = currentProblem.match(/(_+)/);
    if (match) {
        const placeholder = match[0];
        const replacement = `<span class="${correct ? 'correct' : 'wrong'}">${answer}</span>`;
        // Replace only the first occurrence
        currentProblem = currentProblem.replace(placeholder, replacement);
        problemArea.innerHTML = currentProblem;
    }
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

// --- Event Listeners ---

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        loadFiles(e.target.files);
    }
});

daySelect.addEventListener('change', (e) => {
    selectDay(parseInt(e.target.value));
});

levelSelect.addEventListener('change', () => {
    dayReset(); // Re-filter based on new level
});

answerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        submitAnswer();
    } else if (e.key === ' ') {
        // Prevent space from being typed if it's meant to submit (optional, but mimicking python behavior)
        // But in web, space is useful. Let's stick to Enter for submit, 
        // or maybe allow space to trigger submit if input is not empty?
        // Python version: space triggers submit after 10ms.
        // Let's keep standard web behavior: Enter to submit.
    }
});

modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = parseInt(btn.dataset.mode);
        displayProblem();
    });
});

// Set default active mode
document.querySelector('.btn-mode[data-mode="1"]').classList.add('active');

btnReset.addEventListener('click', dayReset);

btnSkip.addEventListener('click', displayProblem);

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

// Paste Modal Logic
btnPaste.addEventListener('click', () => {
    pasteModal.style.display = "block";
    pasteTitle.value = "";
    inputRef.value = "";
    inputVerse.value = "";
    tempVerses = [];
    renderVerseList();
    pasteTitle.focus();
});

closePasteModal.addEventListener('click', () => {
    pasteModal.style.display = "none";
});

window.addEventListener('click', (e) => {
    if (e.target == pasteModal) {
        pasteModal.style.display = "none";
    }
});

// Add Verse to List
btnAddVerse.addEventListener('click', () => {
    const ref = inputRef.value.trim();
    const text = inputVerse.value.trim();

    if (!ref || !text) {
        alert("장절과 내용을 모두 입력해주세요.");
        return;
    }

    // Format: (Ref)^Text
    const formatted = `(${ref})^${text}`;
    tempVerses.push(formatted);

    inputRef.value = "";
    inputVerse.value = "";
    inputRef.focus();

    renderVerseList();
});

function renderVerseList() {
    verseList.innerHTML = "";
    if (tempVerses.length === 0) {
        verseList.innerHTML = '<p class="list-placeholder">추가된 구절이 없습니다.</p>';
        return;
    }

    tempVerses.forEach((v, i) => {
        const div = document.createElement('div');
        div.className = 'verse-item';

        // Display friendly text
        let display = v;
        if (v.includes(')^')) {
            display = v.replace(')^', ') ');
        }

        div.innerHTML = `
            <span>${display}</span>
            <button class="btn-delete-verse" data-index="${i}">❌</button>
        `;
        verseList.appendChild(div);
    });

    // Add delete listeners
    document.querySelectorAll('.btn-delete-verse').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            tempVerses.splice(idx, 1);
            renderVerseList();
        });
    });
}

btnSavePaste.addEventListener('click', () => {
    let title = pasteTitle.value.trim();

    if (tempVerses.length === 0) {
        alert("최소 한 개 이상의 구절을 추가해주세요.");
        return;
    }

    if (!title) {
        title = `Day ${originalScriptures.length + 1} (직접 입력)`;
    }

    // Store data
    originalScriptures.push([...tempVerses]);
    originalFilenames.push(title);

    // Add to dropdown
    const option = document.createElement('option');
    option.value = originalScriptures.length - 1;
    option.textContent = title;
    daySelect.appendChild(option);

    // Save and Select
    saveDataToStorage();
    daySelect.value = originalScriptures.length - 1;
    selectDay(originalScriptures.length - 1);

    // Close Modal
    pasteModal.style.display = "none";
});

// Add shake animation style dynamically
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes shake {
  0% { transform: translate(1px, 1px) rotate(0deg); }
  10% { transform: translate(-1px, -2px) rotate(-1deg); }
  20% { transform: translate(-3px, 0px) rotate(1deg); }
  30% { transform: translate(3px, 2px) rotate(0deg); }
  40% { transform: translate(1px, -1px) rotate(1deg); }
  50% { transform: translate(-1px, 2px) rotate(-1deg); }
  60% { transform: translate(-3px, 1px) rotate(0deg); }
  70% { transform: translate(3px, 1px) rotate(-1deg); }
  80% { transform: translate(-1px, -1px) rotate(1deg); }
  90% { transform: translate(1px, 2px) rotate(0deg); }
  100% { transform: translate(1px, -2px) rotate(-1deg); }
}
.shake {
  animation: shake 0.5s;
  animation-iteration-count: 1;
}
`;
document.head.appendChild(styleSheet);
