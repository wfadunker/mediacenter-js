'use strict';

(() => {
    const root = document.documentElement;
    const widget = document.querySelector('[data-a11y-widget]');

    if (!widget) return;

    const toggle = widget.querySelector('[data-a11y-toggle]');
    const panel = widget.querySelector('[data-a11y-panel]');
    const closeButton = widget.querySelector('[data-a11y-close]');
    const status = widget.querySelector('[data-a11y-status]');
    const sizeLabel = widget.querySelector('[data-a11y-size-label]');
    const tabs = Array.from(widget.querySelectorAll('[role="tab"]'));
    const tabPanels = Array.from(widget.querySelectorAll('[data-a11y-tabpanel]'));

    const activateTab = (tab, focus = false) => {
        if (!tab) return;

        tabs.forEach((item) => {
            const selected = item === tab;
            item.setAttribute('aria-selected', String(selected));
            item.tabIndex = selected ? 0 : -1;
        });

        tabPanels.forEach((tabPanel) => {
            tabPanel.hidden = tabPanel.dataset.a11yTabpanel !== tab.dataset.a11yTab;
        });

        if (focus) tab.focus();
    };

    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => activateTab(tab));

        tab.addEventListener('keydown', (event) => {
            const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
            if (!keys.includes(event.key)) return;

            event.preventDefault();

            let nextIndex = index;
            if (event.key === 'Home') nextIndex = 0;
            else if (event.key === 'End') nextIndex = tabs.length - 1;
            else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + tabs.length) % tabs.length;
            else nextIndex = (index + 1) % tabs.length;

            activateTab(tabs[nextIndex], true);
        });
    });

    const textSizes = ['normal', 'large', 'larger', 'largest'];
    const textSizeLabels = {
        normal: '100%',
        large: '112%',
        larger: '125%',
        largest: '138%',
    };

    const ttsRates = [0.85, 1, 1.25];
    const rateLabels = { 0.85: 'lambat', 1: 'normal', 1.25: 'cepat' };

    const storageKey = 'mediacenter-a11y-settings-v1';
    const defaults = {
        textSize: 'normal',
        highContrast: false,
        underlineLinks: false,
        textSpacing: false,
        bigCursor: false,
        reduceMotion: false,
        dyslexiaFont: false,
        grayscale: false,
        hideImages: false,
        readingMask: false,
        speakOnClick: false,
        ttsRate: 1,
    };

    let settings = { ...defaults };
    let lastFocused = null;

    const isBoolean = (value) => typeof value === 'boolean';

    const loadSettings = () => {
        try {
            const stored = JSON.parse(window.localStorage.getItem(storageKey) || 'null');
            if (!stored || typeof stored !== 'object') return;

            settings = {
                textSize: textSizes.includes(stored.textSize) ? stored.textSize : defaults.textSize,
                highContrast: isBoolean(stored.highContrast) ? stored.highContrast : defaults.highContrast,
                underlineLinks: isBoolean(stored.underlineLinks) ? stored.underlineLinks : defaults.underlineLinks,
                textSpacing: isBoolean(stored.textSpacing) ? stored.textSpacing : defaults.textSpacing,
                bigCursor: isBoolean(stored.bigCursor) ? stored.bigCursor : defaults.bigCursor,
                reduceMotion: isBoolean(stored.reduceMotion) ? stored.reduceMotion : defaults.reduceMotion,
                dyslexiaFont: isBoolean(stored.dyslexiaFont) ? stored.dyslexiaFont : defaults.dyslexiaFont,
                grayscale: isBoolean(stored.grayscale) ? stored.grayscale : defaults.grayscale,
                hideImages: isBoolean(stored.hideImages) ? stored.hideImages : defaults.hideImages,
                readingMask: isBoolean(stored.readingMask) ? stored.readingMask : defaults.readingMask,
                speakOnClick: isBoolean(stored.speakOnClick) ? stored.speakOnClick : defaults.speakOnClick,
                ttsRate: ttsRates.includes(stored.ttsRate) ? stored.ttsRate : defaults.ttsRate,
            };
        } catch (error) {
            // Pengaturan tetap berfungsi untuk sesi ini jika storage tidak tersedia.
        }
    };

    const saveSettings = () => {
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(settings));
        } catch (error) {
            // Jangan mengganggu navigasi jika storage dinonaktifkan browser.
        }
    };

    const announce = (message) => {
        if (status) status.textContent = message;
    };

    const setPressed = (action, pressed) => {
        const button = widget.querySelector(`[data-a11y-action="${action}"]`);
        if (button) button.setAttribute('aria-pressed', String(pressed));
    };

    const applySettings = () => {
        if (settings.textSize === 'normal') {
            delete root.dataset.a11yTextSize;
        } else {
            root.dataset.a11yTextSize = settings.textSize;
        }

        root.dataset.a11yContrast = settings.highContrast ? 'high' : 'normal';
        root.dataset.a11yUnderline = settings.underlineLinks ? 'on' : 'off';
        root.dataset.a11ySpacing = settings.textSpacing ? 'on' : 'off';
        root.dataset.a11yCursor = settings.bigCursor ? 'large' : 'normal';
        root.dataset.a11yMotion = settings.reduceMotion ? 'reduced' : 'normal';
        root.dataset.a11yFont = settings.dyslexiaFont ? 'dyslexia' : 'normal';
        root.dataset.a11yColor = settings.grayscale ? 'grayscale' : 'normal';
        root.dataset.a11yImages = settings.hideImages ? 'off' : 'on';
        root.dataset.a11yMask = settings.readingMask ? 'on' : 'off';

        setPressed('contrast', settings.highContrast);
        setPressed('underline', settings.underlineLinks);
        setPressed('spacing', settings.textSpacing);
        setPressed('cursor', settings.bigCursor);
        setPressed('motion', settings.reduceMotion);
        setPressed('font', settings.dyslexiaFont);
        setPressed('grayscale', settings.grayscale);
        setPressed('images', settings.hideImages);
        setPressed('mask', settings.readingMask);
        setPressed('speak-click', settings.speakOnClick);

        panel.querySelectorAll('[data-a11y-rate]').forEach((button) => {
            const rate = Number(button.dataset.a11yRate);
            button.setAttribute('aria-pressed', String(rate === settings.ttsRate));
        });

        updateReadingMask();

        if (sizeLabel) sizeLabel.textContent = textSizeLabels[settings.textSize] || textSizeLabels.normal;

        window.dispatchEvent(new CustomEvent('mediacenter:a11y-change', {
            detail: { ...settings },
        }));
    };

    const focusableControls = () => Array.from(
        panel.querySelectorAll('button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter((element) => element.offsetParent !== null);

    const setPanelOpen = (open, restoreFocus = true) => {
        if (open) {
            lastFocused = document.activeElement;
            panel.hidden = false;
            toggle.setAttribute('aria-expanded', 'true');

            const firstControl = focusableControls()[0];
            if (firstControl) firstControl.focus();
            return;
        }

        panel.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        stopSpeech();

        if (restoreFocus) {
            const target = lastFocused && lastFocused.isConnected ? lastFocused : toggle;
            if (target && typeof target.focus === 'function') target.focus();
        }
    };

    const changeTextSize = (direction) => {
        const currentIndex = textSizes.indexOf(settings.textSize);
        const nextIndex = Math.min(textSizes.length - 1, Math.max(0, currentIndex + direction));
        settings.textSize = textSizes[nextIndex];
        announce(settings.textSize === 'normal'
            ? 'Ukuran teks normal.'
            : `Ukuran teks diperbesar menjadi ${textSizeLabels[settings.textSize]}.`);
    };

    const BAND_HEIGHT = 72;
    let maskTop = null;
    let maskBottom = null;

    const ensureMaskElements = () => {
        if (maskTop && maskBottom) return;
        maskTop = document.createElement('div');
        maskTop.className = 'a11y-reading-mask a11y-reading-mask--top';
        maskBottom = document.createElement('div');
        maskBottom.className = 'a11y-reading-mask a11y-reading-mask--bottom';
        document.body.append(maskTop, maskBottom);
    };

    const moveMask = (event) => {
        if (!maskTop || !maskBottom) return;
        const y = typeof event.clientY === 'number' ? event.clientY : window.innerHeight / 2;
        const height = window.innerHeight;
        const band = BAND_HEIGHT;
        const topHeight = Math.min(height, Math.max(0, y - band / 2));
        const bottomHeight = Math.max(0, height - topHeight - band);
        maskTop.style.height = `${topHeight}px`;
        maskBottom.style.height = `${bottomHeight}px`;
    };

    const updateReadingMask = () => {
        if (settings.readingMask) {
            ensureMaskElements();
            moveMask({ clientY: window.innerHeight / 2 });
            document.addEventListener('mousemove', moveMask);
        } else if (maskTop && maskBottom) {
            document.removeEventListener('mousemove', moveMask);
            maskTop.remove();
            maskBottom.remove();
            maskTop = null;
            maskBottom = null;
        }
    };

    /* ===== Pembaca teks (text-to-speech) ===== */

    const synth = window.speechSynthesis || null;
    const ttsSupported = () => Boolean(synth && typeof SpeechSynthesisUtterance === 'function');

    const pauseLabel = () => widget.querySelector('[data-a11y-tts-pause-label]');
    let ttsPaused = false;

    const updatePauseLabel = () => {
        const label = pauseLabel();
        if (label) label.textContent = ttsPaused ? 'Lanjut' : 'Jeda';
    };

    const stopSpeech = () => {
        if (ttsSupported()) synth.cancel();
        ttsPaused = false;
        updatePauseLabel();
    };

    const speak = (text, { announceRead = true } = {}) => {
        if (!ttsSupported()) {
            announce('Pembaca teks tidak didukung browser ini.');
            return;
        }

        const clean = String(text || '').replace(/\s+/g, ' ').trim();
        if (!clean) {
            announce('Tidak ada teks untuk dibacakan.');
            return;
        }

        stopSpeech();

        const utterance = new SpeechSynthesisUtterance(clean.slice(0, 12000));
        utterance.lang = 'id-ID';
        utterance.rate = settings.ttsRate;

        const voices = synth.getVoices ? synth.getVoices() : [];
        const voice = voices.find((item) => (item.lang || '').toLowerCase().startsWith('id'));
        if (voice) utterance.voice = voice;

        utterance.onend = () => {
            ttsPaused = false;
            updatePauseLabel();
        };

        ttsPaused = false;
        updatePauseLabel();
        synth.speak(utterance);

        if (announceRead) announce('Membacakan teks...');
    };

    const selectedText = () => {
        const selection = window.getSelection ? String(window.getSelection()) : '';
        return selection.trim();
    };

    const readContent = () => {
        const selection = selectedText();
        if (selection) {
            speak(selection);
            return;
        }

        const main = document.getElementById('main-content') || document.querySelector('main');
        if (main) {
            speak(main.innerText || main.textContent);
            return;
        }

        speak(document.body.innerText);
    };

    const togglePause = () => {
        if (!ttsSupported()) {
            announce('Pembaca teks tidak didukung browser ini.');
            return;
        }

        if (synth.paused) {
            synth.resume();
            ttsPaused = false;
            announce('Melanjutkan pembacaan.');
        } else if (synth.speaking) {
            synth.pause();
            ttsPaused = true;
            announce('Pembacaan dijeda.');
        } else {
            announce('Tidak ada pembacaan berjalan.');
        }
        updatePauseLabel();
    };

    const READABLE_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, figcaption, dt, dd, caption, summary';

    const handleSpokenClick = (event) => {
        if (!settings.speakOnClick) return;
        if (widget.contains(event.target)) return;
        if (event.target.closest('a, button, input, select, textarea, label, form, video, audio')) return;

        const element = event.target.closest(READABLE_SELECTOR);
        if (element) speak(element.textContent, { announceRead: false });
    };

    const handleAction = (action) => {
        switch (action) {
            case 'text-smaller':
                changeTextSize(-1);
                break;
            case 'text-larger':
                changeTextSize(1);
                break;
            case 'text-reset':
                settings.textSize = 'normal';
                announce('Ukuran teks dikembalikan ke normal.');
                break;
            case 'contrast':
                settings.highContrast = !settings.highContrast;
                announce(`Kontras tinggi ${settings.highContrast ? 'diaktifkan' : 'dinonaktifkan'}.`);
                break;
            case 'underline':
                settings.underlineLinks = !settings.underlineLinks;
                announce(`Garis bawah tautan ${settings.underlineLinks ? 'diaktifkan' : 'dinonaktifkan'}.`);
                break;
            case 'spacing':
                settings.textSpacing = !settings.textSpacing;
                announce(`Spasi teks ${settings.textSpacing ? 'diaktifkan' : 'dinonaktifkan'}.`);
                break;
            case 'cursor':
                settings.bigCursor = !settings.bigCursor;
                announce(`Kursor besar ${settings.bigCursor ? 'diaktifkan' : 'dinonaktifkan'}.`);
                break;
            case 'motion':
                settings.reduceMotion = !settings.reduceMotion;
                announce(`Pengurangan animasi ${settings.reduceMotion ? 'diaktifkan' : 'dinonaktifkan'}.`);
                break;
            case 'font':
                settings.dyslexiaFont = !settings.dyslexiaFont;
                announce(`Font ramah disleksia ${settings.dyslexiaFont ? 'diaktifkan' : 'dinonaktifkan'}.`);
                break;
            case 'grayscale':
                settings.grayscale = !settings.grayscale;
                announce(`Warna satu nada ${settings.grayscale ? 'diaktifkan' : 'dinonaktifkan'}.`);
                break;
            case 'images':
                settings.hideImages = !settings.hideImages;
                announce(`Penyembunyian gambar ${settings.hideImages ? 'diaktifkan' : 'dinonaktifkan'}.`);
                break;
            case 'mask':
                settings.readingMask = !settings.readingMask;
                announce(`Kaca baca ${settings.readingMask ? 'diaktifkan' : 'dinonaktifkan'}.`);
                break;
            case 'speak-click':
                settings.speakOnClick = !settings.speakOnClick;
                announce(`Baca saat diklik ${settings.speakOnClick ? 'diaktifkan' : 'dinonaktifkan'}.`);
                break;
            case 'tts-read':
                readContent();
                break;
            case 'tts-pause':
                togglePause();
                break;
            case 'tts-stop':
                stopSpeech();
                announce('Pembacaan dihentikan.');
                break;
            case 'reset-all':
                stopSpeech();
                settings = { ...defaults };
                announce('Semua pengaturan aksesibilitas dikembalikan ke awal.');
                break;
            default:
                return;
        }

        applySettings();
        saveSettings();
    };

    toggle.addEventListener('click', () => {
        setPanelOpen(panel.hidden);
    });

    closeButton.addEventListener('click', () => setPanelOpen(false));

    panel.addEventListener('click', (event) => {
        const rateButton = event.target.closest('[data-a11y-rate]');
        if (rateButton) {
            const rate = Number(rateButton.dataset.a11yRate);
            if (!ttsRates.includes(rate)) return;
            settings.ttsRate = rate;
            announce(`Kecepatan pembacaan ${rateLabels[rate]}.`);
            applySettings();
            saveSettings();
            return;
        }

        const button = event.target.closest('[data-a11y-action]');
        if (button) handleAction(button.dataset.a11yAction);
    });

    panel.addEventListener('keydown', (event) => {
        if (event.key !== 'Tab' || panel.hidden) return;

        const controls = focusableControls();
        if (!controls.length) return;

        const first = controls[0];
        const last = controls[controls.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !panel.hidden) setPanelOpen(false);
    });

    document.addEventListener('click', (event) => {
        if (panel.hidden || widget.contains(event.target)) return;
        setPanelOpen(false, false);
    });

    document.addEventListener('click', handleSpokenClick);

    window.addEventListener('beforeunload', stopSpeech);

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') stopSpeech();
    });

    loadSettings();
    applySettings();
})();
