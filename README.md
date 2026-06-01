# Voice Clipboard

Click any text field, speak, and your words appear instantly.

## Features
- Voice-to-text input for any `<input>`, `<textarea>`, or contenteditable element
- 7 languages supported: Korean, English, Japanese, Chinese, Spanish, French, German
- Floating mic button + `Ctrl+Shift+V` shortcut
- Auto-stop after 4 seconds of silence
- Long-press mic to switch language (radial menu)
- Zero data collection, zero network requests, zero storage

## How It Works
Voice Clipboard uses the browser's built-in Web Speech API (`window.SpeechRecognition`). No audio or text ever leaves your machine through this extension.

## Permissions
- **`https://*/*` content script match**: Required so the floating mic button can appear on any secure page with a text field. The Web Speech API only works in secure (HTTPS) contexts, so HTTP pages are intentionally excluded.

The extension does **not** request `storage`, `tabs`, `cookies`, `history`, `webRequest`, or any host permission beyond content script injection.

## Privacy
See [Privacy Policy](https://lordofwins.github.io/voice-clipboard-ext/privacy.html).

## Installation (Development)
1. Clone this repo
2. Chrome -> `chrome://extensions`
3. Enable Developer mode
4. Load unpacked -> select the repo folder

## Build for Chrome Web Store
```bash
# Exclude dev files from the upload ZIP
zip -r voice-clipboard-v7.0.0.zip . \
  -x "*.git*" "docs/*" "*.md" "*.zip" ".gitignore" "node_modules/*" ".DS_Store"
```

## License
MIT
