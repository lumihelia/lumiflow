# LumiFlow v2.3.1 - Bug Fixes & UX Improvements

**Release Date:** January 22, 2026

## 🐛 Critical Bug Fixes

### 1. Fixed ReferenceError: PLATFORMS not defined
**Issue:** Extension crashed on page load with `Cannot access 'PLATFORMS' before initialization`

**Root Cause:** `PLATFORMS` constant was defined after functions that used it

**Fix:** Moved `PLATFORMS` definition to top of `content.js` (line 65) before any function calls

**Impact:** Extension now loads correctly on all supported platforms

**Files Changed:**
- `content.js:65` - Moved PLATFORMS definition before validatePlatformSupport()

---

### 2. Fixed ReferenceError: sleep is not defined
**Issue:** COPY ALL feature failed with `sleep is not defined` error in popup.js:832

**Root Cause:** `sleep()` utility function was missing in `popup.js`

**Fix:** Added sleep function definition at end of popup.js

**Impact:** COPY ALL and API compression now work without errors

**Files Changed:**
- `popup.js:1538-1540` - Added sleep() utility function

---

## ✨ Feature Improvements

### 3. Improved COPY ALL Behavior
**Previous:** Prompted user to confirm replacement when segments already exist

**New:** Automatically appends new segment to preview area (no confirmation needed)

**Benefits:**
- ✅ Faster workflow - one-click operation
- ✅ Multi-conversation merging - collect from multiple chats
- ✅ Incremental capture - append new content without losing old
- ✅ No accidental overwrites

**User Message Updated:**
```
Before: "Success! 12 msgs captured & cleaned."
Now: "✓ Added! 12 msgs → Segment 3 (5420 chars)"
```

**Files Changed:**
- `popup.js:798-846` - Removed confirmation dialog, direct append logic

---

## 🔧 Developer Improvements

### 4. Enhanced Error Logging
**Added detailed console logging for debugging:**

**content.js:**
- `[GET_CONVERSATION]` - Platform detection and message extraction
- `[EXTRACT]` - Detailed extraction debugging with platform-specific diagnostics
- Platform health check on load with validation results

**popup.js:**
- `[API_COMPRESS]` - API compression flow tracking
- `[COPY_ALL]` - Copy All operation tracking

**background.js:**
- `[GEMINI]` - Request body size and API response logging
- Enhanced error messages for HTML error pages

**Files Changed:**
- `content.js:467-508` - Enhanced handleGetConversation logging
- `content.js:552-596` - Enhanced extractConversation logging
- `popup.js:137-161` - Enhanced API compression logging
- `popup.js:757-778` - Enhanced COPY ALL logging
- `background.js:63-93` - Enhanced Gemini API logging

---

## 📚 Documentation Updates

### 5. New Troubleshooting Guide
**Added:** `TROUBLESHOOTING.md` with common issues and solutions

**Covers:**
- "Failed to capture conversation" errors
- Platform detection issues
- DOM selector updates
- Console diagnostic commands
- How to report issues

---

## 🔍 Testing & Validation

**Platforms Tested:**
- ✅ Claude.ai - Message extraction working
- ✅ ChatGPT (chatgpt.com) - Message extraction working
- ✅ Gemini - Lazy loading scroll fix working

**Features Tested:**
- ✅ COPY ALL - Appends segments correctly
- ✅ API Compression - Gemini API working
- ✅ Manual Absorb - Text selection working
- ✅ Inject - Context injection working
- ✅ Keyboard Shortcuts - All shortcuts working

---

## 📝 Breaking Changes

**None** - This is a bug fix release with backward compatibility

---

## 🙏 Acknowledgments

Special thanks to the community for reporting the `PLATFORMS` and `sleep` bugs!

---

## 📦 Installation

### Chrome Web Store
Install from: [Chrome Web Store Link]

### Manual Installation
1. Download latest release from GitHub
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the LumiFlow folder

---

## 🔗 Links

- **GitHub:** https://github.com/lumihelia/lumiflow
- **Report Issues:** https://github.com/lumihelia/lumiflow/issues
- **User Guide:** See USER_GUIDE_EN.md or USER_GUIDE_CN.md

---

## 📊 Version History

- **v2.3.1** (2026-01-22) - Bug fixes & COPY ALL improvements
- **v2.3.0** (2026-01-21) - API compression & background.js support
- **v2.1.2** (2025-12-XX) - Gemini lazy loading fix
- **v2.0.0** (2025-11-XX) - Multi-platform support
