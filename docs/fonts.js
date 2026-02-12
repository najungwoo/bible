var defaultFonts = [
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
    { name: '본명조 (Noto Serif KR)', family: "'Noto Serif KR', serif" },
    { name: '나눔손글씨 붓 (Nanum Brush)', family: "'Nanum Brush Script', cursive" },
    { name: '연성 (Yeon Sung)', family: "'Yeon Sung', cursive" },
    { name: '송명 (Song Myung)', family: "'Song Myung', serif" },
    { name: '푸어스토리 (Poor Story)', family: "'Poor Story', cursive" },
    { name: '함렛 (Hahmlet)', family: "'Hahmlet', serif" }
];

var systemFonts = [];
var selectedFontFamily = defaultFonts[0].family;
var isBold = true;
var fontSize = 24; // Shared global state

// Initialize Font Settings
function initFontSettings() {
    renderFontList();

    // Sync slider with current font size
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    const fontSizeDisplay = document.getElementById('fontSizeDisplay');
    const fontBoldCheckbox = document.getElementById('fontBoldCheckbox');

    if (fontSizeSlider) fontSizeSlider.value = fontSize;
    if (fontSizeDisplay) updateFontSizeDisplay(fontSize);

    // Sync bold state (check style.css or current inline)
    isBold = document.body.style.fontWeight !== '400';
    if (fontBoldCheckbox) fontBoldCheckbox.checked = isBold;
}

function renderFontList() {
    const fontList = document.getElementById('fontList');
    if (!fontList) return;

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
    const fontList = document.getElementById('fontList');
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

function updateFontSizeDisplay(size) {
    const fontSizeDisplay = document.getElementById('fontSizeDisplay');
    if (!fontSizeDisplay) return;
    // approx rem calculation based on 16px base, roughly
    const rem = (size / 16).toFixed(1);
    fontSizeDisplay.textContent = `${size}px (${rem}rem)`;
}


// Event Listeners (Setup when DOM loads)
document.addEventListener('DOMContentLoaded', () => {
    const btnFontSettings = document.getElementById('btnFontSettings');
    const fontSettingsModal = document.getElementById('fontSettingsModal');
    const closeFontSettings = document.getElementById('closeFontSettings');
    const btnCloseFontSettings = document.getElementById('btnCloseFontSettings');
    const btnLoadSystemFonts = document.getElementById('btnLoadSystemFonts');
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    const fontBoldCheckbox = document.getElementById('fontBoldCheckbox');
    const btnResetFont = document.getElementById('btnResetFont');
    const btnFontUp = document.getElementById('btnFontUp');
    const btnFontDown = document.getElementById('btnFontDown');
    const problemArea = document.getElementById('problemArea');


    if (btnFontSettings) {
        btnFontSettings.addEventListener('click', () => {
            initFontSettings();
            fontSettingsModal.style.display = 'flex';
        });
    }

    if (closeFontSettings) closeFontSettings.addEventListener('click', () => fontSettingsModal.style.display = 'none');
    if (btnCloseFontSettings) btnCloseFontSettings.addEventListener('click', () => fontSettingsModal.style.display = 'none');

    if (btnLoadSystemFonts) {
        btnLoadSystemFonts.addEventListener('click', async () => {
            // Assuming customAlert is globally available from script.js (but script.js loads AFTER fonts.js?)
            // Wait, if fonts.js loads BEFORE script.js, then customAlert is NOT yet defined when this listener is ATTACHED.
            // BUT, the listener executes ON CLICK, which is much later, so customAlert WILL be defined by then.
            // So this is safe.

            try {
                if (!window.queryLocalFonts) {
                    if (typeof customAlert === 'function') customAlert('이 브라우저는 시스템 폰트 불러오기를 지원하지 않습니다. (Chrome/Edge PC 버전 권장)');
                    else alert('이 브라우저는 시스템 폰트 불러오기를 지원하지 않습니다. (Chrome/Edge PC 버전 권장)');
                    return;
                }

                const permission = await navigator.permissions.query({ name: 'local-fonts' });
                if (permission.state === 'denied') {
                    if (typeof customAlert === 'function') customAlert('폰트 접근 권한이 거부되었습니다.');
                    else alert('폰트 접근 권한이 거부되었습니다.');
                    return;
                }

                const fonts = await window.queryLocalFonts();
                const uniqueFamilies = [...new Set(fonts.map(f => f.family))];

                systemFonts = uniqueFamilies.map(fam => ({ name: fam, family: `"${fam}"` })).sort((a, b) => a.name.localeCompare(b.name));

                if (typeof customAlert === 'function') customAlert(`시스템 폰트 ${systemFonts.length}개를 불러왔습니다.`);
                else alert(`시스템 폰트 ${systemFonts.length}개를 불러왔습니다.`);

                renderFontList();
                btnLoadSystemFonts.style.display = 'none';

            } catch (err) {
                console.error(err);
                if (typeof customAlert === 'function') customAlert('시스템 폰트를 불러오는 중 오류가 발생했습니다: ' + err.message);
                else alert('시스템 폰트를 불러오는 중 오류가 발생했습니다: ' + err.message);
            }
        });
    }

    if (fontSizeSlider) {
        fontSizeSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            fontSize = val;
            if (problemArea) problemArea.style.setProperty('--app-font-size', fontSize + 'px');
            updateFontSizeDisplay(val);
        });
    }

    if (fontBoldCheckbox) {
        fontBoldCheckbox.addEventListener('change', (e) => {
            isBold = e.target.checked;
            if (isBold) {
                document.body.style.fontWeight = '700';
            } else {
                document.body.style.fontWeight = '400';
            }
        });
    }

    if (btnResetFont) {
        btnResetFont.addEventListener('click', () => {
            selectedFontFamily = defaultFonts[0].family;
            document.documentElement.style.setProperty('--app-font', selectedFontFamily);
            fontSize = 28; // Default size
            isBold = true;

            // Apply
            document.body.style.fontFamily = '';
            if (problemArea) problemArea.style.setProperty('--app-font-size', '28px');
            document.body.style.fontWeight = ''; // Revert to CSS default (700)

            initFontSettings();
        });
    }

    // Font Size Logic (Moved from script.js)
    if (btnFontUp) {
        btnFontUp.addEventListener('click', () => {
            if (fontSize < 50) { // Max limit
                fontSize += 2;
                if (problemArea) problemArea.style.setProperty('--app-font-size', fontSize + 'px');
            }
        });
    }

    if (btnFontDown) {
        btnFontDown.addEventListener('click', () => {
            if (fontSize > 14) { // Min limit
                fontSize -= 2;
                if (problemArea) problemArea.style.setProperty('--app-font-size', fontSize + 'px');
            }
        });
    }
});
