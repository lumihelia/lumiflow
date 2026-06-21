# LumiFlow v2.3.1

**AI Context Manager** - Migrate conversations across AI platforms without losing your mind.

[![Version](https://img.shields.io/badge/version-2.3.1-blue.svg)](https://github.com/lumihelia/lumiflow/releases)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-brightgreen.svg)]()
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)

<p align="center">
  <img src="icons/icon128.png" alt="LumiFlow" width="128" height="128">
</p>

<p align="center">
  <strong>No usage limits. No tracking. 100% free.</strong>
</p>

---

## 🤔 The Problem

Every time you:
- Switch from ChatGPT to Claude (or vice versa)
- Start a new chat because the old one got too long
- Hit the context window limit

**You lose everything.**

Copy-pasting raw conversation history:
- ❌ Wastes tokens
- ❌ Confuses the AI
- ❌ Loses important context
- ❌ Causes hallucinations

---

## 💡 The Solution

LumiFlow treats your conversation as **structured data**, not raw text.

Instead of dumping 10,000 words, it:
1. **Compresses** your conversation 10:1 (using AI)
2. **Extracts** what matters (goals, decisions, examples)
3. **Injects** the checkpoint into a new session

**Result**: The new AI picks up exactly where you left off.

---

## ✨ Features

### 🆕 NEW in v2.3.1!
- ✨ **Improved COPY ALL** - Now appends segments automatically (no confirmation needed)
- 🐛 **Bug Fixes** - Fixed critical PLATFORMS and sleep() errors
- 📝 **Enhanced Logging** - Better debugging with detailed console messages
- 🔍 **Troubleshooting Guide** - New TROUBLESHOOTING.md with solutions

### 🎉 Features from v2.3
- 📤 **Export as Markdown/JSON** - One-click backup of all segments
- ⌨️ **Keyboard Shortcuts** - `Ctrl+Shift+C` to compress, `Ctrl+Shift+I` to inject
- 🌙 **Dark Mode** - Auto-detects system preference
- 📊 **Compression Stats** - See how much space you saved (e.g., "67% saved")
- 🔐 **API Key Security Warnings** - First-time dialog with security tips
- ⚡ **Chunked Processing** - No UI freeze on 1000+ message conversations
- 🔍 **Platform Health Check** - Auto-validates Gemini/Claude/ChatGPT compatibility

### 💎 Core Features
- ⏱️ **Progress Countdown** - Real-time timer during AI compression
- 💬 **User-Friendly Errors** - Clear guidance instead of technical codes
- 🔄 **8-Second Undo** - Accidentally cleared segments? Undo within 8 seconds!
- 🎴 **Segments UI** - Drag-and-drop cards for each topic
- 🤖 **Smart Compression** - API-powered 10:1 compression
- 🔀 **Cross-Platform** - ChatGPT, Claude, Gemini support
- 🔒 **Privacy First** - 100% local storage, no tracking
- ♾️ **No Limits** - Unlimited everything, forever free

---

## 🚀 Installation

### From Source (Recommended for now)

1. **Clone the repo**
   ```bash
   git clone https://github.com/lumihelia/lumiflow.git
   cd lumiflow
   ```

2. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `lumiflow` folder

3. **Configure API (Optional)**
   - Click the settings ⚙️ icon
   - Choose provider (Gemini/OpenAI/Anthropic)
   - Enter your API key
   - Save

---

## 📖 How to Use

### Manual Mode (Select & Absorb)

1. **Switch to Manual Mode**
   - Toggle the switch in the extension

2. **Select text from the conversation**
   - Highlight important parts

3. **Click ABSORB**
   - Each selection becomes a segment card

4. **Manage segments**
   - Drag to reorder
   - Click ✎ to edit
   - Click × to delete

5. **Go to new conversation**
   - Click INJECT
   - Compressed context appears in input box
   - Click Send

### Auto Mode (Full Compression)

1. **Switch to Auto Mode**

2. **Click COMPRESS**
   - Entire conversation is compressed
   - Saves as a segment

3. **Go to new conversation**
   - Click INJECT

---

## 🎨 Customization

### Compression Prompt

Want to customize how conversations are compressed?

Edit the prompt in `popup.js` (search for `compressionPrompt`).

Our default prompt focuses on:
- **Selective memory** (like humans)
- **10:1 compression ratio**
- **Preserving specifics** (numbers, names, examples)
- **Forgetting noise**

Feel free to experiment!

---

## 🛠️ Technical Details

### Architecture

```
┌─────────────────┐
│   Content Script │ ← Runs on AI platforms
│   (content.js)  │   (ChatGPT, Claude, Gemini)
└────────┬─────────┘
         │
         │ Messages
         │
┌────────▼─────────┐
│   Popup UI      │ ← Manages segments
│   (popup.js)    │   Shows preview
└────────┬─────────┘
         │
         │ API Calls
         │
┌────────▼─────────┐
│  Compression    │ ← Gemini/GPT-4/Claude
│  API            │   10:1 compression
└──────────────────┘
```

### Data Structure

Segments are stored as:
```javascript
{
  id: timestamp,
  content: "...",
  platform: "chatgpt|claude|gemini",
  collapsed: boolean
}
```

### Compression Algorithm

1. Detect language (Chinese vs. English)
2. Send to API with structured prompt
3. Extract: Goal, State, Decisions, Examples, Failures, Next Step
4. Return compressed checkpoint (~10% of original)

---

## 🤝 Contributing

We welcome contributions!

### Areas to Help

- **Platform support**: Add more AI platforms
- **Prompt optimization**: Improve compression quality
- **UI/UX**: Make it prettier
- **Bugs**: Fix issues

### Development

```bash
# Make changes
git checkout -b feature/your-feature

# Test locally
# (Load unpacked in chrome://extensions/)

# Submit PR
git push origin feature/your-feature
```

---

## ⚖️ License

**MIT** - permissive, open to commercial and closed-source use.

Use, modify, and redistribute LumiFlow's code freely, including in closed-source
or commercial projects. The only requirement is preserving the copyright notice
in [LICENSE](LICENSE).

---

## 🙏 Acknowledgments

Built with:
- Chrome Extension APIs
- Gemini 2.0 Flash / Gemini 3.0 pro / Claude Sonnet 4.5
- Lots of coffee ☕

Inspired by the frustration of losing context when switching AI platforms.

---

## 📬 Contact

- **Twitter/X**: [@LumiHelia](https://x.com/LumiHelia)
- **Issues**: [GitHub Issues](https://github.com/lumihelia/lumiflow/issues)

---

**Remember**: Your conversations are data. Treat them like code.

Structure them. Version them. Migrate them.

<p align="center">
  Made with 💜 by <a href="https://x.com/LumiHelia">Helia</a>
</p>
