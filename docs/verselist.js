// --- 암송 목록 패널 & 외운 구절 관리 ---

const MASTERED_STORAGE_KEY = 'bible_mastered_verses';
const EXCLUDE_STORAGE_KEY = 'bible_exclude_mastered';
const COMPACT_STORAGE_KEY = 'bible_verselist_compact';

let masteredKeys = new Set();
var excludeMastered = true; // 외운 구절을 출제에서 제외할지 (game.js에서도 참조)
let compactVerseText = true; // 목록에서 본문을 2줄로 줄여 보여줄지

// UI Elements
let versePanel, versePanelOverlay, btnVerseList, btnCloseVersePanel;
let versePanelTitle, versePanelCounts, versePanelList, chkExcludeMastered, btnClearMastered;
let btnToggleVerseText;

// --- 저장/복원 ---
function loadMasteredState() {
    try {
        const saved = JSON.parse(localStorage.getItem(MASTERED_STORAGE_KEY) || '[]');
        if (Array.isArray(saved)) masteredKeys = new Set(saved);
    } catch (e) {
        masteredKeys = new Set();
    }

    const savedExclude = localStorage.getItem(EXCLUDE_STORAGE_KEY);
    excludeMastered = savedExclude === null ? true : savedExclude === 'true';

    const savedCompact = localStorage.getItem(COMPACT_STORAGE_KEY);
    compactVerseText = savedCompact === null ? true : savedCompact === 'true';
}

// 본문 2줄 요약 / 전체 보기 전환
function applyCompactState() {
    if (!versePanel) return;
    versePanel.classList.toggle('compact', compactVerseText);
    if (btnToggleVerseText) {
        btnToggleVerseText.textContent = compactVerseText ? '본문 펼치기' : '본문 접기';
    }
}

function saveMasteredState() {
    localStorage.setItem(MASTERED_STORAGE_KEY, JSON.stringify([...masteredKeys]));
}

// --- 구절 식별 키 ---
// 장절이 있으면 "일차::장절"로 저장한다. 본문에 오타 수정이 있어도 표시가 유지된다.
function getDayName(dayIndex) {
    const name = originalFilenames[dayIndex];
    return name ? name.replace('.txt', '').trim() : '';
}

function verseKey(dayIndex, line) {
    const { reference } = parseVerseLine(line);
    return getDayName(dayIndex) + '::' + (reference || line);
}

function isVerseMastered(dayIndex, line) {
    return masteredKeys.has(verseKey(dayIndex, line));
}

function setVerseMastered(dayIndex, line, mastered) {
    const key = verseKey(dayIndex, line);
    if (mastered) {
        masteredKeys.add(key);
    } else {
        masteredKeys.delete(key);
    }
    saveMasteredState();
}

// game.js에서 출제 목록을 만들 때 사용
function filterMasteredVerses(dayIndex, verses) {
    if (!excludeMastered || dayIndex === -1) return verses;
    return verses.filter(line => !isVerseMastered(dayIndex, line));
}

// 현재 일차의 집계 (전체 / 외움)
function masteredCountForDay(dayIndex) {
    if (dayIndex === -1 || !originalScriptures[dayIndex]) return { total: 0, mastered: 0 };
    const verses = originalScriptures[dayIndex];
    const mastered = verses.filter(line => isVerseMastered(dayIndex, line)).length;
    return { total: verses.length, mastered: mastered };
}

// --- 체크 변경 시 진행 중인 출제 목록에 즉시 반영 ---
// 점수와 진행 상황을 유지하기 위해 해당 구절만 넣고 뺀다.
function applyMasteredChange(line, mastered) {
    if (!excludeMastered) {
        updateStatus();
        return;
    }

    const index = currentScripture.indexOf(line);

    if (mastered) {
        if (index === -1) return; // 이미 출제 목록에 없음
        const isCurrentProblem = (index === problemNum);
        currentScripture.splice(index, 1);
        leftVerse = currentScripture.length;

        if (isCurrentProblem) {
            updateStatus();
            displayProblem(); // 지금 풀던 구절이면 다음 구절로 넘어간다
            return;
        }
        if (index < problemNum) problemNum--; // 인덱스 보정
    } else {
        if (index !== -1) return; // 이미 출제 목록에 있음
        currentScripture.push(line);
        leftVerse = currentScripture.length;
    }

    updateStatus();
}

// --- 패널 렌더링 ---
function renderVersePanel() {
    if (!versePanelList) return;

    if (currentDayIndex === -1 || !originalScriptures[currentDayIndex]) {
        versePanelTitle.textContent = '암송 목록';
        versePanelCounts.textContent = '일차를 먼저 선택하세요';
        versePanelList.innerHTML = '';
        return;
    }

    const dayName = getDayName(currentDayIndex);
    const verses = originalScriptures[currentDayIndex];

    // 체크할 때마다 목록을 다시 그리므로 스크롤 위치를 유지한다
    const savedScrollTop = versePanelList.scrollTop;

    versePanelTitle.textContent = dayName;
    versePanelList.innerHTML = '';

    let masteredCount = 0;
    const currentLine = currentScripture[problemNum];

    verses.forEach((line, index) => {
        const { reference, verse } = parseVerseLine(line);
        const mastered = isVerseMastered(currentDayIndex, line);
        if (mastered) masteredCount++;

        const item = document.createElement('label');
        item.className = 'verse-item';
        if (mastered) item.classList.add('mastered');
        // 이번 회차에 이미 푼 구절 (외움 표시가 아닌데 출제 목록에 없는 경우)
        const answered = !mastered && currentScripture.indexOf(line) === -1;
        if (answered) item.classList.add('answered');
        if (!mastered && line === currentLine) item.classList.add('current');

        const check = document.createElement('input');
        check.type = 'checkbox';
        check.className = 'verse-check';
        check.checked = mastered;
        check.setAttribute('aria-label', (reference || '구절 ' + (index + 1)) + ' 외움 표시');
        check.addEventListener('change', () => {
            setVerseMastered(currentDayIndex, line, check.checked);
            applyMasteredChange(line, check.checked);
            renderVersePanel();
        });

        const body = document.createElement('span');
        body.className = 'verse-item-body';

        const refLine = document.createElement('span');
        refLine.className = 'verse-item-ref';
        refLine.textContent = reference || `${index + 1}번`;

        if (answered) {
            const tag = document.createElement('span');
            tag.className = 'verse-item-tag';
            tag.textContent = '완료';
            refLine.appendChild(tag);
        }

        const textLine = document.createElement('span');
        textLine.className = 'verse-item-text';
        textLine.textContent = verse;

        body.appendChild(refLine);
        body.appendChild(textLine);
        item.appendChild(check);
        item.appendChild(body);
        versePanelList.appendChild(item);
    });

    const quizCount = excludeMastered ? verses.length - masteredCount : verses.length;
    versePanelCounts.textContent = `전체 ${verses.length} · 외움 ${masteredCount} · 출제 ${quizCount}`;

    versePanelList.scrollTop = savedScrollTop;
}

// --- 열기 / 닫기 ---
function openVersePanel() {
    if (!versePanel) return;
    renderVersePanel();
    versePanel.classList.add('open');
    versePanel.setAttribute('aria-hidden', 'false');
    if (versePanelOverlay) versePanelOverlay.classList.add('open');
    // 모바일에서 목록을 볼 때는 키보드를 내린다
    if (answerInput) answerInput.blur();
}

function closeVersePanel() {
    if (!versePanel) return;
    versePanel.classList.remove('open');
    versePanel.setAttribute('aria-hidden', 'true');
    if (versePanelOverlay) versePanelOverlay.classList.remove('open');
}

function toggleVersePanel() {
    if (versePanel && versePanel.classList.contains('open')) {
        closeVersePanel();
    } else {
        openVersePanel();
    }
}

function isVersePanelOpen() {
    return !!(versePanel && versePanel.classList.contains('open'));
}

// 저장된 상태는 스크립트 로드 시점에 바로 복원한다.
// (script.js의 initData()가 DOMContentLoaded 이전에 실행되므로 그 전에 준비되어야 한다)
loadMasteredState();

// --- 초기화 ---
function initVerseList() {
    versePanel = document.getElementById('versePanel');
    versePanelOverlay = document.getElementById('versePanelOverlay');
    btnVerseList = document.getElementById('btnVerseList');
    btnCloseVersePanel = document.getElementById('btnCloseVersePanel');
    versePanelTitle = document.getElementById('versePanelTitle');
    versePanelCounts = document.getElementById('versePanelCounts');
    versePanelList = document.getElementById('versePanelList');
    chkExcludeMastered = document.getElementById('chkExcludeMastered');
    btnClearMastered = document.getElementById('btnClearMastered');
    btnToggleVerseText = document.getElementById('btnToggleVerseText');

    applyCompactState();

    if (btnToggleVerseText) {
        btnToggleVerseText.addEventListener('click', () => {
            compactVerseText = !compactVerseText;
            localStorage.setItem(COMPACT_STORAGE_KEY, compactVerseText);
            applyCompactState();
        });
    }

    if (chkExcludeMastered) {
        chkExcludeMastered.checked = excludeMastered;
        chkExcludeMastered.addEventListener('change', () => {
            excludeMastered = chkExcludeMastered.checked;
            localStorage.setItem(EXCLUDE_STORAGE_KEY, excludeMastered);
            // 출제 범위가 바뀌므로 현재 일차를 다시 구성한다
            if (currentDayIndex !== -1) dayReset();
            renderVersePanel();
        });
    }

    if (btnVerseList) btnVerseList.addEventListener('click', toggleVersePanel);
    if (btnCloseVersePanel) btnCloseVersePanel.addEventListener('click', closeVersePanel);
    if (versePanelOverlay) versePanelOverlay.addEventListener('click', closeVersePanel);

    if (btnClearMastered) {
        btnClearMastered.addEventListener('click', () => {
            if (currentDayIndex === -1) return;
            const counts = masteredCountForDay(currentDayIndex);
            if (counts.mastered === 0) {
                customAlert('이 일차에는 외움으로 표시한 구절이 없습니다.');
                return;
            }
            customConfirm(`${getDayName(currentDayIndex)}의 외움 표시 ${counts.mastered}개를 모두 해제할까요?`, () => {
                originalScriptures[currentDayIndex].forEach(line => {
                    masteredKeys.delete(verseKey(currentDayIndex, line));
                });
                saveMasteredState();
                dayReset();
                renderVersePanel();
            });
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isVersePanelOpen()) closeVersePanel();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVerseList);
} else {
    initVerseList();
}
