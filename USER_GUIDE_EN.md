# 📖 LumiFlow User Guide

Welcome to LumiFlow! This guide will get you up and running in 5 minutes.

---

## 🚀 Quick Start

### Step 1: Install the Extension

1. **Download LumiFlow**
   - Download the latest `LumiFlow.zip` from [GitHub Releases](https://github.com/lumihelia/lumiflow/releases)
   - Extract it to any folder

2. **Load into Chrome**
   - Open Chrome browser
   - Visit `chrome://extensions/`
   - Toggle "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the extracted `LumiFlow` folder

3. **Pin the Extension (Recommended)**
   - Click the puzzle icon 🧩 in the browser toolbar
   - Find LumiFlow and click the pin icon 📌
   - Now you can access LumiFlow anytime

✅ **Installation Complete!**

---

## 🎯 Core Concept

### What Problem Does LumiFlow Solve?

**Scenario A**: You've had 100+ messages with ChatGPT, the conversation is too long, and the AI starts "forgetting" things
→ LumiFlow compresses it into essentials, so you can start fresh

**Scenario B**: You're stuck in Claude and want to try ChatGPT, but don't want to re-explain everything
→ LumiFlow migrates your context seamlessly

**Scenario C**: You switch between multiple AI platforms and keep repeating the project background
→ LumiFlow lets AIs hand off to each other

---

## 🎮 Two Modes

LumiFlow has two working modes - choose based on your needs:

### Mode 1: Auto Mode - Recommended for Beginners

**Best For**: Quick compression of entire conversations

**Workflow**:
```
1. On ChatGPT/Claude/Gemini conversation page
2. Click LumiFlow icon
3. Click "COMPRESS" button
4. Wait 5-10 seconds (AI is compressing)
5. Done! Compressed content is saved
```

**Pros**:
- ✅ One-click, super fast
- ✅ AI automatically extracts key points
- ✅ Perfect for long conversations (100+ messages)

**Cons**:
- ⚠️ Requires API configuration (see below)
- ⚠️ Takes a few seconds to compress

---

### Mode 2: Manual Mode - Recommended for Advanced Users

**Best For**: Precise control over what to keep

**Workflow**:
```
1. Click LumiFlow icon
2. Switch to "Manual Mode"
3. Select important content on the page (drag with mouse)
4. Click "ABSORB" button
5. Repeat steps 3-4 for more content
6. Done! All selected content becomes cards
```

**Pros**:
- ✅ Precise control (only keep what you select)
- ✅ No API needed
- ✅ Instant (no delay)

**Cons**:
- ⚠️ Requires manual selection multiple times
- ⚠️ Better suited for shorter conversations

---

## 📦 Managing Segments (Content Cards)

In either mode, compressed/absorbed content becomes "Segments" (cards).

### What are Segments?

Each Segment is a card representing a piece of important content.

**You can**:
- 📝 **Edit**: Click the ✎ button on the right
- 🗑️ **Delete**: Click the × button on the right
- 🔄 **Reorder**: Drag the ⋮⋮ button to rearrange
- 👁️ **Expand/Collapse**: Click anywhere on the card

### Segments Preview Area

```
┌─────────────────────────────────┐
│ Checkpoint Segments          × │ ← Clear all
├─────────────────────────────────┤
│ ┌───────────────────────┐       │
│ │ Segment 1  ⋮⋮ ✎ ×   │       │
│ ├───────────────────────┤       │
│ │ Discussion about...   │       │
│ └───────────────────────┘       │
│                                 │
│ ┌───────────────────────┐       │
│ │ Segment 2  ⋮⋮ ✎ ×   │       │
│ ├───────────────────────┤       │
│ │ Current progress...   │       │
│ └───────────────────────┘       │
│                                 │
│ 2 segments, 1500 characters     │
└─────────────────────────────────┘
```

---

## 🚀 Inject to New Conversation (INJECT)

When you're ready to switch conversations:

### Steps:

1. **Open a New Conversation**
   - Can be a new chat on the same AI platform
   - Or a different AI platform (ChatGPT → Claude)

2. **Click INJECT Button**
   - The compressed content will appear in the input box

3. **Click Send**
   - The AI will read the context and continue seamlessly

### Smart Compression

If your Segments total length exceeds 800 characters, LumiFlow will:
- Check if API is configured
- **With API**: Auto-compress again (10:1 compression ratio)
- **Without API**: Show a prompt (you can choose to continue or cancel)

---

## ⚙️ Configure API (Optional)

With API configured, you can use Auto Mode and smart compression.

### Supported API Providers

- **Google Gemini** (Recommended: generous free tier)
- **OpenAI** (ChatGPT's API)
- **Anthropic** (Claude's API)

### Configuration Steps

1. **Click Settings Icon** ⚙️ (top right)

2. **Toggle "Enable API Compression"**

3. **Select API Provider**
   - Recommended for beginners: Gemini (most free quota)

4. **Enter API Key**
   - Gemini: Get it from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - OpenAI: Get it from [OpenAI Platform](https://platform.openai.com/api-keys)
   - Anthropic: Get it from [Anthropic Console](https://console.anthropic.com/)

5. **Click "Save API Settings"**

✅ **Configuration Complete! You can now use Auto Mode**

### Privacy Note

- ✅ API Key is only stored in your browser locally
- ✅ Never sent to our servers (we don't have servers)
- ✅ Only used to call the respective API during compression

---

## 📋 Complete Usage Examples

### Example 1: Same Platform, New Chat (Conversation Too Long)

```
Scenario: 200+ messages in ChatGPT, AI starts giving irrelevant answers

1. Click LumiFlow icon
2. Mode: Auto Mode
3. Click "COMPRESS"
4. Wait 5 seconds (compressing)
5. Click "New chat" in ChatGPT (top right)
6. Click LumiFlow icon
7. Click "INJECT"
8. Click "Send"
9. ✅ AI continues the previous topic, no more confusion
```

---

### Example 2: Cross-Platform Migration (ChatGPT → Claude)

```
Scenario: Stuck in ChatGPT, want to try Claude

1. On ChatGPT conversation page
2. Click LumiFlow icon
3. Switch to "Manual Mode"
4. Select the project background section
5. Click "ABSORB"
6. Select the current problem section
7. Click "ABSORB"
8. Select attempted solutions
9. Click "ABSORB"
10. Open Claude.ai, start new chat
11. Click LumiFlow icon
12. Click "INJECT"
13. Click "Send"
14. ✅ Claude receives full context, starts helping immediately
```

---

### Example 3: Multiple Selective Absorbs (Manual Mode)

```
Scenario: Long conversation, only want to keep specific parts

1. Switch to Manual Mode
2. Browse conversation, find first important part
3. Drag to select → Click "ABSORB"
4. Scroll down, find second part
5. Drag to select → Click "ABSORB"
6. Repeat until all important parts are selected
7. Preview area shows multiple Segment cards
8. Click cards to edit, delete, or reorder
9. When satisfied, go to new conversation and click "INJECT"
```

---

## 🎨 Advanced Tips

### Tip 1: Edit Segments

Found a segment not quite right after compression?
- Click the ✎ button
- Edit directly in the card
- Click ✓ to save

### Tip 2: Reorder Segments

Want to change the order?
- Hold down the ⋮⋮ button
- Drag to new position
- Release mouse

### Tip 3: Clear All Segments

Want to start fresh?
- Click × (Clear All) in the top right
- Confirm
- All Segments are cleared

### Tip 4: Copy All (Full Copy)

Want to copy the entire conversation text?
- Click "COPY ALL" button
- Entire conversation is scraped and copied to clipboard
- Can paste elsewhere (like Notion)

---

## ⚠️ Common Issues

### Q1: Button Click Has No Effect?

**Solution**:
1. Refresh the page (F5)
2. Click the button again
3. If still not working, check if you're on a supported platform (ChatGPT/Claude/Gemini)

---

### Q2: Auto Mode Keeps Loading?

**Possible Reasons**:
- AI platform responding slowly
- API configuration error

**Solution**:
1. Wait 30 seconds
2. If timeout, switch to Manual Mode
3. Manually send the compression prompt, then select AI's response and click ABSORB

---

### Q3: Content Doesn't Appear in Input Box After INJECT?

**Solution**:
1. First click the input box (to focus it)
2. Then click INJECT
3. If still not working, content is auto-copied to clipboard, manually paste (Ctrl+V / Cmd+V)

---

### Q4: Is My API Key Safe?

**Answer**:
- ✅ Completely safe
- API Key is only stored in your browser locally (chrome.storage.local)
- Never uploaded to any server
- Only used to call official APIs during compression

**Verification**:
- Code is fully open source, you can audit it
- Check in Browser DevTools → Application → Storage → Local Storage

---

### Q5: Why Does Copy All Only Copy Part of the Content?

**Fixed!**
- In the latest version (v2.1+), Copy All copies the full conversation
- If issues persist, refresh the page and retry

---

### Q6: Which AI Platforms Are Supported?

**Currently Supported**:
- ✅ ChatGPT (chat.openai.com, chatgpt.com)
- ✅ Claude (claude.ai)
- ✅ Gemini (gemini.google.com)

**Future Plans**:
- 🔜 Perplexity
- 🔜 You.com
- 🔜 Other platforms (suggestions welcome)

---

### Q7: Not Satisfied with Compression Quality?

**Method A**: Edit Segments
- Click the ✎ button
- Manually adjust content

**Method B**: Switch to Manual Mode
- Full manual control over what to keep

**Method C**: Customize Prompt (Advanced)
- Edit `DEFAULT_COMPRESSION_PROMPT` in `content.js`
- Reload extension

---

### Q8: Are There Usage Limits?

**No!**
- ✅ Unlimited ABSORB
- ✅ Unlimited COMPRESS
- ✅ Unlimited INJECT
- ✅ Completely free

---

## 🎯 Best Practices

### 1. When to Use Auto Mode?

✅ **Recommended Scenarios**:
- Very long conversations (100+ messages)
- Quick compression needed
- Trust AI's judgment

❌ **Not Recommended**:
- Conversation has lots of irrelevant content
- Need precise control over what to keep

---

### 2. When to Use Manual Mode?

✅ **Recommended Scenarios**:
- Only want to keep specific parts
- Conversation contains sensitive info (don't want to use API)
- Want full control

❌ **Not Recommended**:
- Conversation too long, manual selection is tedious

---

### 3. Compression Ratio Recommendations

**Target**:
- Original conversation: 10,000 words
- After compression: ~1,000 words (10:1 compression ratio)

**Experience**:
- If compressed result > 2,000 words, might not be refined enough
- If compressed result < 500 words, might have lost important info

---

### 4. Cross-Platform Migration Strategies

**ChatGPT → Claude**:
- Best for: Deeper analysis, long-text reasoning
- Compression focus: Keep facts, data, conclusions

**Claude → ChatGPT**:
- Best for: Code generation, rapid iteration
- Compression focus: Keep requirements, tech stack, constraints

**Claude/ChatGPT → Gemini**:
- Best for: Search, multimodal (images)
- Compression focus: Keep questions, attempted solutions

---

## 🆘 Need Help?

### Report Issues

Found a bug?
1. Visit [GitHub Issues](https://github.com/lumihelia/lumiflow/issues)
2. Click "New Issue"
3. Describe the problem (screenshots help)

### Feature Requests

Have a great idea?
1. Visit [GitHub Issues](https://github.com/lumihelia/lumiflow/issues)
2. Title: "Feature Request: xxx"
3. Describe your idea

### Contact Author

- **Twitter/X**: [@LumiHelia](https://x.com/LumiHelia)
- **Email**: (Check GitHub profile)

---

## 📚 Further Reading

### Technical Details

Want to understand how LumiFlow works?
- Read [README_OPENSOURCE.md](README_OPENSOURCE.md)
- Check the source code (fully open source)

### Compression Prompt Design

Curious about our compression algorithm?
- Read [COMPRESSION_PROMPT_V2.md](COMPRESSION_PROMPT_V2.md)
- Learn the "selective memory" philosophy

### Contribute Code

Want to help improve LumiFlow?
- Fork the repository
- Submit Pull Requests
- Join the open source community

---

## 🎉 Start Using LumiFlow!

You now know all of LumiFlow's features.

**Quick Recap**:
1. ✅ Install extension
2. ✅ Choose mode (Auto / Manual)
3. ✅ Compress/absorb content
4. ✅ Inject to new conversation
5. ✅ Continue working seamlessly

**Remember**:
- 💜 Completely free, no limits
- 🔒 Privacy-first, local storage
- 🌟 Open source, community-driven

---

<p align="center">
  <strong>Enjoy Seamless Cross-Platform AI Experience!</strong><br>
  Made with 💜 by <a href="https://x.com/LumiHelia">Helia</a>
</p>

---

**Version**: v2.1  
**Last Updated**: 2026-01-04  
**License**: AGPLv3
