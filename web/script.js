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
const DEFAULT_DATA = {
    "day1.txt": [
        "(요 4:24)^하나님은 영이시니 예배하는 자가 신령과 진정으로 예배할지니라",
        "(골 1:15-16)^그는 보이지 아니하시는 하나님의 형상이요 모든 창조물보다 먼저 나신 자니 만물이 그에게 창조되되 하늘과 땅에서 보이는 것들과 보이지 않는 것들과 혹은 보좌들이나 주관들이나 정사들이나 권세들이나 만물이 다 그로 말미암고 그를 위하여 창조되었고",
        "(히 11:3)^믿음으로 모든 세계가 하나님의 말씀으로 지어진 줄을 우리가 아나니 보이는 것은 나타난 것으로 말미암아 된 것이 아니니라",
        "(고후 4:18)^우리의 돌아보는 것은 보이는 것이 아니요 보이지 않는 것이니 보이는 것은 잠깐이요 보이지 않는 것은 영원함이니라",
        "(호 6:3)^그러므로 우리가 여호와를 알자 힘써 여호와를 알자 그의 나오심은 새벽 빛 같이 일정하니 비와 같이, 땅을 적시는 늦은 비와 같이 우리에게 임하시리라 하리라",
        "(요 1:1)^태초에 말씀이 계시니라 이 말씀이 하나님과 함께 계셨으니 이 말씀은 곧 하나님이시니라",
        "(롬 1:19-20)^이는 하나님을 알 만한 것이 저희 속에 보임이라 하나님께서 이를 저희에게 보이셨느니라 창세로부터 그의 보이지 아니하는 것들 곧 그의 영원하신 능력과 신성이 그 만드신 만물에 분명히 보여 알게 되나니 그러므로 저희가 핑계치 못할지니라",
        "(민 23:19)^하나님은 인생이 아니시니 식언치 아니하시고 인자가 아니시니 후회가 없으시도다 어찌 그 말씀하신 바를 행치 아니하시며 하신 말씀을 실행치 아니하시랴",
        "(사 45:18)^여호와는 하늘을 창조하신 하나님이시며 땅도 조성하시고 견고케 하시되 헛되이 창조치 아니하시고 사람으로 거하게 지으신 자시니라 그 말씀에 나는 여호와라 나 외에 다른 이가 없느니라",
        "(느 9:6)^오직 주는 여호와시라 하늘과 하늘들의 하늘과 일월 성신과 땅과 땅 위의 만물과 바다와 그 가운데 모든 것을 지으시고 다 보존하시오니 모든 천군이 주께 경배하나이다",
        "(욥 11:7-9)^네가 하나님의 오묘를 어찌 능히 측량하며 전능자를 어찌 능히 온전히 알겠느냐 하늘보다 높으시니 네가 어찌 하겠으며 음부보다 깊으시니 네가 어찌 알겠느냐 그 도량은 땅보다 크고 바다보다 넓으니라",
        "(사 40:26)^너희는 눈을 높이 들어 누가 이 모든 것을 창조하였나 보라 주께서는 수효대로 만상을 이끌어 내시고 각각 그 이름을 부르시나니 그의 권세가 크고 그의 능력이 강하므로 하나도 빠짐이 없느니라",
        "(행 17:24-27)^우주와 그 가운데 있는 만유를 지으신 신께서는 천지의 주재시니 손으로 지은 전에 계시지 아니하시고 또 무엇이 부족한 것처럼 사람의 손으로 섬김을 받으시는 것이 아니니 이는 만민에게 생명과 호흡과 만물을 친히 주시는 자이심이라 인류의 모든 족속을 한 혈통으로 만드사 온 땅에 거하게 하시고 저희의 년대를 정하시며 거주의 경계를 한하셨으니 이는 사람으로 하나님을 혹 더듬어 찾아 발견케 하심이로되 그는 우리 각 사람에게서 멀리 떠나 계시지 아니하도다",
        "(딤전 6:15-16)^기약이 이르면 하나님이 그의 나타나심을 보이시리니 하나님은 복되시고 홀로 한 분이신 능하신 자이며 만왕의 왕이시며 만주의 주시요 오직 그에게만 죽지 아니함이 있고 가까이 가지 못할 빛에 거하시고 아무 사람도 보지 못하였고 또 볼 수 없는 자시니 그에게 존귀와 영원한 능력을 돌릴지어다 아멘",
        "(요일 1:5)^우리가 저에게서 듣고 너희에게 전하는 소식이 이것이니 곧 하나님은 빛이시라 그에게는 어두움이 조금도 없으시니라",
        "(약 1:5)^너희 중에 누구든지 지혜가 부족하거든 모든 사람에게 후히 주시고 꾸짖지 아니하시는 하나님께 구하라 그리하면 주시리라",
        "(요1:1)^태초에 말씀이 계시니라 이 말씀이 하나님과 함께 계셨으니 이 말씀은 곧 하나님이시니라",
        "(요 5:39)^너희가 성경에서 영생을 얻는 줄 생각하고 성경을 상고하거니와 이 성경이 곧 내게 대하여 증거하는 것이로다",
        "(요 17:3)^영생은 곧 유일하신 참 하나님과 그의 보내신 자 예수 그리스도를 아는 것이니이다",
        "(신 18:21-22)^네가 혹시 심중에 이를기를 그 말이 여호와의 이르신 말씀인지 우리가 어떻게 알리요 하리라 만일 선지자가 있어서 여호와의 이름으로 말한 일에 증험도 없고 성취함도 없으면 이는 여호와의 말씀하신 것이 아니요 그 선지자가 방자히 한 말이니 너는 그를 두려워 말지니라",
        "(롬 10:17)^그러므로 믿음은 들음에서 나며 들음은 그리스도의 말씀으로 말미암았느니라",
        "(벧후 1:20-21)^먼저 알 것은 경의 모든 예언은 사사로이 풀 것이 아니니 예언은 언제든지 사람의 뜻으로 낸 것이 아니요 오직 성령의 감동하심을 입은 사람들이 하나님께 받아 말한 것임이니라",
        "(사 34:16)^너희는 여호와의 책을 자세히 읽어보라 이것들이 하나도 빠진 것이 없고 하나도 그 짝이 없는 것이 없으리니 이는 여호와의 입이 이를 명하셨고 그의 신이 이것들을 모으셨음이라",
        "(딤후 3:15-17)^또 네가 어려서부터 성경을 알았나니 성경은 능히 너로 하여금 그리스도 예수 안에 있는 믿음으로 말미암아 구원에 이르는 지혜가 있게 하느니라 모든 성경은 하나님의 감동으로 된 것으로 교훈과 책망과 바르게 함과 의로 교육하기에 유익하니 이는 하나님의 사람으로 온전케 하며 모든 선한 일을 행하기에 온전케 하려 함이니라",
        "(히 4:12-13)^하나님의 말씀은 살았고 운동력이 있어 좌우에 날선 어떤 검보다도 예리하여 혼과 영과 및 관절과 골수를 찔러 쪼개기까지 하며 또 마음의 생각과 뜻을 감찰하나니 지으신 것이 하나라도 그 앞에 나타나지 않음이 없고 오직 만물이 우리를 상관하시는 자의 눈앞에 벌거벗은 것같이 드러나느니라",
        "(암 3:7)^주 여호와께서는 자기의 비밀을 그 종 선지자들에게 보이지 아니하시고는 결코 행하심이 없으시리라",
        "(계 22:18-19)^내가 이 책의 예언의 말씀을 듣는 각인에게 증거하노니 만일 누구든지 이것들 외에 더하면 하나님이 이 책에 기록된 재앙들을 그에게 더하실 터이요 만일 누구든지 이 책의 예언의 말씀에서 제하여 버리면 하나님이 이 책에 기록된 생명 나무와 및 거룩한 성에 참예함을 제하여 버리시리라",
        "(벧후 3:16)^또 그 모든 편지에도 이런 일에 관하여 말하였으되 그 중에 알기 어려운 것이 더러 있으니 무식한 자들과 굳세지 못한 자들이 다른 성경과 같이 그것도 억지로 풀다가 스스로 멸망에 이르느니라",
        "(벧전 1:23)^너희가 거듭난 것이 썩어질 씨로 된 것이 아니요 썩지 아니할 씨로 된 것이니 하나님의 살아 있고 항상 있는 말씀으로 되었느니라",
        "(마가4:4)^예수께서 대답하여 가라사대 기록되었으되 사람이 떡으로만 살것이 아니요 하나님의 입으로 나오는 모든 말씀으로 살 것이라 하였느니라 하시니"
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
}

function loadDataFromStorage() {
    try {
        const storedScriptures = localStorage.getItem('bible_scriptures');
        const storedFilenames = localStorage.getItem('bible_filenames');

        if (storedScriptures && storedFilenames) {
            originalScriptures = JSON.parse(storedScriptures);
            originalFilenames = JSON.parse(storedFilenames);
        } else {
            // Load Default Data
            originalScriptures = Object.values(DEFAULT_DATA);
            originalFilenames = Object.keys(DEFAULT_DATA);
            saveDataToStorage(); // Save default data to storage
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
        currentScripture = [...originalScriptures[currentDayIndex]];
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
    let [reference, verse] = line.split('^');
    if (!verse) { // Handle cases without ^ separator if any
        verse = line;
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

function submitAnswer() {
    const userAnswer = answerInput.value.trim();
    if (currentScripture.length === 0 || currentAnswers.length === 0) return;

    if (problemCompleted) {
        nextProblem();
        return;
    }

    if (normToken(userAnswer) === normToken(currentAnswers[0])) {
        replaceBlankWithAnswer(currentAnswers[0], true);
        currentAnswers.shift();
        answerInput.value = "";
        attempts = 0;
        if (currentAnswers.length === 0) {
            problemCompleted = true;
            // Auto-advance
            setTimeout(nextProblem, 500);
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
