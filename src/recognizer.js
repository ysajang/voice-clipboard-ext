/* Voice Clipboard — 음성 인식 (SpeechRecognition 래퍼) VC.recognizer */
(function () {
    'use strict';

    const VC = (window.__VC = window.__VC || {});
    const { TIMING, CUSTOM_DICT } = VC.config;
    const dom = VC.dom;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    function createRecognizer(opts) {
        // opts: { getLang, getTarget, getLangMeta, onToast, onPreview, onClearPreview, onStateChange }
        let rec = null;
        let recording = false;
        let silenceTimer = null;

        function isSupported() { return !!SR; }
        function isRecording() { return recording; }

        function resetSilenceTimer() {
            clearTimeout(silenceTimer);
            silenceTimer = setTimeout(() => {
                if (recording) {
                    opts.onToast(opts.getLangMeta().silence);
                    stop();
                }
            }, TIMING.SILENCE_MS);
        }

        function build() {
            const r = new SR();
            r.continuous = true;
            r.interimResults = true;
            r.lang = opts.getLang();

            r.onresult = (e) => {
                resetSilenceTimer();
                let interim = '';
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    const t = e.results[i][0].transcript;
                    if (e.results[i].isFinal) {
                        const processed = dom.applyDict(t, CUSTOM_DICT);
                        const tgt = opts.getTarget();
                        if (tgt) dom.insertText(tgt, processed);
                        opts.onClearPreview();
                    } else {
                        interim += t;
                    }
                }
                if (interim) opts.onPreview(interim);
            };

            r.onspeechend = () => resetSilenceTimer();

            r.onerror = (e) => {
                if (e.error === 'no-speech') {
                    opts.onToast(opts.getLangMeta().noSpeech);
                } else if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                    opts.onToast('⚠️ 마이크 권한을 허용해주세요');
                    stop();
                } else if (e.error === 'aborted') {
                    // 정상 종료 흐름, 무시
                } else {
                    console.warn('[Voice Clipboard] recognition error:', e.error);
                }
            };

            // 엔진이 자동 종료되면 녹음 유지 상태일 때만 재시작
            r.onend = () => {
                if (recording) {
                    try { r.start(); } catch (_) { stop(); }
                }
            };

            return r;
        }

        function start() {
            if (recording) return false;
            const tgt = opts.getTarget();
            if (!tgt) { opts.onToast('⚠️ 입력 필드를 먼저 클릭하세요'); return false; }

            rec = build();
            recording = true;
            opts.onStateChange(true);
            opts.onToast(opts.getLangMeta().start);
            resetSilenceTimer();

            try {
                rec.start();
                return true;
            } catch (e) {
                opts.onToast('⚠️ 음성 인식 시작 실패');
                stop();
                return false;
            }
        }

        function stop() {
            recording = false;
            clearTimeout(silenceTimer);
            opts.onStateChange(false);
            opts.onClearPreview();
            if (rec) {
                try { rec.stop(); } catch (_) { }
                rec = null;
            }
        }

        // 언어 변경 시 진행 중이면 재시작
        function restartIfActive() {
            if (recording) {
                stop();
                setTimeout(start, 300);
            }
        }

        return { isSupported, isRecording, start, stop, restartIfActive };
    }

    VC.recognizer = { createRecognizer, supported: !!SR };
})();
