// State for Audio
let isSpeaking = false;
let repeatMode = 1; // 1, 3, 5, -1 (Infinite)
let repeatTimeout = null;
let ttsSpeed = 1.0;
let currentUtterance = null; // Track current utterance to prevent ghost events
let ttsWarmedUp = false;     // 음성 엔진 예열 여부 (첫 재생 지연 방지)
let startWatchdog = null;    // 재생이 시작되지 않을 때 자동 복구용 타이머

// UI Elements (Initialized in initAudio)
let btnTTS, btnRepeat, btnSpeed, voiceSelect, btnVoiceHelp;

// 듣기 버튼 상태 표시 ('idle' | 'loading' | 'playing')
function setTTSButtonState(state) {
    if (!btnTTS) return;
    if (state === 'playing') {
        btnTTS.textContent = '정지 ⏹';
        btnTTS.classList.add('active');
    } else if (state === 'loading') {
        btnTTS.textContent = '준비 중…';
        btnTTS.classList.add('active');
    } else {
        btnTTS.textContent = '듣기 🔊';
        btnTTS.classList.remove('active');
        btnTTS.style.color = "";
    }
}

// 음성 엔진 예열: 첫 터치 시 무음 발화를 한 번 보내 엔진을 미리 깨워둔다.
// (안드로이드 TTS 서비스 바인딩 / iOS 사용자 제스처 요구사항 대응)
function warmUpTTS() {
    if (ttsWarmedUp || !('speechSynthesis' in window)) return;
    ttsWarmedUp = true;
    try {
        const warm = new SpeechSynthesisUtterance(' ');
        warm.volume = 0;
        warm.lang = 'ko-KR';
        window.speechSynthesis.speak(warm);
    } catch (e) {
        // 예열 실패는 무시 (실제 재생에는 영향 없음)
    }
}

// 음성 목록이 준비된 뒤에 콜백 실행 (getVoices()는 비동기로 채워짐)
function whenVoicesReady(callback) {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        callback(voices);
        return;
    }

    let done = false;
    const finish = () => {
        if (done) return;
        done = true;
        callback(window.speechSynthesis.getVoices());
    };

    window.speechSynthesis.addEventListener('voiceschanged', finish, { once: true });
    setTimeout(finish, 1000); // 목록이 끝내 안 오면 기본 음성으로 진행
}

// 사용할 한국어 음성 선택 (네트워크 음성보다 기기 내장 음성을 우선)
function pickKoreanVoice(voices) {
    const koVoices = voices.filter(v => v.lang && v.lang.includes('ko'));
    if (koVoices.length === 0) return null;

    const savedURI = localStorage.getItem('bible-voice-uri');
    if (savedURI) {
        const saved = koVoices.find(v => v.voiceURI === savedURI);
        if (saved) return saved;
    }

    // localService = 기기에 설치된 음성. 네트워크 음성은 첫 재생이 느리다.
    const localVoices = koVoices.filter(v => v.localService);
    const pool = localVoices.length > 0 ? localVoices : koVoices;

    const maleVoice = pool.find(v =>
        v.name.includes('Male') || v.name.includes('남자') || v.name.toUpperCase().includes('INJOON')
    );

    return maleVoice || pool[0];
}

function initAudio() {
    btnTTS = document.getElementById('btnTTS');
    btnRepeat = document.getElementById('btnRepeat');
    btnSpeed = document.getElementById('btnSpeed');
    voiceSelect = document.getElementById('voiceSelect');
    btnVoiceHelp = document.getElementById('btnVoiceHelp');
    const modalVoiceHelp = document.getElementById('voiceHelpModal');
    const btnCloseVoiceHelp = document.getElementById('btnCloseVoiceHelp');

    // Load saved settings
    ttsSpeed = parseFloat(localStorage.getItem('bible-tts-speed')) || 1.0;
    populateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = populateVoices;
    }

    // 첫 사용자 입력 시 음성 엔진 예열 (첫 듣기 재생이 늦게 나오는 문제 방지)
    document.addEventListener('pointerdown', warmUpTTS, { once: true, capture: true });
    document.addEventListener('keydown', warmUpTTS, { once: true, capture: true });

    // Event Listeners
    if (voiceSelect) {
        voiceSelect.addEventListener('change', () => {
            localStorage.setItem('bible-voice-uri', voiceSelect.value);
        });
    }

    if (btnVoiceHelp && modalVoiceHelp) {
        btnVoiceHelp.addEventListener('click', () => {
            modalVoiceHelp.style.display = 'flex';
        });
    }

    if (btnCloseVoiceHelp && modalVoiceHelp) {
        btnCloseVoiceHelp.addEventListener('click', () => {
            modalVoiceHelp.style.display = 'none';
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === modalVoiceHelp) {
            modalVoiceHelp.style.display = 'none';
        }
    });

    if (btnTTS) {
        btnTTS.addEventListener('click', () => {
            if (isSpeaking) {
                stopTTS();
            } else {
                speakCurrentVerse();
            }
        });
    }

    if (btnRepeat) {
        const modes = [1, 3, 5, -1];
        const labels = ["🔁 1x", "🔁 3x", "🔁 5x", "🔁 ∞"];

        btnRepeat.addEventListener('click', () => {
            let idx = modes.indexOf(repeatMode);
            idx = (idx + 1) % modes.length;
            repeatMode = modes[idx];
            btnRepeat.textContent = labels[idx];

            if (repeatMode !== 1) {
                btnRepeat.style.color = "var(--accent-blue, #339AF0)";
                btnRepeat.style.fontWeight = "bold";
            } else {
                btnRepeat.style.color = "";
                btnRepeat.style.fontWeight = "";
            }
        });
    }

    if (btnSpeed) {
        btnSpeed.innerHTML = `⏱️ ${ttsSpeed}x`;
        const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

        btnSpeed.addEventListener('click', () => {
            let idx = speeds.indexOf(ttsSpeed);
            idx = (idx + 1) % speeds.length;
            ttsSpeed = speeds[idx];
            btnSpeed.innerHTML = `⏱️ ${ttsSpeed}x`;
            localStorage.setItem('bible-tts-speed', ttsSpeed);

            if (ttsSpeed !== 1.0) {
                btnSpeed.style.color = "var(--accent-blue, #339AF0)";
                btnSpeed.style.fontWeight = "bold";
            } else {
                btnSpeed.style.color = "";
                btnSpeed.style.fontWeight = "";
            }
        });

        if (ttsSpeed !== 1.0) {
            btnSpeed.style.color = "var(--accent-blue, #339AF0)";
            btnSpeed.style.fontWeight = "bold";
        }
    }
}

function populateVoices() {
    if (!voiceSelect) return;

    // Ensure visibility
    voiceSelect.style.display = 'inline-block';

    voiceSelect.innerHTML = "";
    const voices = window.speechSynthesis.getVoices();
    const koVoices = voices.filter(v => v.lang.includes('ko'));

    if (koVoices.length === 0) {
        const option = document.createElement('option');
        option.textContent = "한국어 음성 없음";
        voiceSelect.appendChild(option);
        if (btnVoiceHelp) btnVoiceHelp.style.display = "inline-block";
        return;
    } else {
        if (btnVoiceHelp) btnVoiceHelp.style.display = "none";
    }

    const savedVoiceURI = localStorage.getItem('bible-voice-uri');
    let foundSaved = false;

    koVoices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.textContent = voice.name;
        option.value = voice.voiceURI;

        if (savedVoiceURI === voice.voiceURI) {
            option.selected = true;
            foundSaved = true;
        }

        voiceSelect.appendChild(option);
    });

    if (!foundSaved && !savedVoiceURI) {
        // 실제 재생에 쓰일 음성과 목록의 선택 상태를 일치시킨다
        const defaultVoice = pickKoreanVoice(voices);
        if (defaultVoice) {
            voiceSelect.value = defaultVoice.voiceURI;
        }
    }
}

function stopTTS() {
    isSpeaking = false;
    clearTimeout(repeatTimeout);
    clearTimeout(startWatchdog);
    if (currentUtterance) {
        currentUtterance.onstart = null;
        currentUtterance.onend = null;
        currentUtterance.onerror = null;
        currentUtterance = null;
    }
    if ('speechSynthesis' in window) {
        // pause()를 쓰면 iOS/안드로이드 WebView에서 엔진이 일시정지 상태로 남아
        // 다음 speak()이 큐에만 쌓이고 재생되지 않는다. cancel() 후 resume()으로 정리한다.
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();
    }
    setTTSButtonState('idle');
}

function speakCurrentVerse(remaining, isRetry) {
    // Access global variables from script.js
    if (!window.currentScripture || window.currentScripture.length === 0 || typeof window.problemNum === 'undefined') return;

    // Initial call
    if (remaining === undefined) {
        if (isSpeaking) stopTTS();
        remaining = repeatMode;
    }

    // 버튼을 누른 즉시 반응을 보여준다 (엔진이 준비되는 동안 먹통처럼 보이지 않도록)
    isSpeaking = true;
    setTTSButtonState('loading');

    const line = window.currentScripture[window.problemNum];
    if (!line) {
        // 읽을 구절이 없으면 버튼이 '준비 중…'에서 멈추지 않도록 되돌린다
        isSpeaking = false;
        setTTSButtonState('idle');
        return;
    }

    let cleanLine = line;
    const levelMatch = line.match(/^(\d+)\\/);
    if (levelMatch) {
        cleanLine = line.substring(levelMatch[0].length);
    }
    let [reference, verse] = cleanLine.split('^');
    if (!verse) {
        verse = cleanLine;
        reference = "";
    }

    let spokenReference = reference;
    if (spokenReference) {
        const numToText = (match, num, unit) => {
            const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
            let n = parseInt(num);
            if (n >= 1000) return num + unit;

            let res = "";
            if (n >= 100) {
                res += (n >= 200 ? digits[Math.floor(n / 100)] : "") + '백';
                n %= 100;
            }
            if (n >= 10) {
                res += (n >= 20 ? digits[Math.floor(n / 10)] : "") + '십';
                n %= 10;
            }
            if (n > 0 || res === "") {
                res += digits[n];
            }
            return res + unit;
        };

        // Use parseRefParts from utils.js
        const [book, chap, verse] = parseRefParts(spokenReference);

        // e.g. "요 3장 16에서 17절"
        // Replace hyphen with '에서 ' for ranges (e.g. 16-17 -> 16에서 17)
        let versePart = verse.replace(/-/g, '에서 ');

        spokenReference = `${book} ${chap}장 ${versePart}절`;

        spokenReference = spokenReference.replace(/(\d+)(장|절)/g, numToText);
        spokenReference = spokenReference.replace(/(\d+)에서/g, (m, n) => numToText(m, n, "에서"));
    }

    const textToSpeak = (spokenReference ? spokenReference + ". " : "") + verse;

    // 음성 목록이 아직 로드되지 않은 상태에서 speak()을 호출하면
    // 엔진이 기본(네트워크) 음성을 고르면서 첫 재생이 크게 지연될 수 있다.
    whenVoicesReady((voices) => {
        if (!isSpeaking) return; // 준비되는 사이에 사용자가 정지를 눌렀다면 중단

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        currentUtterance = utterance;
        utterance.lang = 'ko-KR';
        utterance.rate = ttsSpeed;

        const targetVoice = pickKoreanVoice(voices);
        if (targetVoice) {
            utterance.voice = targetVoice;
        }

        utterance.onstart = () => {
            clearTimeout(startWatchdog);
            if (isSpeaking) setTTSButtonState('playing');
        };

        utterance.onend = () => {
            clearTimeout(startWatchdog);
            if (!isSpeaking) return; // Prevent continuing if stopped manually
            if (remaining === -1 || remaining > 1) {
                const nextRemaining = (remaining === -1) ? -1 : remaining - 1;
                repeatTimeout = setTimeout(() => {
                    if (!isSpeaking) return; // Double check before firing next
                    speakCurrentVerse(nextRemaining);
                }, 500);
            } else {
                isSpeaking = false;
                setTTSButtonState('idle');
            }
        };

        utterance.onerror = (e) => {
            clearTimeout(startWatchdog);
            if (e.error === 'interrupted' || e.error === 'canceled') return;
            console.error("TTS Error:", e);
            if (!isSpeaking) return;
            isSpeaking = false;
            setTTSButtonState('idle');
        };

        // 일부 브라우저는 speak() 후에도 재생이 시작되지 않는 상태에 빠진다.
        // 2초 안에 시작되지 않으면 큐를 비우고 한 번만 다시 시도한다.
        clearTimeout(startWatchdog);
        if (!isRetry) {
            startWatchdog = setTimeout(() => {
                if (!isSpeaking || window.speechSynthesis.speaking) return;
                window.speechSynthesis.cancel();
                window.speechSynthesis.resume();
                speakCurrentVerse(remaining, true);
            }, 2000);
        }

        window.speechSynthesis.resume(); // 이전에 일시정지 상태로 남아 있는 경우 대비
        window.speechSynthesis.speak(utterance);
    });
}

// Auto-initialize if DOM is ready, or wait
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAudio);
} else {
    initAudio();
}
