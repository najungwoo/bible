// Theme Logic
const btnTheme = document.getElementById('btnTheme');

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (btnTheme) btnTheme.textContent = '☀️';
    } else {
        document.documentElement.removeAttribute('data-theme');
        if (btnTheme) btnTheme.textContent = '🌙';
    }
}

function toggleTheme() {
    // Check if we have a custom background active and clear it
    // This allows the manual toggle to restore "Original" dark/light mode behavior
    const hasCustomBg = document.body.className.split(' ').some(c => c.startsWith('bg-'));
    if (hasCustomBg) {
        // Remove all bg- classes
        const classes = Array.from(document.body.classList);
        classes.forEach(c => {
            if (c.startsWith('bg-')) document.body.classList.remove(c);
        });

        // Remove legacy storage
        localStorage.removeItem('bible-bg-theme');

        // Reset grid selections
        const themeOptions = document.querySelectorAll('.theme-option');
        if (themeOptions) {
            themeOptions.forEach(b => b.classList.remove('active'));
        }
    }

    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        btnTheme.textContent = '🌙';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        btnTheme.textContent = '☀️';
    }
}

if (btnTheme) {
    btnTheme.addEventListener('click', toggleTheme);
    document.addEventListener('DOMContentLoaded', initTheme);
}

// Background Theme Logic
const bgThemes = {
    solid: [
        // Light Themes
        { id: 'solid-white', class: 'bg-solid-white', color: '#F8F9FA', isDark: false, name: 'White' },
        { id: 'solid-cream', class: 'bg-solid-cream', color: '#FDFBF7', isDark: false, name: 'Cream' },
        { id: 'solid-paper', class: 'bg-solid-paper', color: '#F4ECD8', isDark: false, name: 'Paper' },

        // Dark Themes
        { id: 'solid-dark-gray', class: 'bg-solid-dark-gray', color: '#343A40', isDark: true, name: 'Dark Gray' },
        { id: 'solid-black', class: 'bg-solid-black', color: '#121212', isDark: true, name: 'Black' },
        { id: 'solid-navy', class: 'bg-solid-navy', color: '#1A237E', isDark: true, name: 'Navy' },
        { id: 'solid-forest', class: 'bg-solid-forest', color: '#1B5E20', isDark: true, name: 'Forest' }
    ]
};

const btnBackground = document.getElementById('btnBackground');
const backgroundModal = document.getElementById('backgroundModal');
const closeBackgroundSettings = document.getElementById('closeBackgroundSettings');
const btnCloseBackgroundSettings = document.getElementById('btnCloseBackgroundSettings');

function initBackgrounds() {
    renderThemeGrid('themeSimpleGrid', bgThemes.solid);

    // Load saved theme
    const savedTheme = localStorage.getItem('bible-bg-theme');
    if (savedTheme) {
        // Find theme object to check isDark status
        const themeObj = bgThemes.solid.find(t => t.class === savedTheme);
        if (themeObj) {
            applyTheme(savedTheme, themeObj.isDark);
        } else {
            // Fallback if saved theme no longer exists (e.g. was gradient)
            applyTheme('bg-solid-white', false);
        }
    }
}

function renderThemeGrid(gridId, themes) {
    const container = document.getElementById(gridId);
    if (!container) return;
    container.innerHTML = '';

    themes.forEach(theme => {
        const btn = document.createElement('div');
        btn.className = 'theme-option';
        // btn.dataset.themeClass = theme.class; // Not strictly needed if we use closure
        btn.style.background = theme.color;
        btn.title = theme.name;

        btn.addEventListener('click', () => {
            // Highlight selection
            document.querySelectorAll('.theme-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyTheme(theme.class, theme.isDark);
        });

        // Mark active if matches current
        if (document.body.classList.contains(theme.class)) {
            btn.classList.add('active');
        }

        container.appendChild(btn);
    });
}

function applyTheme(themeClass, isDark) {
    // Remove all old bg classes
    const solidClasses = bgThemes.solid.map(t => t.class);
    // Also remove legacy classes just in case
    const legacyClasses = [
        'bg-simple', 'bg-gradient-pastel', 'bg-gradient-sky', 'bg-gradient-soda', 'bg-gradient-sunset',
        'bg-nature-forest', 'bg-nature-sea', 'bg-nature-sky', 'bg-nature-stars'
    ];

    document.body.classList.remove(...solidClasses, ...legacyClasses);

    // Add new class
    document.body.classList.add(themeClass);
    localStorage.setItem('bible-bg-theme', themeClass);

    // Adaptive Dark Mode Logic
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        if (btnTheme) btnTheme.textContent = '☀️';
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        if (btnTheme) btnTheme.textContent = '🌙';
    }
}

if (btnBackground) {
    btnBackground.addEventListener('click', () => {
        if (backgroundModal) backgroundModal.style.display = 'flex';
    });
}

if (closeBackgroundSettings) {
    closeBackgroundSettings.addEventListener('click', () => {
        if (backgroundModal) backgroundModal.style.display = 'none';
    });
}

if (btnCloseBackgroundSettings) {
    btnCloseBackgroundSettings.addEventListener('click', () => {
        if (backgroundModal) backgroundModal.style.display = 'none';
    });
}

window.addEventListener('click', (e) => {
    if (e.target === backgroundModal) {
        backgroundModal.style.display = 'none';
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', initBackgrounds);
