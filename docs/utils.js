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
