/* Voice Clipboard — 메인 오케스트레이션 VC.main */
(function () {
    'use strict';

    const VC = window.__VC;
    if (!VC || !VC.config || !VC.dom || !VC.ui || !VC.recognizer) {
        console.error('[Voice Clipboard] 모듈 로드 실패');
        return;
    }

    const { VER, TIMING, LANGS, SITE_SELECTORS } = VC.config;
    const dom = VC.dom;
    const ui = VC.ui;

    /* 이전 인스턴스 정리 */
    if (window.__vcStopRec) { try { window.__vcStopRec(); } catch (_) { } }
    window.__vcVer = VER;

    if (!VC.recognizer.supported) {
        console.warn('[Voice Clipboard] SpeechRecognition not supported');
        return;
    }

    /* ── 상태 ── */
    let currentLang = LANGS[0].code;
    let tgt = null;
    let userActive = false; // 사용자가 입력 필드와 상호작용을 시작했는지

    function getLangMeta() {
        return LANGS.find(l => l.code === currentLang) || LANGS[0];
    }

    /* ── recognizer 구성 ── */
    const recognizer = VC.recognizer.createRecognizer({
        getLang: () => currentLang,
        getLangMeta,
        getTarget: () => tgt,
        onToast: (m) => ui.showToast(m),
        onPreview: (t) => ui.showPreview(t),
        onClearPreview: () => ui.hidePreview(),
        onStateChange: (on) => {
            ui.setRecording(on);
            if (on) {
                handleNotionLock(true);
            } else {
                handleNotionLock(false);
                if (tgt) tgt.focus();
                ui.resetHideTimer();
            }
        }
    });

    ui.isRecordingRef = () => recognizer.isRecording();
    ui.onLangSelect = (code) => {
        currentLang = code;
        recognizer.restartIfActive();
    };
    window.__vcStopRec = () => recognizer.stop();

    /* ── Notion: 녹음 중 contentEditable 잠금 (커서 점프 방지) ── */
    function handleNotionLock(lock) {
        if (!location.hostname.includes('notion')) return;
        if (lock) {
            document.querySelectorAll('[contenteditable]').forEach(el => {
                if (el === tgt) return; // 대상은 유지
                el.setAttribute('data-vc-ce', el.getAttribute('contenteditable'));
                el.setAttribute('contenteditable', 'false');
            });
        } else {
            document.querySelectorAll('[data-vc-ce]').forEach(el => {
                el.setAttribute('contenteditable', el.getAttribute('data-vc-ce'));
                el.removeAttribute('data-vc-ce');
            });
        }
    }

    /* ── 입력 필드 감지: 이벤트 기반 ── */
    function setTarget(el) {
        if (!el) return;
        if (!dom.isWorthUI(el)) return;
        userActive = true;
        tgt = el;
        ui.showAt(el);
    }

    document.addEventListener('mousedown', (e) => {
        if (dom.ours(e.target)) return;
        const el = dom.directFind(e.target);
        if (el) {
            if (!dom.isWorthUI(el)) return;
            userActive = true;
            tgt = el;
            setTimeout(() => ui.showAt(el), TIMING.SHOW_DELAY_MS);
        }
    }, true);

    document.addEventListener('click', (e) => {
        if (dom.ours(e.target)) return;
        if (ui.langRingOpen && !ui.langRing.contains(e.target) && e.target !== ui.mic) {
            ui.closeLangRing();
        }
        const el = dom.directFind(e.target);
        if (el) setTarget(el);
    }, true);

    document.addEventListener('focusin', (e) => {
        if (dom.ours(e.target)) return;
        if (!userActive) return;
        if (dom.isInput(e.target)) setTarget(e.target);
        else {
            const el = dom.resolve(e.target);
            if (el) setTarget(el);
        }
    }, true);

    /* 포커스가 입력 필드 밖으로 나가면 사용자 활성 해제 (불필요한 폴링/표시 방지) */
    document.addEventListener('focusout', (e) => {
        if (dom.ours(e.target)) return;
        // 다음 포커스 대상 확인을 위해 지연
        setTimeout(() => {
            const ae = dom.deepActiveElement();
            if (!ae || ae === document.body || (!dom.isInput(ae) && !dom.ours(ae))) {
                if (!recognizer.isRecording()) userActive = false;
            }
        }, 0);
    }, true);

    /* ── 보조 폴링: 녹음 중에만 동작 (동적 검색창/shadow DOM 대응) ── */
    let lastPollEl = null;
    setInterval(() => {
        // 녹음 중이 아니면 폴링하지 않음 (상시 CPU 점유 제거)
        if (!recognizer.isRecording()) return;

        let ae = dom.deepActiveElement();
        if (ae && ae !== lastPollEl && ae !== document.body &&
            ae !== document.documentElement && !dom.ours(ae)) {
            if (dom.isInput(ae)) {
                lastPollEl = ae; tgt = ae;
                if (!ui.isShown() && dom.isWorthUI(ae)) ui.showAt(ae);
            } else {
                const el = dom.resolve(ae);
                if (el) { lastPollEl = el; tgt = el; if (!ui.isShown() && dom.isWorthUI(el)) ui.showAt(el); }
            }
        }

        for (const sel of SITE_SELECTORS) {
            try {
                const el = document.querySelector(sel);
                if (el && el === document.activeElement && el !== lastPollEl) {
                    lastPollEl = el; tgt = el;
                    if (!ui.isShown() && dom.isWorthUI(el)) ui.showAt(el);
                    break;
                }
            } catch (_) { }
        }
    }, TIMING.POLL_MS);

    /* ── 마이크 버튼 클릭 ── */
    ui.mic.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (ui.langRingOpen) return;
        if (recognizer.isRecording()) recognizer.stop();
        else recognizer.start();
    });

    /* ── 단축키 Ctrl+Shift+V ── */
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.code === 'KeyV') {
            e.preventDefault();
            if (recognizer.isRecording()) recognizer.stop();
            else recognizer.start();
        }
    });

    /* ── 스크롤/리사이즈 시 위치 재계산 ── */
    function reposition() {
        if (!tgt || !ui.isShown()) return;
        ui.showAt(tgt);
    }
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);

    /* ── 탭 숨김 시 녹음 중단 ── */
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && recognizer.isRecording()) recognizer.stop();
    });

    console.log(`[Voice Clipboard] v${VER} loaded ✅`);
})();
