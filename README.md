# LumiFlow

**AI Context Manager** - Migrate conversations across AI platforms without losing your mind.

<p align="center">
  <img src="icon128.png" alt="LumiFlow" width="128" height="128">
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

### 🎴 Segments UI
- Each topic becomes a **card**
- Drag to reorder
- Edit individually
- Delete what you don't need

### 🤖 Smart Compression
- API-powered compression (Gemini/GPT-4/Claude)
- Preserves: goals, decisions, examples, failed attempts
- Forgets: pleasantries, repetitive explanations, noise

### 🔀 Cross-Platform
- ChatGPT ✅
- Claude ✅
- Gemini ✅

### 🔒 Privacy First
- Everything runs locally
- No tracking
- No external servers (except your own API keys)

### ♾️ No Limits
- Unlimited compressions
- Unlimited injections
- Unlimited segments

---

## 🚀 Installation

### From Source (Recommended for now)

1. **Clone the repo**
   ```bash
   git clone https://github.com/yourusername/lumiflow.git
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

**AGPLv3** - Strictly enforced.

We believe in the open exchange of intelligence.

If you build upon LumiFlow's code or protocol, you **must**:
1. ✅ Open source your modifications
2. ✅ Use the same AGPLv3 license
3. ✅ Preserve copyright notices

**Closed-source forks are strictly prohibited.**

### Why AGPLv3?

We've seen too many open source projects get:
- Stolen by companies
- Wrapped in a paywall
- Sold as "premium" features

AGPLv3 prevents this. If you use our code, the community benefits.

---

## 🙏 Acknowledgments

Built with:
- Chrome Extension APIs
- Gemini 2.0 Flash / GPT-4 / Claude 3.5
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
