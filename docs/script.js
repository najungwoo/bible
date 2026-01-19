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
console.log('hintCount initialized:', hintCount);

// DOM Elements
const fileInput = document.getElementById('fileInput');
const daySelect = document.getElementById('daySelect');
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
const modeBtns = document.querySelectorAll('.btn-mode');

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
    ],
    "day2.txt": [
        "1\\(사 41:21-24)^나 여호와가 말하노니 너희 우상들은 소송을 일으키라 야곱의 왕이 말하노니 너희는 확실한 증거를 보이라 장차 당할 일을 우리에게 진술하라 또 이전 일의 어떠한 것도 고하라 우리가 연구하여 그 결국을 알리라 혹 장래사를 보이며 후래사를 진술하라 너희의 신 됨을 우리가 알리라 또 복을 내리든지 화를 내리라 우리가 함께 보고 놀라리라 과연 너희는 아무 것도 아니며 너희 일은 허망하며 너희를 택한 자는 가증하니라",
        "1\\(욥 11:11)^하나님은 허망한 사람을 아시나니 악한 일은 상관치 않으시는듯하나 다 보시느니라",
        "1\\(애 3:33)^주께서 인생으로 고생하며 근심하게 하심이 본심이 아니시로다",
        "2\\(시 103:19)^여호와께서 그 보좌를 하늘에 세우시고 그 정권으로 만유를 통치하시도다",
        "2\\(시 89:14)^의와 공의가 주의 보좌의 기초라 인자함과 진실함이 주를 앞서 행하나이다",
        "1\\(창 2:7)^여호와 하나님이 흙으로 사람을 지으시고 생기를 그 코에 불어 넣으시니 사람이 생령이 된지라",
        "1\\(창 2:21-22)^여호와 하나님이 아담을 깊이 잠들게 하시니 잠들매 그가 그 갈빗대 하나를 취하고 살로 대신 채우시고 여호와 하나님이 아담에게서 취하신 그 갈빗대로 여자를 만드시고 그를 아담에게로 이끌어 오시니",
        "1\\(창 2:10)^강이 에덴에서 발원하여 동산을 적시고 거기서부터 갈라져 네 근원이 되었으니",
        "1\\(겔 31:18)^너의 영화와 광대함이 에덴 모든 나무 중에 어떤 것과 같은고 그러나 네가 에덴 나무와 함께 지하에 내려갈 것이요 거기서 할례 받지 못하고 칼에 살륙 당한 자 중에 누우리라 이들은 바로와 그 모든 군대니라 나 주 여호와의 말이니라 하라",
        "1\\(창 6:13)^하나님이 노아에게 이르시되 모든 혈육 있는 자의 강포가 땅에 가득하므로 그 끝날이 내 앞에 이르렀으니 내가 그들을 땅과 함께 멸하리라",
        "1\\(창 7:11-12)^노아 육백세 되던 해 이월 곧 그 달 십칠일이라 그 날에 큰 깊음의 샘들이 터지며 하늘의 창들이 열려 사십 주야를 비가 땅에 쏟아졌더라",
        "1\\(창 8:4)^칠월 곧 그 달 십칠일에 방주가 아라랏산에 머물렀으며",
        "1\\(시 33:7)^저가 바닷물을 모아 무더기 같이 쌓으시며 깊은 물을 곳간에 두시도다",
        "1\\(벧후 3:6-7)^이로 말미암아 그때 세상은 물의 넘침으로 멸망하였으되 이제 하늘과 땅은 그 동일한 말씀으로 불사르기 위하여 간수하신바 되어 경건치 아니한 사람들의 심판과 멸망의 날까지 보존하여 두신 것이니라",
        "2\\(창 6:14-16)^너는 잣나무로 너를 위하여 방주를 짓되 그 안에 간들을 막고 역청으로 그 안팎에 칠하라 그 방주의 제도는 이러하니 장이 삼백 규빗, 광이 오십 규빗, 고가 삼십 규빗이며 거기 창을 내되 위에서부터 한 규빗에 내고 그 문은 옆으로 내고 상 중 하 삼층으로 할찌니라",
        "1\\(창 11:1,9)^온 땅의 구음이 하나이요 언어가 하나이었더라 / 그러므로 그 이름을 바벨이라 하니 이는 여호와께서 거기서 온 땅의 언어를 혼잡케 하셨음이라 여호와께서 거기서 그들을 온 지면에 흩으셨더라",
        "1\\(창 19:24-25)^여호와께서 하늘 곧 여호와에게로서 유황과 불을 비 같이 소돔과 고모라에 내리사 그 성들과 온 들과 성에 거하는 모든 백성과 땅에 난 것을 다 엎어 멸하셨더라",
        "1\\(벧후 2:5-6)^옛 세상을 용서치 아니하시고 오직 의를 전파하는 노아와 그 일곱 식구를 보존하시고 경건치 아니한 자들의 세상에 홍수를 내리셨으며 소돔과 고모라 성을 멸망하기로 정하여 재가 되게 하사 후세에 경건치 아니할 자들에게 본을 삼으셨으며",
        "3\\(시 94:8-9)^백성중 우준한 자들아 너희는 생각하라 무지한 자들아 너희가 언제나 지혜로울꼬 귀를 지으신 자가 듣지 아니하시랴 눈을 만드신 자가 보지 아니하시랴",
        "3\\(사 38:17)^보옵소서 내게 큰 고통을 더하신 것은 내게 평안을 주려 하심이라 주께서 나의 영혼을 사랑하사 멸망의 구덩이에서 건지셨고 나의 모든 죄는 주의 등 뒤에 던지셨나이다",
        "3\\(창 2:8)^여호와 하나님이 동방의 에덴에 동산을 창설하시고 그 지으신 사람을 거기 두시고",
        "4\\(전 8:11)^악한 일에 징벌이 속히 실행되지 않으므로 인생들이 악을 행하기에 마음이 담대하도다",
        "4\\(행 17:26)^인류의 모든 족속을 한 혈통으로 만드사 온 땅에 거하게 하시고 저희의 년대를 정하시며 거주의 경계를 한하셨으니",
        "4\\(시 104:6-8)^옷으로 덮음 같이 땅을 바다로 덮으시매 물이 산들 위에 섰더니 주의 견책을 인하여 도망하며 주의 우뢰 소리를 인하여 빨리 가서 주의 정하신 처소에 이르렀고 산은 오르고 골짜기는 내려 갔나이다"
    ],
    "day3.txt": [
        "1\\(창 12:1-3)^여호와께서 아브람에게 이르시되 너는 너의 본토 친척 아비 집을 떠나 내가 네게 지시할 땅으로 가라 내가 너로 큰 민족을 이루고 네게 복을 주어 네 이름을 창대케 하리니 너는 복의 근원이 될찌라 너를 축복하는 자에게는 내가 복을 내리고 너를 저주하는 자에게는 내가 저주하리니 땅의 모든 족속이 너를 인하여 복을 얻을 것이니라 하신지라",
        "1\\(사 43:10)^나 여호와가 말하노라 너희는 나의 증인, 나의 종으로 택함을 입었나니 이는 너희로 나를 알고 믿으며 내가 그인줄 깨닫게 하려 함이라 나의 전에 지음을 받은 신이 없었느니라 나의 후에도 없으리라",
        "2\\(신 7:7)^여호와께서 너희를 기뻐하시고 너희를 택하심은 너희가 다른 민족보다 수효가 많은 연고가 아니라 너희는 모든 민족 중에 가장 적으니라",
        "1\\(출 14:28)^물이 다시 흘러 병거들과 기병들을 덮되 그들의 뒤를 쫓아 바다에 들어간 바로의 군대를 다 덮고 하나도 남기지 아니하였더라",
        "1\\(신 4:34-35)^어떤 신이 와서 시험과 이적과 기사와 전쟁과 강한 손과 편 팔과 크게 두려운 일로 한 민족을 다른 민족에게서 인도하여 낸 일이 있느냐 이는 다 너희 하나님 여호와께서 애굽에서 너희를 위하여 너희의 목전에서 행하신 일이라 이것을 네게 나타내심은 여호와는 하나님이시요 그 외에는 다른 신이 없음을 네게 알게 하려 하심이니라",
        "1\\(신 11:26-28)^내가 오늘날 복과 저주를 너희 앞에 두나니 너희가 만일 내가 오늘날 너희에게 명하는 너희 하나님 여호와의 명령을 들으면 복이 될 것이요 너희가 만일 내가 오늘날 너희에게 명하는 도에서 돌이켜 떠나 너희 하나님 여호와의 명령을 듣지 아니하고 본래 알지 못하던 다른 신들을 좇으면 저주를 받으리라",
        "1\\(신 28:46)^이 모든 저주가 너와 네 자손에게 영원히 있어서 표적과 감계가 되리라",
        "1\\(신 8:18)^네 하나님 여호와를 기억하라 그가 네게 재물 얻을 능을 주셨음이라 이같이 하심은 네 열조에게 맹세하신 언약을 오늘과 같이 이루려 하심이니라",
        "1\\(마 27:25-26)^백성이 다 대답하여 가로되 그 피를 우리와 우리 자손에게 돌릴찌어다 하거늘 이에 바라바는 저희에게 놓아주고 예수는 채찍질하고 십자가에 못 박히게 넘겨주니라",
        "1\\(레 26:32-33)^그 땅을 황무케 하리니 거기 거하는 너희 대적들이 그것을 인하여 놀랄 것이며 내가 너희를 열방 중에 흩을 것이요 내가 칼을 빼어 너희를 따르게 하리니 너희의 땅이 황무하며 너희의 성읍이 황폐하리라",
        "2\\(눅 23:31)^푸른 나무에도 이같이 하거든 마른 나무에는 어떻게 되리요 하시니라",
        "1\\(사 43:5-6)^두려워 말라 내가 너와 함께 하여 네 자손을 동방에서부터 오게하며 서방에서부터 너를 모을 것이며 내가 북방에게 이르기를 놓으라 남방에게 이르기를 구류하지 말라 내 아들들을 원방에서 이끌며 내 딸들을 땅 끝에서 오게 하라",
        "2\\(사 60:8)^저 구름 같이, 비둘기가 그 보금자리로 날아 오는 것 같이 날아 오는 자들이 누구뇨",
        "1\\(겔 36:8)^그러나 너희 이스라엘 산들아 너희는 가지를 내고 내 백성 이스라엘을 위하여 과실을 맺으리니 그들의 올 때가 가까이 이르렀음이니라",
        "1\\(겔 36:34-36)^전에는 지나가는 자의 눈에 황무하게 보이던 그 황무한 땅이 장차 기경이 될찌라 사람이 이르기를 이 땅이 황무하더니 이제는 에덴 동산 같이 되었고 황량하고 적막하고 무너진 성읍들에 성벽과 거민이 있다 하리니 너희 사면에 남은 이방 사람이 나 여호와가 무너진 곳을 건축하며 황무한 자리에 심은줄 알리라 나 여호와가 말하였으니 이루리라",
        "1\\(사 60:22)^그 작은 자가 천을 이루겠고 그 약한 자가 강국을 이룰 것이라 때가 되면 나 여호와가 속히 이루리라",
        "1\\(겔 38:12)^물건을 겁탈하며 노략하리라 하고 네 손을 들어서 황무하였다가 지금 사람이 거처하는 땅과 열국 중에서 모여서 짐승과 재물을 얻고 세상 중앙에 거하는 백성을 치고자 할 때에",
        "1\\(마 24:32-33)^무화과나무의 비유를 배우라 그 가지가 연하여지고 잎사귀를 내면 여름이 가까운 줄을 아나니 이와 같이 너희도 이 모든 일을 보거든 인자가 가까이 곧 문앞에 이른줄 알라",
        "3\\(신 28:53)^네가 대적에게 에워싸이고 맹렬히 쳐서 곤란케 함을 당하므로 네 하나님 여호와께서 네게 주신 자녀 곧 네 몸의 소생의 고기를 먹을 것이라",
        "3\\(겔 36:22-23)^그러므로 너는 이스라엘 족속에게 이르기를 주 여호와의 말씀에 이스라엘 족속아 내가 이렇게 행함은 너희를 위함이 아니요 너희가 들어간 그 열국에서 더럽힌 나의 거룩한 이름을 위함이라 열국 가운데서 더럽힘을 받은 이름 곧 너희가 그들 중에서 더럽힌 나의 큰 이름을 내가 거룩하게 할찌라 내가 그들의 목전에서 너희로 인하여 나의 거룩함을 나타내리니 열국 사람이 나를 여호와인줄 알리라 나 주 여호와의 말이니라",
        "3\\(겔 37:10-11)^이에 내가 그 명대로 대언하였더니 생기가 그들에게 들어가매 그들이 곧 살아 일어나서 서는데 극히 큰 군대더라 또 내게 이르시되 인자야 이 뼈들은 이스라엘 온 족속이라 그들이 이르기를 우리의 뼈들이 말랐고 우리의 소망이 없어졌으니 우리는 다 멸절되었다 하느니라",
        "4\\(신 18:18-19)^내가 그들의 형제 중에 너와 같은 선지자 하나를 그들을 위하여 일으키고 내 말을 그 입에 두리니 내가 그에게 명하는 것을 그가 무리에게 다 고하리라 무릇 그가 내 이름으로 고하는 내 말을 듣지 아니하는 자는 내게 벌을 받을 것이요",
        "4\\(겔 38:2,5-6)^인자야 너는 마곡 땅에 있는 곡 곧 로스와 메섹과 두발 왕에게로 얼굴을 향하고 그를 쳐서 예언하여 / 그들과 함께 한바 방패와 투구를 갖춘 바사와 구스와 붓과 고멜과 그 모든 떼와 극한 북방의 도갈마 족속과 그 모든 떼 곧 많은 백성의 무리를 너와 함께 끌어 내리라",
        "4\\(겔 39:2-4)^너를 돌이켜서 이끌고 먼 북방에서부터 나와서 이스라엘 산 위에 이르러 네 활을 쳐서 네 왼손에서 떨어뜨리고 네 살을 네 오른손에서 떨어뜨리리니 너와 네 모든 떼와 너와 함께한 백성이 다 이스라엘 산 위에 엎드러지리라 내가 너를 각종 움키는 새와 들짐승에게 붙여 먹게 하리니"
    ],
    "day4.txt": [
        "2\\(계 13:5)^또 짐승이 큰 말과 참람된 말 하는 입을 받고 또 마흔 두달 일할 권세를 받으니라",
        "2\\(마 24:36)^그러나 그 날과 그 때는 아무도 모르나니 하늘의 천사들도, 아들도 모르고 오직 아버지만 아시느니라",
        "1\\(계 13:16-18)^저가 모든 자 곧 작은 자나 큰 자나 부자나 빈궁한 자나 자유한 자나 종들로 그 오른손에나 이마에 표를 받게 하고 누구든지 이 표를 가진 자 외에는 매매를 못하게 하니 이 표는 곧 짐승의 이름이나 그 이름의 수라 지혜가 여기 있으니 총명 있는 자는 그 짐승의 수를 세어 보라 그 수는 사람의 수니 육백 육십 륙이니라",
        "1\\(눅 17:34-35)^내가 너희에게 이르노니 그 밤에 두 남자가 한 자리에 누워 있으매 하나는 데려감을 당하고 하나는 버려둠을 당할 것이요 두 여자가 함께 매를 갈고 있으매 하나는 데려감을 당하고 하나는 버려둠을 당할 것이니라",
        "1\\(살전 4:16-17)^주께서 호령과 천사장의 소리와 하나님의 나팔로 친히 하늘로 좇아 강림하시리니 그리스도 안에서 죽은 자들이 먼저 일어나고 그 후에 우리 살아 남은 자도 저희와 함께 구름 속으로 끌어 올려 공중에서 주를 영접하게 하시리니 그리하여 우리가 항상 주와 함께 있으리라",
        "1\\(눅 21:25-26)^일월 성신에는 징조가 있겠고 땅에서는 민족들이 바다와 파도의 우는 소리를 인하여 혼란한 중에 곤고하리라 사람들이 세상에 임할 일을 생각하고 무서워하므로 기절하리니 이는 하늘의 권능들이 흔들리겠음이라",
        "1\\(마 24:3)^예수께서 감람산 위에 앉으셨을 때에 제자들이 종용히 와서 가로되 우리에게 이르소서 어느 때에 이런 일이 있겠사오며 또 주의 임하심과 세상 끝에는 무슨 징조가 있사오리이까",
        "1\\(겔 39:28)^전에는 내가 그들로 사로잡혀 열국에 이르게 하였거니와 후에는 내가 그들을 모아 고토로 돌아오게 하고 그 한 사람도 이방에 남기지 아니하리니 그들이 나를 여호와 자기들의 하나님인줄 알리라",
        "1\\(마 24:7-8)^민족이 민족을, 나라가 나라를 대적하여 일어나겠고 처처에 기근과 지진이 있으리니 이 모든 것이 재난의 시작이니라",
        "1\\(슥 14:12)^예루살렘을 친 모든 백성에게 여호와께서 내리실 재앙이 이러하니 곧 섰을 때에 그 살이 썩으며 그 눈이 구멍 속에서 썩으며 그 혀가 입속에서 썩을 것이요",
        "1\\(계 9:15-16)^네 천사가 놓였으니 그들은 그 년 월 일 시에 이르러 사람 삼분의 일을 죽이기로 예비한 자들이더라 마병대의 수는 이만만이니 내가 그들의 수를 들었노라",
        "1\\(계 14:11)^그 고난의 연기가 세세토록 올라가리로다 짐승과 그의 우상에게 경배하고 그 이름의 표를 받는 자는 누구든지 밤낮 쉼을 얻지 못하리라 하더라",
        "1\\(마 24:12)^불법이 성하므로 많은 사람의 사랑이 식어지리라",
        "1\\(마 24:44)^이러므로 너희도 예비하고 있으라 생각지 않은 때에 인자가 오리라",
        "1\\(마 24:14)^이 천국 복음이 모든 민족에게 증거되기 위하여 온 세상에 전파되리니 그제야 끝이 오리라",
        "2\\(마 24:4-5)^예수께서 대답하여 가라사대 너희가 사람의 미혹을 받지 않도록 주의하라 많은 사람이 내 이름으로 와서 이르되 나는 그리스도라 하여 많은 사람을 미혹케 하리라",
        "1\\(계 16:12,16)^또 여섯째가 그 대접을 큰 강 유브라데에 쏟으매 강물이 말라서 동방에서 오는 왕들의 길이 예비되더라 / 세 영이 히브리 음으로 아마겟돈이라 하는 곳으로 왕들을 모으더라",
        "1\\(계 9:18)^이 세 재앙 곧 저희 입에서 나오는 불과 연기와 유황을 인하여 사람 삼분의 일이 죽임을 당하니라",
        "3\\(눅 21:11)^처처에 큰 지진과 기근과 온역이 있겠고 또 무서운 일과 하늘로서 큰 징조들이 있으리라",
        "3\\(슥 14:4)^그 날에 그의 발이 예루살렘 앞 곧 동편 감람산에 서실 것이요 감람산은 그 한가운데가 동서로 갈라져 매우 큰 골짜기가 되어서 산 절반은 북으로, 절반은 남으로 옮기고",
        "3\\(단 9:27)^그가 장차 많은 사람으로 더불어 한 이레 동안의 언약을 굳게 정하겠고 그가 그 이레의 절반에 제사와 예물을 금지할 것이며 또 잔포하여 미운 물건이 날개를 의지하여 설 것이며 또 이미 정한 종말까지 진노가 황폐케 하는 자에게 쏟아지리라 하였느니라",
        "4\\(사 24:19-20)^땅이 깨어지고 깨어지며 땅이 갈라지고 땅이 흔들리고 흔들리며 땅이 취한 자 같이 비틀비틀하며 침망 같이 흔들리며 그 위의 죄악이 중하므로 떨어지고 다시 일지 못하리라",
        "4\\(계 7:4)^내가 인맞은 자의 수를 들으니 이스라엘 자손의 각 지파 중에서 인맞은 자들이 십 사만 사천이니",
        "4\\(욜 2:2-3)^곧 어둡고 캄캄한 날이요 빽빽한 구름이 끼인 날이라 새벽 빛이 산 꼭대기에 덮인 것과 같으니 이는 많고 강한 백성이 이르렀음이라 이같은 것이 자고 이래로 없었고 이후 세세에 없으리로다 불이 그들의 앞을 사르며 불꽃이 그들의 뒤를 태우니 그 전의 땅은 에덴 동산 같았으나 그 후의 땅은 황무한 들 같으니 그 들을 피한 자가 없도다"
    ],
    "day5.txt": [
        "1\\(롬 5:12)^이러므로 한 사람으로 말미암아 죄가 세상에 들어오고 죄로 말미암아 사망이 왔나니 이와 같이 모든 사람이 죄를 지었으므로 사망이 모든 사람에게 이르렀느니라",
        "1\\(시 51:5)^내가 죄악 중에 출생하였음이여 모친이 죄 중에 나를 잉태하였나이다",
        "1\\(시 58:3)^악인은 모태에서부터 멀어졌음이여 나면서부터 곁길로 나아가 거짓을 말하는도다",
        "2\\(롬 5:19)^한 사람의 순종치 아니함으로 많은 사람이 죄인 된것 같이 한 사람의 순종하심으로 많은 사람이 의인이 되리라",
        "1\\(렘 17:9-10)^만물보다 거짓되고 심히 부패한 것은 마음이라 누가 능히 이를 알리요마는 나 여호와는 심장을 살피며 폐부를 시험하고 각각 그 행위와 그 행실대로 보응하나니",
        "1\\(마 15:18-19)^입에서 나오는 것들은 마음에서 나오나니 이것이야말로 사람을 더럽게 하느니라 마음에서 나오는 것은 악한 생각과 살인과 간음과 음란과 도적질과 거짓 증거와 훼방이니",
        "1\\(욥 15:14-16)^사람이 무엇이관대 깨끗하겠느냐 여인에게서 난 자가 무엇이관대 의롭겠느냐 하나님은 그 거룩한 자들을 믿지 아니 하시나니 하늘이라도 그의 보시기에 부정하거든 하물며 악을 짓기를 물 마심 같이 하는 가증하고 부패한 사람이겠느냐",
        "2\\(사 64:6)^대저 우리는 다 부정한 자 같아서 우리의 의는 다 더러운 옷 같으며 우리는 다 쇠패함이 잎사귀 같으므로 우리의 죄악이 바람 같이 우리를 몰아 가나이다",
        "1\\(히 9:27)^한번 죽는 것은 사람에게 정하신 것이요 그 후에는 심판이 있으리니",
        "1\\(전 12:14)^하나님은 모든 행위와 모든 은밀한 일을 선악간에 심판하시리라",
        "1\\(시 50:21)^네가 이 일을 행하여도 내가 잠잠하였더니 네가 나를 너와 같은 줄로 생각하였도다 그러나 내가 너를 책망하여 네 죄를 네 목전에 차례로 베풀리라 하시는도다",
        "2\\(계 21:8)^그러나 두려워하는 자들과 믿지 아니하는 자들과 흉악한 자들과 살인자들과 행음자들과 술객들과 우상 숭배자들과 모든 거짓말 하는 자들은 불과 유황으로 타는 못에 참예하리니 이것이 둘째 사망이라",
        "1\\(막 9:48-49)^거기는 구더기도 죽지 않고 불도 꺼지지 아니하느니라 사람마다 불로서 소금 치듯함을 받으리라",
        "1\\(마 25:46)^저희는 영벌에, 의인들은 영생에 들어가리라 하시니라",
        "1\\(마 5:26)^진실로 네게 이르노니 네가 호리라도 남김이 없이 다 갚기 전에는 결단코 거기서 나오지 못하리라",
        "1\\(롬 3:19-20)^우리가 알거니와 무릇 율법이 말하는 바는 율법 아래 있는 자들에게 말하는 것이니 이는 모든 입을 막고 온 세상으로 하나님의 심판 아래 있게 하려 함이니라 그러므로 율법의 행위로 그의 앞에 의롭다 하심을 얻을 육체가 없나니 율법으로는 죄를 깨달음이니라",
        "1\\(갈 3:10)^무릇 율법 행위에 속한 자들은 저주 아래 있나니 기록된바 누구든지 율법 책에 기록된대로 온갖 일을 항상 행하지 아니하는 자는 저주 아래 있는 자라 하였음이라",
        "1\\(약 2:10)^누구든지 온 율법을 지키다가 그 하나에 거치면 모두 범한 자가 되나니",
        "3\\(롬 3:10-12)^기록한바 의인은 없나니 하나도 없으며 깨닫는 자도 없고 하나님을 찾는 자도 없고 다 치우쳐 한가지로 무익하게 되고 선을 행하는 자는 없나니 하나도 없도다",
        "3\\(롬 14:10-12)^네가 어찌하여 네 형제를 판단하느뇨 어찌하여 네 형제를 업신여기느뇨 우리가 다 하나님의 심판대 앞에 서리라 기록되었으되 주께서 가라사대 내가 살았노니 모든 무릎이 내게 꿇을 것이요 모든 혀가 하나님께 자백하리라 하였느니라 이러므로 우리 각인이 자기 일을 하나님께 직고하리라",
        "3\\(마 22:13)^임금이 사환들에게 말하되 그 수족을 결박하여 바깥 어두움에 내어 던지라 거기서 슬피 울며 이를 갊이 있으리라 하니라",
        "4\\(마 5:22)^나는 너희에게 이르노니 형제에게 노하는 자마다 심판을 받게 되고 형제를 대하여 라가라 하는 자는 공회에 잡히게 되고 미련한 놈이라 하는 자는 지옥 불에 들어가게 되리라",
        "4\\(계 20:12-15)^또 내가 보니 죽은 자들이 무론 대소하고 그 보좌 앞에 섰는데 책들이 펴 있고 또 다른 책이 펴졌으니 곧 생명책이라 죽은 자들이 자기 행위를 따라 책들에 기록된대로 심판을 받으니 바다가 그 가운데서 죽은 자들을 내어주고 또 사망과 음부도 그 가운데서 죽은 자들을 내어주매 각 사람이 자기의 행위대로 심판을 받고 사망과 음부도 불못에 던지우니 이것은 둘째 사망 곧 불못이라 누구든지 생명책에 기록되지 못한 자는 불못에 던지우더라",
        "4\\(마 10:28)^몸은 죽여도 영혼은 능히 죽이지 못하는 자들을 두려워하지 말고 오직 몸과 영혼을 능히 지옥에 멸하시는 자를 두려워하라"
    ],
    "day6.txt": [
        "1\\(딤전 1:15)^미쁘다 모든 사람이 받을만한 이 말이여 그리스도 예수께서 죄인을 구원하시려고 세상에 임하셨다 하였도다 죄인 중에 내가 괴수니라",
        "1\\(요일 3:5)^그가 우리 죄를 없이 하려고 나타내신바 된 것을 너희가 아나니 그에게는 죄가 없느니라",
        "1\\(사 7:14)^그러므로 주께서 친히 징조로 너희에게 주실 것이라 보라 처녀가 잉태하여 아들을 낳을 것이요 그 이름을 임마누엘이라 하리라",
        "2\\(사 9:6)^이는 한 아기가 우리에게 났고 한 아들을 우리에게 주신바 되었는데 그 어깨에는 정사를 메었고 그 이름은 기묘자라, 모사라, 전능하신 하나님이라, 영존하시는 아버지라, 평강의 왕이라 할것임이라",
        "1\\(레 17:11)^육체의 생명은 피에 있음이라 내가 이 피를 너희에게 주어 단에 뿌려 너희의 생명을 위하여 속하게 하였나니 생명이 피에 있으므로 피가 죄를 속하느니라",
        "1\\(출 12:13)^내가 애굽 땅을 칠 때에 그 피가 너희의 거하는 집에 있어서 너희를 위하여 표적이 될찌라 내가 피를 볼 때에 너희를 넘어가리니 재앙이 너희에게 내려 멸하지 아니하리라",
        "1\\(히 10:4)^이는 황소와 염소의 피가 능히 죄를 없이 하지 못함이라",
        "1\\(요 1:29)^이튿날 요한이 예수께서 자기에게 나아오심을 보고 가로되 보라 세상 죄를 지고 가는 하나님의 어린 양이로다",
        "1\\(사 53:5-6)^그가 찔림은 우리의 허물을 인함이요 그가 상함은 우리의 죄악을 인함이라 그가 징계를 받음으로 우리가 평화를 누리고 그가 채찍에 맞음으로 우리가 나음을 입었도다 우리는 다 양 같아서 그릇 행하여 각기 제 길로 갔거늘 여호와께서는 우리 무리의 죄악을 그에게 담당시키셨도다",
        "1\\(요 19:30)^예수께서 신 포도주를 받으신 후 가라사대 다 이루었다 하시고 머리를 숙이시고 영혼이 돌아가시니라",
        "2\\(요일 2:2)^저는 우리 죄를 위한 화목 제물이니 우리만 위할뿐 아니요 온 세상의 죄를 위하심이라",
        "1\\(히 9:12)^염소와 송아지의 피로 아니하고 오직 자기 피로 영원한 속죄를 이루사 단번에 성소에 들어 가셨느니라",
        "1\\(히 10:17-18)^또 저희 죄와 저희 불법을 내가 다시 기억지 아니하리라 하셨으니 이것을 사하셨은즉 다시 죄를 위하여 제사드릴 것이 없느니라",
        "1\\(엡 1:7)^우리가 그리스도 안에서 그의 은혜의 풍성함을 따라 그의 피로 말미암아 구속 곧 죄 사함을 받았으니",
        "2\\(사 43:25)^나 곧 나는 나를 위하여 네 허물을 도말하는 자니 네 죄를 기억지 아니하리라",
        "1\\(엡 2:8-9)^너희가 그 은혜를 인하여 믿음으로 말미암아 구원을 얻었나니 이것이 너희에게서 난 것이 아니요 하나님의 선물이라 행위에서 난 것이 아니니 이는 누구든지 자랑치 못하게 함이니라",
        "1\\(사 44:22)^내가 네 허물을 빽빽한 구름의 사라짐 같이, 네 죄를 안개의 사라짐 같이 도말하였으니 너는 내게로 돌아오라 내가 너를 구속하였음이니라",
        "1\\(요 10:28)^내가 저희에게 영생을 주노니 영원히 멸망치 아니할 터이요 또 저희를 내 손에서 빼앗을 자가 없느니라",
        "3\\(시 51:17)^하나님의 구하시는 제사는 상한 심령이라 하나님이여 상하고 통회하는 마음을 주께서 멸시치 아니하시리이다",
        "3\\(눅 1:77)^주의 백성에게 그 죄 사함으로 말미암는 구원을 알게 하리니",
        "3\\(요 3:18)^저를 믿는 자는 심판을 받지 아니하는 것이요 믿지 아니하는 자는 하나님의 독생자의 이름을 믿지 아니하므로 벌써 심판을 받은 것이니라",
        "4\\(히 10:1)^율법은 장차 오는 좋은 일의 그림자요 참형상이 아니므로 해마다 늘 드리는바 같은 제사로는 나아오는 자들을 언제든지 온전케 할 수 없느니라",
        "4\\(롬 5:18-19)^그런즉 한 범죄로 많은 사람이 정죄에 이른것 같이 의의 한 행동으로 말미암아 많은 사람이 의롭다 하심을 받아 생명에 이르렀느니라 한 사람의 순종치 아니함으로 많은 사람이 죄인 된것 같이 한 사람의 순종하심으로 많은 사람이 의인이 되리라",
        "4\\(요 5:24)^내가 진실로 진실로 너희에게 이르노니 내 말을 듣고 또 나 보내신 이를 믿는 자는 영생을 얻었고 심판에 이르지 아니하나니 사망에서 생명으로 옮겼느니라"
    ],
    "bible.txt": [
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
    ],
    "인생.txt": [
        "1\\(전 3:20-21)^다 흙으로 말미암았으므로 다 흙으로 돌아가나니 다 한 곳으로 가거니와 인생의 혼은 위로 올라가고 짐승의 혼은 아래 곧 땅으로 내려가는 줄을 누가 알랴",
        "1\\(시 39:4-6)^여호와여 나의 종말과 연한의 어떠함을 알게 하사 나로 나의 연약함을 알게 하소서 주께서 나의 날을 손 넓이 만큼 되게 하시매 나의 일생이 주의 앞에는 없는 것 같사오니 사람마다 그 든든히 선 때도 진실로 허사 뿐이니이다(셀라) 진실로 각 사람은 그림자 같이 다니고 헛된 일에 분요하며 재물을 쌓으나 누가 취할는지 알지 못하나이다",
        "1\\(잠 27:1)^너는 내일 일을 자랑하지 말라 하루 동안에 무슨 일이 날는지 네가 알 수 없음이니라",
        "1\\(약 4:14)^내일 일을 너희가 알지 못하는도다 너희 생명이 무엇이뇨 너희는 잠간 보이다가 없어지는 안개니라",
        "1\\(시 144:3-4)^여호와여 사람이 무엇이관대 주께서 저를 알아주시며 인생이 무엇이관대 주께서 저를 생각하시나이까 사람은 헛것 같고 그의 날은 지나가는 그림자 같으니이다",
        "1\\(시 89:47)^나의 때가 얼마나 단촉한지 기억하소서 주께서 모든 인생을 어찌 그리 허무하게 창조하셨는지요",
        "1\\(시 90:10)^우리의 년수가 칠십이요 강건하면 팔십이라도 그 년수의 자랑은 수고와 슬픔 뿐이요 신속히 가니 우리가 날아가나이다",
        "1\\(욥 7:6)^나의 날은 베틀의 북보다 빠르니 소망 없이 보내는구나",
        "1\\(전 1:18)^지혜가 많으면 번뇌도 많으니 지식을 더하는 자는 근심을 더하느니라",
        "1\\(전 2:22-23)^사람이 해 아래서 수고하는 모든 수고와 마음에 애쓰는 것으로 소득이 무엇이랴 일평생에 근심하며 수고하는 것이 슬픔뿐이라 그 마음이 밤에도 쉬지 못하나니 이것도 헛되도다",
        "1\\(전 3:1-2)^천하에 범사가 기한이 있고 모든 목적이 이룰 때가 있나니 날 때가 있고 죽을 때가 있으며 심을 때가 있고 심은 것을 뽑을 때가 있으며",
        "1\\(전 5:10-11)^은을 사랑하는 자는 은으로 만족함이 없고 풍부를 사랑하는 자는 소득으로 만족함이 없나니 이것도 헛되도다 재산이 더하면 먹는 자도 더하나니 그 소유주가 눈으로 보는 외에 무엇이 유익하랴",
        "1\\(전 5:15-17)^저가 모태에서 벌거벗고 나왔은즉 그 나온대로 돌아가고 수고하여 얻은 것을 아무 것도 손에 가지고 가지 못하리니 이것도 폐단이라 어떻게 왔든지 그대로 가리니 바람을 잡으려는 수고가 저에게 무엇이 유익하랴 일평생을 어두운데서 먹으며 번뇌와 병과 분노가 저에게 있느니라",
        "1\\(전 7:4)^지혜자의 마음은 초상집에 있으되 우매자의 마음은 연락하는 집에 있느니라",
        "1\\(전 9:12)^대저 사람은 자기의 시기를 알지 못하나니 물고기가 재앙의 그물에 걸리고 새가 올무에 걸림 같이 인생도 재앙의 날이 홀연히 임하면 거기 걸리느니라",
        "1\\(전 12:1)^너는 청년의 때 곧 곤고한 날이 이르기 전, 나는 아무 낙이 없다고 할 해가 가깝기 전에 너의 창조자를 기억하라",
        "1\\(잠 14:12-13)^어떤 길은 사람의 보기에 바르나 필경은 사망의 길이니라 웃을 때에도 마음에 슬픔이 있고 즐거움의 끝에도 근심이 있느니라",
        "1\\(애 3:33)^주께서 인생으로 고생하며 근심하게 하심이 본심이 아니시로다",
        "1\\(요 14:6)^예수께서 가라사대 내가 곧 길이요 진리요 생명이니 나로 말미암지 않고는 아버지께로 올 자가 없느니라",
        "1\\(마 16:26)^사람이 만일 온 천하를 얻고도 제 목숨을 잃으면 무엇이 유익하리요 사람이 무엇을 주고 제 목숨을 바꾸겠느냐"
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
const DATA_VERSION = "1.5";

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
    hintCount = 0;  // Reset hint counter for new problem

    renderProblem(currentProblem);
    answerInput.value = "";
    answerInput.focus();
}

function renderProblem(text) {
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
        score += 10;
        updateStatus();
        replaceBlankWithAnswer(currentAnswers[0], true);
        currentAnswers.shift();
        answerInput.value = "";
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
    attempts = 0;
    hintCount = 0; // Reset hint count for next blank
    if (currentAnswers.length === 0) {
        problemCompleted = true;
    }
}

function replaceBlankWithAnswer(answer, correct) {
    // Get all child nodes to handle both text and hint spans
    const children = Array.from(problemArea.childNodes);
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

        // Add node - if it's a span (correct/wrong/hint), extract only text content
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SPAN') {
            // Only add text content, not the styled span
            newContent.appendChild(document.createTextNode(node.textContent));
        } else {
            // For text nodes and other elements, clone as-is
            newContent.appendChild(node.cloneNode(true));
        }
    }

    // Clear and update problem area
    problemArea.textContent = '';
    problemArea.appendChild(newContent);
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

modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = parseInt(btn.dataset.mode);
        displayProblem();
    });
});


btnHint.addEventListener('click', () => {
    if (!currentAnswers.length || problemCompleted) return;

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

function applyHintToDisplay(hintPart, fullAnswer) {
    const children = Array.from(problemArea.childNodes);
    let foundBlank = false;
    const newContent = document.createDocumentFragment();

    for (let i = 0; i < children.length; i++) {
        const node = children[i];

        if (!foundBlank) {
            // 1. Check for existing hint span to update
            if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('hint-text')) {
                const hintSpan = document.createElement('span');
                hintSpan.className = 'hint-text';
                hintSpan.style.color = '#F1C40F';

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
                    hintSpan.style.color = '#F1C40F';

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
            newContent.appendChild(document.createTextNode(node.textContent));
        } else {
            newContent.appendChild(node.cloneNode(true));
        }
    }

    problemArea.textContent = '';
    problemArea.appendChild(newContent);
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
btnDelete.addEventListener('click', () => {
    if (currentDayIndex === -1) {
        alert("삭제할 일차를 선택해주세요.");
        return;
    }

    const dayName = originalFilenames[currentDayIndex];
    if (confirm(`정말 '${dayName}'을(를) 삭제하시겠습니까?`)) {
        originalScriptures.splice(currentDayIndex, 1);
        originalFilenames.splice(currentDayIndex, 1);
        saveDataToStorage();

        // Re-render dropdown
        updateDaySelect();

        // Reset view
        currentDayIndex = -1;
        daySelect.value = "";
        dayReset();
    }
});



btnSkip.addEventListener('click', () => {
    if (currentScripture.length === 0) return;
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


