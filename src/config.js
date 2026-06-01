/* Voice Clipboard — 설정 및 상수 (전역 네임스페이스 VC.config) */
(function () {
    'use strict';

    const VC = (window.__VC = window.__VC || {});

    const VER = '7.0.0';

    const TIMING = {
        SILENCE_MS: 4000,   // 무음 자동 종료
        HIDE_MS: 4000,      // 플로팅 UI 자동 숨김
        LONGPRESS_MS: 1000, // 길게 눌러 언어 메뉴
        SHOW_DELAY_MS: 50,  // mousedown 후 위치 계산 지연
        POLL_MS: 400        // 녹음 중에만 동작하는 보조 폴링
    };

    const LANGS = [
        { code: 'ko-KR', label: 'KO', start: '🎤 녹음 시작', silence: '🔇 4초 무음 → 자동 종료', noSpeech: '🔇 음성이 감지되지 않았습니다' },
        { code: 'en-US', label: 'EN', start: '🎤 Recording started', silence: '🔇 4s silence → auto stop', noSpeech: '🔇 No speech detected' },
        { code: 'ja-JP', label: 'JA', start: '🎤 録音開始', silence: '🔇 4秒無音 → 自動終了', noSpeech: '🔇 音声が検出されませんでした' },
        { code: 'zh-CN', label: 'ZH', start: '🎤 开始录音', silence: '🔇 4秒无声 → 自动停止', noSpeech: '🔇 未检测到语音' },
        { code: 'es-ES', label: 'ES', start: '🎤 Grabación iniciada', silence: '🔇 4s silencio → parada auto', noSpeech: '🔇 No se detectó voz' },
        { code: 'fr-FR', label: 'FR', start: '🎤 Enregistrement démarré', silence: '🔇 4s silence → arrêt auto', noSpeech: '🔇 Aucune voix détectée' },
        { code: 'de-DE', label: 'DE', start: '🎤 Aufnahme gestartet', silence: '🔇 4s Stille → auto Stopp', noSpeech: '🔇 Keine Sprache erkannt' }
    ];

    // 대소문자 무시 치환 사전 (키는 정규식 메타문자를 escape 하여 안전하게 사용)
    const CUSTOM_DICT = {
        'chat gpt': 'ChatGPT', '챗 지피티': 'ChatGPT',
        '유튜브': 'YouTube', '자바스크립트': 'JavaScript',
        '타입스크립트': 'TypeScript'
    };

    // 동적 검색창 등 activeElement 추적이 어려운 사이트 보조 셀렉터
    const SITE_SELECTORS = [
        'input#query', 'input[name="query"]', 'input.search_input',
        'textarea[name="q"]', 'input[name="q"]',
        'input[title="검색"]', 'input[title="Search"]',
        'input[aria-label="검색"]', 'input[type="search"]',
        'textarea[aria-label="Search"]'
    ];

    VC.config = { VER, TIMING, LANGS, CUSTOM_DICT, SITE_SELECTORS };
})();
