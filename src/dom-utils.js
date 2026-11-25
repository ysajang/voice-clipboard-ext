/* Voice Clipboard — DOM 유틸 (필드 탐지, 텍스트 삽입) VC.dom */
(function () {
    'use strict';

    const VC = (window.__VC = window.__VC || {});

    /* 확장이 만든 엘리먼트인지 */
    function ours(el) {
        if (!el) return false;
        const id = el.id || '';
        if (id.startsWith('vc-')) return true;
        if (el.classList && el.classList.contains('vc-lang-btn')) return true;
        return false;
    }

    /* 입력 가능한 필드인지 */
    function isInput(el) {
        if (!el || ours(el)) return false;
        const tag = (el.tagName || '').toUpperCase();
        if (tag === 'TEXTAREA') return true;
        if (tag === 'INPUT') {
            const t = (el.type || 'text').toLowerCase();
            return ['text', 'search', 'email', 'url', 'tel', 'number', 'password', ''].includes(t);
        }
        if (el.isContentEditable) return true;
        const role = (el.getAttribute && el.getAttribute('role') || '').toLowerCase();
        return ['textbox', 'combobox', 'searchbox'].includes(role);
    }

    const DEEP_SEL =
        'input[type="text"],input[type="search"],input[type="email"],' +
        'input[type="url"],input[type="tel"],input[type="number"],' +
        'input[type="password"],input:not([type]),textarea,' +
        '[contenteditable="true"],[role="textbox"],[role="combobox"],[role="searchbox"]';

    /* 클릭 지점 기준으로 상/하/형제까지 탐색해 입력 필드 찾기 */
    function resolve(el) {
        if (!el) return null;
        if (isInput(el)) return el;

        let p = el;
        for (let i = 0; i < 8; i++) {
            p = p.parentElement;
            if (!p) break;
            if (isInput(p)) return p;
        }
        const child = el.querySelector && el.querySelector(DEEP_SEL);
        if (child && isInput(child)) return child;

        if (el.parentElement) {
            const sib = el.parentElement.querySelector && el.parentElement.querySelector(DEEP_SEL);
            if (sib && isInput(sib)) return sib;
        }
        return null;
    }

    /* 클릭 직속 탐색 (얕은 탐색) */
    function directFind(el) {
        if (!el) return null;
        if (isInput(el)) return el;
        const child = el.querySelector && el.querySelector('input,textarea,[contenteditable="true"]');
        if (child && isInput(child)) return child;
        return null;
    }

    /* 마이크 버튼을 띄울 가치가 있는 필드인지 (작은 input 제외) */
    const MIN_INPUT_W = 220;
    const MIN_INPUT_H = 32;

    function isWorthUI(el) {
        if (!el) return false;
        const tag = (el.tagName || '').toUpperCase();

        // 멀티라인 입력은 항상 노출 (긴 텍스트 = 본래 목적)
        if (tag === 'TEXTAREA') return true;
        if (el.isContentEditable) return true;

        const role = (el.getAttribute && el.getAttribute('role') || '').toLowerCase();
        if (role === 'textbox' && el.getAttribute('aria-multiline') === 'true') return true;

        // 단일라인 input/role 은 렌더링 크기로 판단
        const r = el.getBoundingClientRect();
        return r.width >= MIN_INPUT_W && r.height >= MIN_INPUT_H;
    }

    /* shadow DOM 관통 activeElement */
    function deepActiveElement() {
        let ae = document.activeElement;
        while (ae && ae.shadowRoot && ae.shadowRoot.activeElement) {
            ae = ae.shadowRoot.activeElement;
        }
        return ae;
    }

    /* 정규식 메타문자 escape */
    function escapeRegExp(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /* 사전 치환 */
    function applyDict(text, dict) {
        let r = text;
        for (const key of Object.keys(dict)) {
            r = r.replace(new RegExp(escapeRegExp(key), 'gi'), dict[key]);
        }
        return r;
    }

    /* ── 텍스트 삽입 ──
       input/textarea : execCommand('insertText') → native setter
       contenteditable: 클립보드 붙여넣기 → (실패 시) Range 직접 삽입
       음성 결과가 연달아 들어와도 순서가 섞이지 않도록 큐로 직렬화한다. */
    const CLIP_RESTORE_MS = (VC.config && VC.config.TIMING && VC.config.TIMING.CLIP_RESTORE_MS) || 500;

    let insertChain = Promise.resolve();
    let savedClip = null;    // 복원 대기 중인 기존 클립보드 텍스트 (null = 아직 저장 안 함)
    let restoreTimer = null;

    /* 마지막 붙여넣기 후 잠시 뒤 사용자의 기존 클립보드 텍스트를 되돌린다 */
    function scheduleClipRestore() {
        clearTimeout(restoreTimer);
        restoreTimer = setTimeout(() => {
            const prev = savedClip;
            savedClip = null;
            if (prev) navigator.clipboard.writeText(prev).catch(() => { });
        }, CLIP_RESTORE_MS);
    }

    /* 클립보드에 쓰고 커서 위치에 붙여넣기. 성공 여부 반환 */
    async function pasteViaClipboard(el, text) {
        const cb = navigator.clipboard;
        if (!cb || !cb.writeText) return false;

        clearTimeout(restoreTimer);
        if (savedClip === null) {
            // 텍스트가 아닌 내용(이미지 등)이거나 읽기 실패면 '' → 복원하지 않음
            try { savedClip = (await cb.readText()) || ''; } catch (_) { savedClip = ''; }
        }

        let ok = false;
        try {
            await cb.writeText(text);
            el.focus();
            ok = document.execCommand('paste');
        } catch (_) {
            ok = false;
        }
        scheduleClipRestore();
        return ok;
    }

    /* contenteditable: Range 직접 삽입 (붙여넣기 실패 시 대체 경로) */
    function insertIntoEditable(el, text) {
        el.focus();
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(text));
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }

    /* input / textarea */
    function insertIntoField(el, text) {
        el.focus();

        // execCommand 우선 시도 (deprecated 이나 React 등 호환성 최상). 실패 시 native setter
        let ok = false;
        try { ok = document.execCommand('insertText', false, text); } catch (_) { ok = false; }
        if (ok) return;

        const proto = (el.tagName || '').toUpperCase() === 'TEXTAREA'
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;
        const desc = Object.getOwnPropertyDescriptor(proto, 'value');
        const nativeSetter = desc && desc.set;

        if (nativeSetter) {
            const start = el.selectionStart || 0;
            const end = el.selectionEnd || 0;
            const before = el.value.substring(0, start);
            const after = el.value.substring(end);
            nativeSetter.call(el, before + text + after);
            el.selectionStart = el.selectionEnd = start + text.length;
            el.dispatchEvent(new InputEvent('input', {
                bubbles: true, cancelable: true, inputType: 'insertText', data: text
            }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }

        el.value += text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    async function doInsert(el, text) {
        if (el.isContentEditable) {
            const ok = await pasteViaClipboard(el, text);
            if (!ok) insertIntoEditable(el, text);
            return;
        }
        insertIntoField(el, text);
    }

    /* 커서 위치에 텍스트 삽입 (호출 순서대로 처리, Promise 반환) */
    function insertText(el, text) {
        if (!el || !text) return Promise.resolve();
        insertChain = insertChain
            .then(() => doInsert(el, text))
            .catch((e) => { console.warn('[Voice Clipboard] insert failed:', e); });
        return insertChain;
    }

    VC.dom = { ours, isInput, isWorthUI, resolve, directFind, deepActiveElement, escapeRegExp, applyDict, insertText };
})();
