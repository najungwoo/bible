// --- State Variables (상태 변수들) ---
var originalScriptures = []; // 전체 구절 데이타 (배열의 배열)
var originalFilenames = [];
var currentScripture = [];
var currentDayIndex = -1;
var currentMode = 1; // 1: Blank, 2: Verse, 3: Ref, 4: Whole, 5: Chosung
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

let tempVerses = [];
let autoAdvanceTimer = null;
