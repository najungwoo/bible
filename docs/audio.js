
// State for Audio
let isSpeaking = false;
let repeatMode = 1; // 1, 3, 5, -1 (Infinite)
let repeatTimeout = null;

// UI Elements (Initialized in initAudio)
let btnTTS, btnRepeat, voiceSelect, btnVoiceHelp;

function initAudio() {
    btnTTS = document.getElementById('btnTTS');
    btnRepeat = document.getElementById('btnRepeat');
    voiceSelect = document.getElementById('voiceSelect');
    btnVoiceHelp = document.getElementById('btnVoiceHelp');
    const modalVoiceHelp = document.getElementById('voiceHelpModal');
    const btnCloseVoiceHelp = document.getElementById('btnCloseVoiceHelp');

    // Load saved settings
    populateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = populateVoices;
    }

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
}

function populateVoices() {
    if (!voiceSelect) return;
    voiceSelect.innerHTML = "";
    const voices = window.speechSynthesis.getVoices();
    const koVoices = voices.filter(v => v.lang.includes('ko'));

    // Always add Google Online Option first
    const googleOption = document.createElement('option');
    googleOption.textContent = "Google 번역 음성 (온라인 - 데이터 필요)";
    googleOption.value = "google_online";
    voiceSelect.appendChild(googleOption);

    if (koVoices.length === 0) {
        const option = document.createElement('option');
        option.textContent = "─ 기기 기본 음성 없음 ─";
        option.disabled = true;
        voiceSelect.appendChild(option);
        if (btnVoiceHelp) btnVoiceHelp.style.display = "inline-block";
        // Do not return here, so Google option is still available
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
        const maleVoice = koVoices.find(v => v.name.includes('Male') || v.name.includes('남자') || v.name.toUpperCase().includes('INJOON'));
        if (maleVoice) {
            voiceSelect.value = maleVoice.voiceURI;
        }
    }
}

function stopTTS() {
    clearTimeout(repeatTimeout);
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    if (googleAudio) {
        googleAudio.pause();
        googleAudio = null;
    }
    isSpeaking = false;
    if (btnTTS) {
        btnTTS.classList.remove('active');
        btnTTS.style.color = "";
    }
}

function speakCurrentVerse(remaining) {
    // Access global variables from script.js
    if (!window.currentScripture || window.currentScripture.length === 0 || typeof window.problemNum === 'undefined') return;

    // Initial call
    if (remaining === undefined) {
        stopTTS();
        remaining = repeatMode;
    }

    const line = window.currentScripture[window.problemNum];
    if (!line) return;

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

        spokenReference = spokenReference.replace(/:/g, '장 ');
        spokenReference = spokenReference.replace(/-/g, '에서 ');
        spokenReference += '절';

        spokenReference = spokenReference.replace(/(\d+)(장|절)/g, numToText);
        spokenReference = spokenReference.replace(/(\d+)에서/g, (m, n) => numToText(m, n, "에서"));
    }

    const textToSpeak = (spokenReference ? spokenReference + ". " : "") + verse;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.0;

    const allVoices = window.speechSynthesis.getVoices();
    const koVoices = allVoices.filter(v => v.lang.includes('ko'));

    let targetVoice = null;

    const savedURI = localStorage.getItem('bible-voice-uri');
    if (savedURI) {
        if (savedURI === 'google_online') {
            targetVoice = 'google_online';
        } else {
            targetVoice = koVoices.find(v => v.voiceURI === savedURI);
        }
    }

    if (!targetVoice) {
        targetVoice = koVoices.find(v => v.name.includes('Male') || v.name.includes('남자') || v.name.toUpperCase().includes('INJOON'));
    }

    if (!targetVoice && koVoices.length > 0) {
        targetVoice = koVoices[0];
    }

    // Default to Google Online if no other voice found (or if user wants it)
    // logic: if targetVoice is string 'google_online', use it.

    if (targetVoice === 'google_online') {
        playGoogleTTS(textToSpeak, remaining);
    } else {
        if (targetVoice) {
            utterance.voice = targetVoice;
        }

        utterance.onend = () => {
            // Logic for repeat
            handleRepeat(remaining);
        };

        utterance.onerror = (e) => {
            if (e.error === 'interrupted' || e.error === 'canceled') return;
            console.error("TTS Error:", e);
            isSpeaking = false;
            if (btnTTS) btnTTS.classList.remove('active');
        };

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        isSpeaking = true;
        if (btnTTS) {
            btnTTS.classList.add('active');
        }
    }
}

// Helper to handle repeat logic centrally
function handleRepeat(remaining) {
    if (remaining === -1 || remaining > 1) {
        const nextRemaining = (remaining === -1) ? -1 : remaining - 1;
        repeatTimeout = setTimeout(() => {
            speakCurrentVerse(nextRemaining);
        }, 500);
    } else {
        isSpeaking = false;
        if (btnTTS) btnTTS.classList.remove('active');
    }
}

let googleAudio = null;

function playGoogleTTS(text, remaining) {
    // 1. Split text into chunks (approx 100 chars) to avoid Google API limit
    // Simple split by punctuation
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];

    let index = 0;

    const playNextChunk = () => {
        if (index >= sentences.length) {
            // Finished all chunks
            handleRepeat(remaining);
            return;
        }

        const chunk = sentences[index].trim();
        if (!chunk) {
            index++;
            playNextChunk();
            return;
        }

        // Use the hack URL
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=ko&client=tw-ob`;

        googleAudio = new Audio(url);
        googleAudio.onended = () => {
            index++;
            playNextChunk();
        };
        googleAudio.onerror = (e) => {
            console.error("Google TTS Playback Error", e);
            index++;
            playNextChunk();
        };

        googleAudio.play().catch(e => {
            console.error("Audio Play failed (interaction needed?)", e);
            isSpeaking = false;
            if (btnTTS) btnTTS.classList.remove('active');
        });
    };

    isSpeaking = true;
    if (btnTTS) btnTTS.classList.add('active');
    playNextChunk();
}

// Auto-initialize if DOM is ready, or wait
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAudio);
} else {
    initAudio();
}
