// Constants & Regex
const PUNCT_RE = /[,\-]/g;
const WORD_TOKEN_RE = /[0-9A-Za-z가-힣]/;

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

// 한글 초성 추출
const CHOSUNG_LIST = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
function getChosung(text) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        // 한글 가(0xAC00) ~ 힣(0xD7A3)
        if (code >= 0xAC00 && code <= 0xD7A3) {
            result += CHOSUNG_LIST[Math.floor((code - 0xAC00) / 588)];
        } else {
            result += text.charAt(i); // 한글이 아니면(영어, 숫자 등) 그대로
        }
    }
    return result;
}

// 단어를 초성으로 마스킹 (기호 유지)
function maskWithChosung(tok) {
    return tok.replace(/[0-9A-Za-z가-힣]+/g, (m) => getChosung(m));
}

// --- Mode 5 (Chosung Mode) Helper Functions ---
function findChosungMatch(text, answer) {
    const targetChosung = getChosung(answer);
    const idx = text.indexOf(targetChosung);
    if (idx !== -1) {
        const match = [targetChosung];
        match.index = idx;
        return match;
    }
    return null;
}

// Helper for reference mode underscore mask remaining
function getRemainingUnderscoresMask(answer, hintLength) {
    const remaining = Math.max(0, answer.length - hintLength);
    return '_'.repeat(remaining);
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
function refMasked(ref, masked, showVerse = false) {
    let [book, chap, verse] = parseRefParts(ref);
    if (!masked) {
        return `(${book} ${chap}:${verse})`;
    }
    if (showVerse) {
        return `(_ _:${verse})`;
    } else {
        let [verseMask, _] = splitVerseParts(verse);
        return `(_ _:${verseMask})`;
    }
}
// Mode 5 (Chosung Mode) Helper to get remaining mask after partial hint
function getRemainingChosungMask(answer, hintLength) {
    const fullChosung = getChosung(answer);
    if (hintLength >= fullChosung.length) return "";
    return fullChosung.substring(hintLength);
}
