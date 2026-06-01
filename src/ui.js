/* Voice Clipboard — UI (플로팅 버튼, 프리뷰, 토스트, 원형 언어메뉴) VC.ui */
(function () {
    'use strict';

    const VC = (window.__VC = window.__VC || {});
    const { TIMING, LANGS } = VC.config;

    /* 이전 버전 잔여 엘리먼트 제거 */
    ['vc-float', 'vc-preview', 'vc-toast', 'vc-lang-ring', 'vc-mic-iframe'].forEach(id => {
        const old = document.getElementById(id);
        if (old) old.remove();
    });

    const root = document.documentElement;

    /* ── Toast ── */
    const toast = document.createElement('div');
    toast.id = 'vc-toast';
    root.appendChild(toast);

    let toastTimer = null;
    function showToast(msg, ms = 2000) {
        toast.textContent = msg;
        toast.classList.add('vc-show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('vc-show'), ms);
    }

    /* ── Floating mic ── */
    const fl = document.createElement('div');
    fl.id = 'vc-float';

    const mic = document.createElement('button');
    mic.id = 'vc-mic';
    mic.type = 'button';
    mic.textContent = '🎤';
    mic.title = 'Voice Clipboard (Ctrl+Shift+V)\n1초 길게 누르면 언어 변경';
    fl.appendChild(mic);
    root.appendChild(fl);

    /* ── Preview ── */
    const preview = document.createElement('div');
    preview.id = 'vc-preview';
    root.appendChild(preview);

    /* ── 원형 언어 메뉴 ── */
    const langRing = document.createElement('div');
    langRing.id = 'vc-lang-ring';
    root.appendChild(langRing);

    let langRingOpen = false;
    let onLangSelect = null; // 콜백 주입

    LANGS.forEach((l, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'vc-lang-btn';
        btn.textContent = l.label;
        btn.dataset.code = l.code;
        if (i === 0) btn.classList.add('vc-lang-active');
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            langRing.querySelectorAll('.vc-lang-btn').forEach(b => b.classList.remove('vc-lang-active'));
            btn.classList.add('vc-lang-active');
            showToast('🌐 ' + l.label + ' 선택됨');
            if (typeof onLangSelect === 'function') onLangSelect(l.code);
            closeLangRing();
        });
        langRing.appendChild(btn);
    });

    function openLangRing() {
        const r = mic.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        langRing.style.setProperty('left', cx + 'px', 'important');
        langRing.style.setProperty('top', cy + 'px', 'important');

        const radius = 60;
        const total = LANGS.length;
        const startAngle = -90;
        langRing.querySelectorAll('.vc-lang-btn').forEach((btn, i) => {
            const angle = startAngle + (360 / total) * i;
            const rad = angle * Math.PI / 180;
            const x = Math.cos(rad) * radius;
            const y = Math.sin(rad) * radius;
            btn.style.setProperty('transform', `translate(${x}px, ${y}px)`, 'important');
            btn.style.setProperty('opacity', '1', 'important');
        });
        langRing.classList.add('vc-show');
        langRingOpen = true;
    }

    function closeLangRing() {
        langRing.querySelectorAll('.vc-lang-btn').forEach(btn => {
            btn.style.setProperty('transform', 'translate(0, 0)', 'important');
            btn.style.setProperty('opacity', '0', 'important');
        });
        setTimeout(() => langRing.classList.remove('vc-show'), 200);
        langRingOpen = false;
    }

    /* 길게 누르기 → 언어 메뉴 */
    let longPressTimer = null;
    mic.addEventListener('pointerdown', () => {
        longPressTimer = setTimeout(() => {
            openLangRing();
            longPressTimer = null;
        }, TIMING.LONGPRESS_MS);
    });
    function cancelLongPress() {
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    }
    mic.addEventListener('pointerup', cancelLongPress);
    mic.addEventListener('pointerleave', cancelLongPress);

    /* ── 위치 표시/숨김 ── */
    let hideTimer = null;
    let isRecordingRef = () => false; // 주입

    function showAt(el) {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;

        let left = rect.left - 40;
        let top = rect.top - 40;
        if (left < 4) left = rect.left + 4;
        if (top < 4) top = rect.top + 4;

        fl.style.setProperty('left', left + 'px', 'important');
        fl.style.setProperty('top', top + 'px', 'important');
        fl.classList.add('vc-show');

        preview.style.setProperty('left', rect.left + 'px', 'important');
        preview.style.setProperty('top', (rect.bottom + 6) + 'px', 'important');

        resetHideTimer();
    }

    function hide() {
        if (isRecordingRef()) return;
        if (langRingOpen) return;
        fl.classList.remove('vc-show');
        preview.classList.remove('vc-show');
    }

    function resetHideTimer() {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(hide, TIMING.HIDE_MS);
    }

    function isShown() {
        return fl.classList.contains('vc-show');
    }

    /* ── 프리뷰(중간 결과) ── */
    function showPreview(text) {
        preview.textContent = text;
        preview.classList.add('vc-show');
    }
    function hidePreview() {
        preview.classList.remove('vc-show');
    }

    /* ── 녹음 상태 시각 표시 ── */
    function setRecording(on) {
        if (on) { mic.classList.add('vc-rec'); mic.textContent = '⏹'; }
        else { mic.classList.remove('vc-rec'); mic.textContent = '🎤'; }
    }

    VC.ui = {
        mic, langRing,
        showToast, showAt, hide, resetHideTimer, isShown,
        showPreview, hidePreview, setRecording,
        openLangRing, closeLangRing,
        get langRingOpen() { return langRingOpen; },
        set onLangSelect(fn) { onLangSelect = fn; },
        set isRecordingRef(fn) { isRecordingRef = fn; }
    };
})();
