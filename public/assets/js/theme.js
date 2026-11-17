'use strict';

(() => {
    const root = document.documentElement;
    const storageKey = 'mc-theme';
    const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const systemTheme = () => (media && media.matches ? 'dark' : 'light');

    const savedTheme = () => {
        try {
            const value = window.localStorage.getItem(storageKey);
            return value === 'light' || value === 'dark' ? value : null;
        } catch (error) {
            return null;
        }
    };

    const currentTheme = () => {
        const active = root.getAttribute('data-theme');
        if (active === 'light' || active === 'dark') return active;
        return savedTheme() || systemTheme();
    };

    const paint = (theme) => {
        const isDark = theme === 'dark';

        root.setAttribute('data-theme', theme);
        root.style.colorScheme = theme;

        document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
            button.setAttribute('aria-pressed', String(isDark));
            button.setAttribute('aria-label', isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap');
            button.setAttribute('title', isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap');

            const label = button.querySelector('[data-theme-label]');
            if (label) label.textContent = isDark ? 'Mode terang' : 'Mode gelap';
        });

        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', isDark ? '#07121e' : '#0b2e4f');
    };

    const setTheme = (theme) => {
        paint(theme);
        try {
            window.localStorage.setItem(storageKey, theme);
        } catch (error) {
            // Preferensi tetap berlaku untuk sesi ini.
        }
    };

    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
        button.addEventListener('click', () => {
            setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
        });
    });

    paint(currentTheme());

    const followSystem = () => {
        if (!savedTheme()) paint(systemTheme());
    };

    if (media && typeof media.addEventListener === 'function') {
        media.addEventListener('change', followSystem);
    } else if (media && typeof media.addListener === 'function') {
        media.addListener(followSystem);
    }
})();
