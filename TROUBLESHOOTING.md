# LumiFlow Troubleshooting Guide

## "Failed to capture the conversation" Error

### Quick Diagnosis Steps

1. **Open DevTools Console**
   - Right-click on the AI chat page → Inspect → Console tab
   - Look for messages starting with `[GET_CONVERSATION]`, `[EXTRACT]`, or `[LumiFlow]`

2. **Check Platform Detection**
   ```
   Look for: "[GET_CONVERSATION] Platform detected: [platform name]"
   Expected values: claude, chatgpt, gemini
   If you see: "unknown" → You're on an unsupported page
   ```

3. **Check Message Extraction**
   ```
   Look for: "[EXTRACT] Extracted X messages"
   If X = 0 → DOM selectors may be outdated (AI platform updated their UI)
   ```

### Common Causes & Fixes

#### 1. "No messages extracted" (messages.length = 0)

**Possible causes:**
- Platform UI changed (selectors outdated)
- Not on a conversation page (on homepage/settings/etc.)
- Page not fully loaded

**Fix:**
- Make sure you're on an active conversation page
- Try refreshing the page (F5 or Cmd+R)
- Check console for specific diagnostic info

#### 2. "No response from page. Try refreshing."

**Cause:** Content script not loaded properly

**Fix:**
- Refresh the page (F5 or Cmd+R)
- If still fails: Disable and re-enable the extension
- Last resort: Reinstall the extension

#### 3. Platform-Specific Issues

**Claude:**
```
Console should show: "Claude: Found X [data-test-render-count] elements"
If X = 0 → Claude changed their DOM structure
```

**ChatGPT:**
```
Console should show: "ChatGPT: Found X [data-message-author-role] elements"
If X = 0 → ChatGPT changed their DOM structure
```

**Gemini:**
```
Console should show: "Gemini: Found main element: true"
                    "Gemini: Found X message candidates"
If false or X = 0 → Gemini changed their DOM structure
```

### Advanced Debugging

#### Enable Verbose Logging

Open console and run:
```javascript
// See what selectors are being used
console.log('Testing Claude selectors...');
console.log('Containers:', document.querySelectorAll('[data-test-render-count]').length);
console.log('User msgs:', document.querySelectorAll('.font-user-message').length);
console.log('AI msgs:', document.querySelectorAll('.font-claude-message').length);

// Or for ChatGPT
console.log('ChatGPT msgs:', document.querySelectorAll('[data-message-author-role]').length);

// Or for Gemini
console.log('Gemini main:', !!document.querySelector('main'));
console.log('Gemini msgs:', document.querySelectorAll('[class*="message"]').length);
```

#### Test Message Extraction Manually

```javascript
// In the AI chat page console:
chrome.runtime.sendMessage(
  { action: 'ping' },
  () => console.log('Extension is active')
);

// Then test conversation extraction
chrome.runtime.sendMessage(
  { action: 'get_conversation' },
  (response) => console.log('Response:', response)
);
```

### Reporting Issues

If the problem persists, please report with:
1. AI platform (Claude/ChatGPT/Gemini)
2. Browser (Chrome/Edge/etc.) and version
3. Console logs (copy all `[LumiFlow]` and `[GET_CONVERSATION]` messages)
4. Screenshot of the AI chat page

Report at: https://github.com/lumihelia/lumiflow/issues
