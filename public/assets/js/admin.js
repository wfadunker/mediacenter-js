(function () {
    'use strict';

    var body = document.body;
    var sidebar = document.querySelector('[data-sidebar]');
    var overlay = document.querySelector('[data-sidebar-overlay]');
    var openButton = document.querySelector('[data-sidebar-open]');
    var collapseButton = document.querySelector('[data-sidebar-collapse]');
    var storageKey = 'hst_admin_sidebar';

    function storeState(value) {
        try { window.localStorage.setItem(storageKey, value); } catch (error) { /* storage unavailable */ }
    }

    function readState() {
        try { return window.localStorage.getItem(storageKey); } catch (error) { return null; }
    }

    function setMobileSidebar(open) {
        if (!sidebar) return;
        body.classList.toggle('is-sidebar-open', open);
        if (overlay) overlay.hidden = !open;
        if (openButton) openButton.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) {
            var focusable = sidebar.querySelector('a, button');
            if (focusable) focusable.focus();
        } else if (openButton) {
            openButton.focus();
        }
    }

    if (openButton) {
        openButton.addEventListener('click', function () {
            setMobileSidebar(!body.classList.contains('is-sidebar-open'));
        });
    }

    if (overlay) {
        overlay.addEventListener('click', function () { setMobileSidebar(false); });
    }

    if (collapseButton) {
        var collapsed = readState() === 'collapsed';
        body.classList.toggle('is-sidebar-collapsed', collapsed);
        collapseButton.setAttribute('aria-label', collapsed ? 'Perluas sidebar' : 'Perkecil sidebar');
        collapseButton.setAttribute('title', collapsed ? 'Perluas sidebar' : 'Perkecil sidebar');

        collapseButton.addEventListener('click', function () {
            var next = !body.classList.contains('is-sidebar-collapsed');
            body.classList.toggle('is-sidebar-collapsed', next);
            collapseButton.setAttribute('aria-label', next ? 'Perluas sidebar' : 'Perkecil sidebar');
            collapseButton.setAttribute('title', next ? 'Perluas sidebar' : 'Perkecil sidebar');
            storeState(next ? 'collapsed' : 'expanded');
        });
    }

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && body.classList.contains('is-sidebar-open')) {
            setMobileSidebar(false);
        }
    });

    document.querySelectorAll('[data-password-toggle]').forEach(function (button) {
        var input = button.closest('.input-wrap') && button.closest('.input-wrap').querySelector('[data-password-input]');
        if (!input) return;

        button.addEventListener('click', function () {
            var visible = input.getAttribute('type') === 'text';
            input.setAttribute('type', visible ? 'password' : 'text');
            button.setAttribute('aria-pressed', visible ? 'false' : 'true');
            button.setAttribute('aria-label', visible ? 'Tampilkan password' : 'Sembunyikan password');
            input.focus();
        });
    });

    var passwordInput = document.querySelector('[data-password-input]');
    var capsWarning = document.querySelector('[data-capslock]');

    if (passwordInput && capsWarning) {
        var updateCaps = function (event) {
            if (typeof event.getModifierState !== 'function') return;
            capsWarning.hidden = !event.getModifierState('CapsLock');
        };
        passwordInput.addEventListener('keydown', updateCaps);
        passwordInput.addEventListener('keyup', updateCaps);
        passwordInput.addEventListener('blur', function () { capsWarning.hidden = true; });
    }

    document.querySelectorAll('[data-image-input]').forEach(function (input) {
        var wrap = input.closest('.panel');
        var preview = wrap && wrap.querySelector('[data-image-preview]');
        var image = preview && preview.querySelector('[data-image-preview-img]');
        var empty = preview && preview.querySelector('[data-image-empty]');

        if (!preview || !image) return;

        input.addEventListener('change', function () {
            var file = input.files && input.files[0];
            input.setCustomValidity('');

            if (!file) {
                if (empty) empty.hidden = false;
                image.hidden = true;
                image.removeAttribute('src');
                return;
            }

            if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
                input.value = '';
                input.setCustomValidity('Format gambar hanya JPG, PNG, atau WebP.');
                input.reportValidity();
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                input.value = '';
                input.setCustomValidity('Ukuran gambar maksimal 2 MB.');
                input.reportValidity();
                return;
            }

            var reader = new FileReader();
            reader.onload = function (event) {
                image.src = event.target.result;
                image.hidden = false;
                if (empty) empty.hidden = true;
            };
            reader.readAsDataURL(file);
        });
    });

    var removeImage = document.querySelector('input[name="hapus_gambar"]');
    if (removeImage) {
        removeImage.addEventListener('change', function () {
            var preview = document.querySelector('[data-image-preview]');
            var image = preview && preview.querySelector('[data-image-preview-img]');
            var empty = preview && preview.querySelector('[data-image-empty]');
            if (!image) return;
            if (removeImage.checked) {
                image.hidden = true;
                if (empty) empty.hidden = false;
            } else if (image.getAttribute('src')) {
                image.hidden = false;
                if (empty) empty.hidden = true;
            }
        });
    }

    document.querySelectorAll('form[data-confirm]').forEach(function (form) {
        form.addEventListener('submit', function (event) {
            if (!window.confirm(form.getAttribute('data-confirm'))) {
                event.preventDefault();
            }
        });
    });

    // Sumber gambar pada halaman edit: unggah file atau tautan URL.
    (function () {
        var modes = document.querySelectorAll('[data-image-mode]');
        if (!modes.length) return;

        function setMode(mode) {
            modes.forEach(function (radio) {
                var label = radio.closest('label');
                if (label) label.classList.toggle('is-active', radio.checked);
            });
            document.querySelectorAll('[data-image-pane]').forEach(function (pane) {
                var active = pane.getAttribute('data-image-pane') === mode;
                pane.hidden = !active;
                pane.querySelectorAll('input, button').forEach(function (el) {
                    el.disabled = !active;
                });
            });
            if (mode === 'url') {
                var remove = document.querySelector('input[name="hapus_gambar"]');
                if (remove) remove.checked = false;
            }
        }

        modes.forEach(function (radio) {
            radio.addEventListener('change', function () { setMode(radio.value); });
        });
        var selectedMode = document.querySelector('[data-image-mode]:checked');
        setMode(selectedMode ? selectedMode.value : 'upload');

        var checkButton = document.querySelector('[data-image-url-check]');
        if (!checkButton) return;
        var urlInput = document.getElementById('gambar_url');
        var urlBox = document.querySelector('[data-image-url-box]');
        var urlImg = document.querySelector('[data-image-url-preview]');
        var urlMsg = document.querySelector('[data-image-url-msg]');

        function showMessage(text) {
            if (!urlMsg) return;
            urlMsg.textContent = text;
            urlMsg.hidden = false;
        }

        if (checkButton && urlInput && urlImg) {
            checkButton.addEventListener('click', function () {
                var value = urlInput.value.trim();
                if (!value) {
                    if (urlBox) urlBox.hidden = true;
                    urlImg.removeAttribute('src');
                    showMessage('Masukkan URL gambar terlebih dahulu.');
                    return;
                }
                checkButton.disabled = true;
                if (urlMsg) { urlMsg.textContent = 'Memeriksa gambar...'; urlMsg.hidden = false; }
                fetch(checkButton.getAttribute('data-image-url-check') + '?url=' + encodeURIComponent(value), {
                    credentials: 'same-origin'
                }).then(function (res) {
                    if (res.ok) {
                        if (urlMsg) urlMsg.hidden = true;
                        urlImg.src = checkButton.getAttribute('data-image-url-check') + '?url=' + encodeURIComponent(value) + '&t=' + Date.now();
                        if (urlBox) urlBox.hidden = false;
                        return null;
                    }
                    return res.json().then(function (data) {
                        showMessage((data && data.error) || 'Gambar tidak dapat dimuat dari tautan tersebut.');
                    }).catch(function () {
                        showMessage('Gambar tidak dapat dimuat dari tautan tersebut.');
                    });
                }).catch(function () {
                    showMessage('Tidak dapat menghubungi server untuk memeriksa gambar.');
                }).finally(function () {
                    checkButton.disabled = false;
                });
            });
        }
    })();

    document.querySelectorAll('[data-editor-form], [data-login-form]').forEach(function (form) {
        form.addEventListener('submit', function () {
            var button = form.querySelector('[data-submit]');
            if (!button) return;
            window.setTimeout(function () {
                button.disabled = true;
                button.setAttribute('aria-busy', 'true');
            }, 0);
        });
    });

    document.addEventListener('keydown', function (event) {
        if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
        var target = event.target;
        if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
        var search = document.getElementById('admin-search');
        if (search) {
            event.preventDefault();
            search.focus();
        }
    });

    // Penjaga sesi: memaksa login ulang saat sesi berakhir, dengan peringatan sebelum habis.
    (function () {
        var idleAt = Number(body.getAttribute('data-session-idle-at')) || 0;
        var maxAt = Number(body.getAttribute('data-session-max-at')) || 0;
        var loginUrl = body.getAttribute('data-session-login') || '';
        if (!idleAt || !maxAt || !loginUrl) return;

        var WARNING_MS = 120000, TICK_MS = 5000, SYNC_MS = 60000;
        var lastActivity = Date.now(), lastSyncAt = 0, timer = null, fast = false;

        var bar = document.createElement('div');
        bar.className = 'session-bar';
        bar.setAttribute('role', 'status');
        bar.setAttribute('aria-live', 'polite');
        var barText = document.createElement('span');
        barText.className = 'session-bar__text';
        var barIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        barIcon.setAttribute('viewBox', '0 0 24 24');
        barIcon.setAttribute('fill', 'none');
        barIcon.setAttribute('stroke', 'currentColor');
        barIcon.setAttribute('stroke-width', '1.8');
        barIcon.setAttribute('stroke-linecap', 'round');
        barIcon.setAttribute('aria-hidden', 'true');
        var barPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        barPath.setAttribute('d', 'M12 7v5l3 2M12 3a9 9 0 1 0 .01 0Z');
        barIcon.appendChild(barPath);
        bar.appendChild(barIcon);
        bar.appendChild(barText);
        document.body.appendChild(bar);

        function remaining() { return idleAt - Date.now(); }

        function fmt(ms) {
            var total = Math.max(0, Math.ceil(ms / 1000));
            var m = Math.floor(total / 60), s = total % 60;
            return m + ':' + (s < 10 ? '0' : '') + s;
        }

        function expired() {
            if (timer) { window.clearInterval(timer); timer = null; }
            bar.classList.remove('is-visible');
            window.location.replace(loginUrl + '?status=expired');
        }

        function sync() {
            lastSyncAt = Date.now();
            fetch(loginUrl + '/sesi', {
                credentials: 'same-origin',
                headers: { 'X-Requested-With': 'fetch' },
                cache: 'no-store'
            }).then(function (res) {
                if (res.status === 401) { expired(); return null; }
                if (!res.ok) return null;
                return res.json();
            }).then(function (data) {
                if (!data || !data.ok) return;
                idleAt = Number(data.idleUntil) || idleAt;
                maxAt = Number(data.maxAt) || maxAt;
            }).catch(function () { /* offline: countdown lokal tetap berjalan */ });
        }

        function tick() {
            var now = Date.now();
            if (maxAt && now >= maxAt - 1500) { expired(); return; }
            var left = remaining();
            if (left <= 0) { expired(); return; }

            if (left <= WARNING_MS) {
                bar.classList.add('is-visible');
                barText.textContent = 'Sesi berakhir dalam ' + fmt(left) +
                    ' karena tidak ada aktivitas. Simpan pekerjaan Anda atau gerakkan kursor untuk tetap masuk.';
                if (!fast) {
                    fast = true;
                    window.clearInterval(timer);
                    timer = window.setInterval(tick, 1000);
                }
            } else {
                bar.classList.remove('is-visible');
                if (fast) {
                    fast = false;
                    window.clearInterval(timer);
                    timer = window.setInterval(tick, TICK_MS);
                }
            }

            if (now - lastSyncAt >= SYNC_MS && lastActivity > lastSyncAt) sync();
        }

        function onActivity() {
            lastActivity = Date.now();
            if (bar.classList.contains('is-visible') && Date.now() - lastSyncAt >= 30000) sync();
        }

        ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach(function (evt) {
            document.addEventListener(evt, onActivity, { passive: true });
        });
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible') onActivity();
        });

        timer = window.setInterval(tick, TICK_MS);
        tick();
    })();
})();
