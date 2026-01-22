# 🎉 LumiFlow v2.3.1 Released!

**Release Date:** January 22, 2026

This is a **bug fix release** that resolves critical issues preventing the extension from loading and improves the COPY ALL user experience.

---

## 🚨 Critical Fixes

### Fixed: Extension Crash on Load
**Issue:** Extension failed to load with error: `ReferenceError: Cannot access 'PLATFORMS' before initialization`

**Solution:** Moved `PLATFORMS` constant definition before all function calls

**Impact:** ✅ Extension now loads correctly on all platforms (ChatGPT, Claude, Gemini)

---

### Fixed: COPY ALL Feature Broken
**Issue:** COPY ALL failed with error: `ReferenceError: sleep is not defined`

**Solution:** Added missing `sleep()` utility function to `popup.js`

**Impact:** ✅ COPY ALL and API compression now work without errors

---

## ✨ UX Improvement

### COPY ALL: No More Confirmation Dialogs!

**Before v2.3.1:**
```
Click COPY ALL → Dialog: "Replace existing segments?" → Choose Yes/No
```

**Now in v2.3.1:**
```
Click COPY ALL → ✓ Automatically appends to preview area (no dialogs!)
```

**Benefits:**
- ⚡ Faster workflow - one-click operation
- 🔗 Multi-conversation merging - collect from multiple chats seamlessly
- 📦 Incremental backup - append new content without losing old segments
- 🛡️ No accidental overwrites

**Success Message Updated:**
```
Before: "Success! 12 msgs captured & cleaned."
Now:    "✓ Added! 12 msgs → Segment 3 (5420 chars)"
```

Now you can see exactly which segment was added and how many total segments you have!

---

## 🔍 Developer Experience

### Enhanced Console Logging

Added detailed logging for debugging:

**Content Script (content.js):**
- `[GET_CONVERSATION]` - Platform detection and extraction status
- `[EXTRACT]` - Message count and platform-specific diagnostics
- Platform health check with validation results

**Popup (popup.js):**
- `[API_COMPRESS]` - API compression flow tracking
- `[COPY_ALL]` - Operation status and segment count

**Background Service Worker (background.js):**
- `[GEMINI]` - Request size and response logging
- Enhanced error messages for failed API calls

**Result:** Easier to diagnose issues and report bugs!

---

## 📚 New Documentation

### TROUBLESHOOTING.md Added!

New comprehensive troubleshooting guide covers:
- ❌ "Failed to capture conversation" errors
- 🔍 Platform detection issues
- 🏗️ DOM selector updates (when AI platforms change their UI)
- 💻 Console diagnostic commands
- 📝 How to report issues

---

## 🧪 Tested On

✅ **Chrome** (v131+)
✅ **Edge** (Chromium-based)
✅ **Claude.ai** - Message extraction working
✅ **ChatGPT (chatgpt.com)** - Message extraction working
✅ **Gemini** - Lazy loading scroll fix working

---

## 📦 Installation

### Method 1: From GitHub (Recommended)

```bash
git clone https://github.com/lumihelia/lumiflow.git
cd lumiflow
```

Then load in Chrome:
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `lumiflow` folder

### Method 2: Download ZIP

1. Download `LumiFlow-v2.3.1.zip` from [Releases](https://github.com/lumihelia/lumiflow/releases)
2. Extract to a folder
3. Load in Chrome as above

---

## 🔄 Upgrading from v2.3.0

1. **Reload Extension**
   - Go to `chrome://extensions/`
   - Find LumiFlow
   - Click the reload icon 🔄

2. **Refresh AI Chat Pages**
   - Press F5 or Cmd+R on ChatGPT/Claude/Gemini tabs

3. **Test COPY ALL**
   - Try clicking COPY ALL button
   - Should see: `✓ Added! X msgs → Segment Y (Z chars)`
   - No confirmation dialogs!

**Data Safety:** ✅ All your existing segments are preserved during the upgrade

---

## 🐛 Known Issues

None at this time! 🎉

If you find any bugs, please report them at:
👉 https://github.com/lumihelia/lumiflow/issues

---

## 🙏 Thank You!

Special thanks to our early adopters who reported the `PLATFORMS` and `sleep()` bugs!

Your feedback helps make LumiFlow better for everyone 💙

---

## 📊 Changelog Summary

| Category | Changes |
|----------|---------|
| **Bug Fixes** | Fixed PLATFORMS error, Fixed sleep() error |
| **Features** | COPY ALL auto-append (no dialogs) |
| **UX** | Improved success messages with segment count |
| **Dev** | Enhanced console logging across all files |
| **Docs** | Added TROUBLESHOOTING.md |

---

## 🔗 Links

- **Documentation:** [USER_GUIDE_CN.md](USER_GUIDE_CN.md) \| [USER_GUIDE_EN.md](USER_GUIDE_EN.md)
- **Troubleshooting:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Full Changelog:** [CHANGELOG_v2.3.1.md](CHANGELOG_v2.3.1.md)
- **GitHub:** https://github.com/lumihelia/lumiflow
- **Issues:** https://github.com/lumihelia/lumiflow/issues

---

**Enjoy using LumiFlow v2.3.1! 🚀**

*Built with ❤️ by [@LumiHelia](https://github.com/lumihelia)*
