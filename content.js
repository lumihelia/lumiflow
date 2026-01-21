// content.js - LumiFlow v2.1.1
// ===================================
// Content script for AI chat platforms
// Only runs on claude.ai, chatgpt.com, gemini.google.com
// (controlled by manifest.json content_scripts.matches)
// ===================================

console.log("LumiFlow v2.3: Content script loaded on", window.location.hostname);

// 🆕 Platform health check on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', validatePlatformSupport);
} else {
    validatePlatformSupport();
}

function validatePlatformSupport() {
    const platform = detectPlatform();
    const inputField = findInputField();
    const sendButton = findSendButton();

    console.log('[LumiFlow] Platform health check:', {
        platform,
        hasInput: !!inputField,
        hasSendButton: !!sendButton
    });

    if (!inputField || !sendButton) {
        console.warn('[LumiFlow] ⚠️ Platform UI may have changed. Some features might not work.');
        console.warn('[LumiFlow] Missing:', {
            input: !inputField,
            sendButton: !sendButton
        });
    } else {
        console.log('[LumiFlow] ✅ Platform support validated');
    }
}

// ========================================
// DOMAIN PROTECTION (双重防护)
// ========================================
// 即使 manifest.json 被意外修改，也不会污染其他网站

const ALLOWED_DOMAINS = [
  'claude.ai',
  'chat.openai.com',
  'chatgpt.com',
  'gemini.google.com'
];

const currentDomain = window.location.hostname;
const isAllowedDomain = ALLOWED_DOMAINS.some(domain =>
  currentDomain === domain || currentDomain.endsWith('.' + domain)
);

if (!isAllowedDomain) {
  console.warn(`LumiFlow: 非目标网站 (${currentDomain})，已停止运行`);
  throw new Error('LumiFlow stopped - not a target AI platform');
}

// ========================================
// PLATFORMS
// ========================================

const PLATFORMS = {
  CLAUDE: 'claude',
  CHATGPT: 'chatgpt',
  GEMINI: 'gemini',
  UNKNOWN: 'unknown'
};

// ========================================
// COMPRESSION PROMPT
// ========================================

// 多语言检测函数
function detectConversationLanguage() {
  // 获取页面上的对话文本
  const pageText = document.body.innerText || '';

  const patterns = {
    chinese: /[\u4e00-\u9fa5]/g,
    japanese: /[\u3040-\u309f\u30a0-\u30ff]/g,
    korean: /[\uac00-\ud7af\u1100-\u11ff]/g,
    russian: /[\u0400-\u04ff]/g,
    arabic: /[\u0600-\u06ff]/g,
    thai: /[\u0e00-\u0e7f]/g,
    german: /[äöüßÄÖÜ]/g,
    french: /[àâçéèêëîïôûùüÿœæ]/gi,
    spanish: /[áéíóúüñ¿¡]/gi,
  };

  let maxLang = 'english';
  let maxCount = 0;

  for (const [lang, pattern] of Object.entries(patterns)) {
    const matches = pageText.match(pattern) || [];
    if (matches.length > maxCount) {
      maxCount = matches.length;
      maxLang = lang;
    }
  }

  if (maxCount < 20) return 'english';
  return maxLang;
}

function getLanguageInstruction() {
  const lang = detectConversationLanguage();

  const instructions = {
    chinese: "CRITICAL: 你的输出必须使用中文。",
    japanese: "CRITICAL: 出力は日本語でなければなりません。",
    korean: "CRITICAL: 출력은 한국어로 작성해야 합니다。",
    russian: "CRITICAL: Вывод должен быть на русском языке.",
    arabic: "CRITICAL: يجب أن يكون الناتج بالعربية.",
    thai: "CRITICAL: ผลลัพธ์ต้องเป็นภาษาไทย",
    german: "CRITICAL: Die Ausgabe muss auf Deutsch sein.",
    french: "CRITICAL: La sortie doit être en français.",
    spanish: "CRITICAL: La salida debe estar en español.",
    english: ""
  };

  return instructions[lang] || "";
}

// 获取完整的压缩 prompt（带语言指令）
function getCompressionPrompt() {
  const langInstruction = getLanguageInstruction();

  return `CONTEXT COMPRESSION TASK
${langInstruction}

You are helping me transition to a new chat session. Compress our conversation into a structured checkpoint.

CRITICAL: Analyze our ACTUAL conversation and fill in SPECIFIC details. Do NOT just repeat the template.

Your output MUST follow this EXACT format:

<<<CHECKPOINT_START>>>

1. Project Goal (10%)
[SPECIFIC "North Star" - what EXACTLY are we building?
BAD: "Building a Chrome extension"
GOOD: "LumiFlow v2.1 - Chrome extension for AI conversation compression and cross-platform context transfer"]

2. Current Status (30% - MOST IMPORTANT)
[Where are we RIGHT NOW? Focus on LATEST state.
- What is 100% verified/working? (with proof)
- What is currently broken/stuck? (with exact symptoms)
BAD: "Made progress on the project"
GOOD: "v2.1.2 works on ChatGPT/Claude. Gemini Copy All incomplete due to lazy loading - fixed by adding scrollToLoadAllMessages()"]

3. Immutable Decisions (20%)
[Constraints/principles we AGREED ON - do NOT re-discuss
- Include specific file names, function names, technical choices with REASONS
BAD: "Using an API"
GOOD: "Using background.js Service Worker to bypass CORS for Anthropic. manifest v3 required (v2 deprecated)."]

4. Pending Actions (25%)
[IMMEDIATE next steps in PRIORITY order. Be SPECIFIC.
BAD: "Fix bugs"
GOOD: "1. Test scrollToLoadAllMessages() on Gemini 2. Submit v2.1.2 to Chrome Store"]

5. Critical Context (15%)
[Essential details that would be PAINFUL to lose: file names, variable names, API endpoints, code snippets]

<<<CHECKPOINT_END>>>

RULES:
- Replace ALL placeholders with ACTUAL content from our conversation
- Use SPECIFIC terms: file names (content.js), functions (addSegment), versions (v2.1.2)
- AVOID vague phrases: "the system", "we decided", "the user wants"
- If 50+ messages: prioritize LATEST decisions, mark deprecated as [OLD→NEW]
- Include version numbers when relevant
- NO explanatory text or meta-commentary

SELF-CHECK before output:
□ Did I mention specific file/function names?
□ Can someone unfamiliar understand what we're building?
□ Did I avoid generic phrases?
□ Are next steps actionable with specific commands?
□ Did I focus on LATEST state?`;
}

// 注意：不再在模块加载时生成 prompt，而是在每次压缩时动态生成

// ========================================
// Message Listener
// ========================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("LumiFlow: Received message", request);

  if (request.action === "auto_compress") {
    handleAutoCompress(request, sendResponse);
    return true; // Keep channel open for async
  }

  if (request.action === "manual_absorb") {
    handleManualAbsorb(sendResponse);
    return true;
  }

  if (request.action === "inject") {
    handleInject(request.text, sendResponse);
    return true;
  }

  if (request.action === "get_stats") {
    handleGetStats(sendResponse);
    return true;
  }

  if (request.action === "get_conversation") {
    handleGetConversation(sendResponse);
    return true;
  }

  if (request.action === "keyboard_inject") {
    handleKeyboardInject(sendResponse);
    return true;
  }
});

// 🆕 Handle keyboard shortcut for inject
async function handleKeyboardInject(sendResponse) {
  try {
    // Get last checkpoint from storage
    const result = await chrome.storage.local.get(['segments']);
    const segments = result.segments || [];

    if (segments.length === 0) {
      console.log('[LumiFlow] No segments to inject');
      sendResponse({ status: 'error', message: 'No checkpoints available' });
      return;
    }

    // Combine all segments
    const text = segments
      .map(s => s.content.trim())
      .filter(content => content.length > 0)
      .join('\n\n');

    // Inject into input field
    const inputField = findInputField();
    if (!inputField) {
      sendResponse({ status: 'error', message: 'Input field not found' });
      return;
    }

    injectTextIntoField(inputField, text);
    sendResponse({ status: 'success', message: 'Context injected via keyboard shortcut' });
  } catch (error) {
    sendResponse({ status: 'error', message: error.message });
  }
}

// ========================================
// AUTO COMPRESS HANDLER
// ========================================

async function handleAutoCompress(request, sendResponse) {
  try {
    console.log('Starting auto-compression...');

    // Step 1: Find input field
    const inputField = findInputField();
    if (!inputField) {
      sendResponse({
        status: 'error',
        message: 'Could not find input field. Try manual mode or refresh the page.'
      });
      return;
    }

    // Step 2: Get compression prompt - 动态生成以获取正确的语言
    const prompt = request.customPrompt || getCompressionPrompt();
    console.log('[AUTO] Language detected, prompt generated');

    // Step 3: Inject prompt
    console.log('Injecting compression prompt...');
    injectTextIntoField(inputField, prompt);
    await sleep(500);

    // Step 4: Try to auto-send OR wait for user to send manually
    if (request.autoSend !== false) {
      const sendButton = findSendButton();
      if (sendButton) {
        console.log('[AUTO] Auto-sending via button...');
        sendButton.click();
      } else {
        console.log('[AUTO] Send button not found - user needs to send manually');
        // 对于 Gemini，尝试用 Enter 键发送
        const platform = detectPlatform();
        if (platform === PLATFORMS.GEMINI) {
          console.log('[AUTO] Trying Enter key for Gemini...');
          inputField.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        }
      }

      // Step 5: 无论发送方式如何，都等待 AI 响应
      console.log('[AUTO] Waiting for AI to generate checkpoint...');
      showWaitingIndicator();

      try {
        // Gemini 生成较慢，给更长时间
        const timeout = detectPlatform() === PLATFORMS.GEMINI ? 90000 : 60000;
        const response = await waitForAIResponse(timeout);

        console.log('[CONTENT] Got AI response, saving to storage...');

        const checkpointData = {
          checkpoint: response,
          timestamp: new Date().toISOString(),
          platform: detectPlatform()
        };

        chrome.storage.local.set({ 'lastCheckpoint': checkpointData }, () => {
          if (chrome.runtime.lastError) {
            console.error('[CONTENT] Storage error:', chrome.runtime.lastError);
            sendResponse({
              status: 'error',
              message: 'Failed to save checkpoint'
            });
            return;
          }

          console.log('[CONTENT] Checkpoint saved successfully!');
          console.log('[CONTENT] Length:', response.length, 'chars');

          sendResponse({
            status: 'success',
            checkpoint: response,
            timestamp: checkpointData.timestamp,
            platform: checkpointData.platform
          });
        });
      } catch (error) {
        console.error('[AUTO] Timeout waiting for response:', error.message);
        sendResponse({
          status: 'timeout',
          message: 'AI response timeout. Please select the response and use Manual Absorb.'
        });
      }
    } else {
      sendResponse({
        status: 'pending_send',
        message: 'Prompt injected. Click Send when ready.'
      });
    }

  } catch (error) {
    console.error('Auto-compress error:', error);
    sendResponse({
      status: 'error',
      message: error.message
    });
  }
}

// ========================================
// MANUAL ABSORB HANDLER
// ========================================

function handleManualAbsorb(sendResponse) {
  try {
    console.log('[CONTENT] Manual absorb handler called');

    // Get selected text
    const selection = window.getSelection().toString().trim();
    console.log('[CONTENT] Selection length:', selection.length);

    if (!selection || selection.length === 0) {
      console.warn('[CONTENT] No text selected');
      sendResponse({
        status: 'error',
        message: 'Please select some text first.'
      });
      return;
    }

    // Clean excessive newlines (reduce 3+ newlines to 2)
    // This fixes the large gap issue in Manual Absorb mode
    const cleanSelection = selection.replace(/\n{3,}/g, '\n\n');

    console.log('[CONTENT] First 100 chars:', cleanSelection.substring(0, 100));

    // Just return the selection, don't save yet (popup.js will handle saving)
    sendResponse({
      status: 'success',
      checkpoint: cleanSelection,
      platform: detectPlatform()
    });

  } catch (error) {
    console.error('[CONTENT] Manual absorb error:', error);
    sendResponse({
      status: 'error',
      message: error.message
    });
  }
}

// ========================================
// INJECT HANDLER
// ========================================

function handleInject(text, sendResponse) {
  try {
    const inputField = findInputField();

    if (!inputField) {
      // Fallback to clipboard
      navigator.clipboard.writeText(text).then(() => {
        sendResponse({
          status: 'clipboard',
          message: 'Input field not found. Text copied to clipboard.'
        });
      });
      return;
    }

    // Inject text
    injectTextIntoField(inputField, text);

    sendResponse({
      status: 'success',
      message: 'Context injected successfully!'
    });

  } catch (error) {
    sendResponse({
      status: 'error',
      message: error.message
    });
  }
}

// ========================================
// GET STATS HANDLER
// ========================================

function handleGetStats(sendResponse) {
  try {
    const platform = detectPlatform();
    const messages = extractConversation();
    const stats = getConversationStats(messages);

    sendResponse({
      status: 'success',
      platform: platform,
      stats: stats
    });

  } catch (error) {
    sendResponse({
      status: 'error',
      message: error.message
    });
  }
}
// ========================================
// GET CONVERSATION HANDLER (for API compression)
// ========================================

async function handleGetConversation(sendResponse) {
  try {
    const platform = detectPlatform();

    // Gemini 使用虚拟滚动/懒加载，需要先滚动到顶部加载所有消息
    if (platform === PLATFORMS.GEMINI) {
      console.log('[LumiFlow] Gemini detected, scrolling to load all messages...');
      await scrollToLoadAllMessages();
    }

    const messages = extractConversation();

    sendResponse({
      status: 'success',
      platform: platform,
      conversation: messages
    });

  } catch (error) {
    sendResponse({
      status: 'error',
      message: error.message
    });
  }
}

// Gemini 懒加载修复：滚动到顶部加载所有消息
async function scrollToLoadAllMessages() {
  return new Promise((resolve) => {
    // 找到对话容器
    const scrollContainer = document.querySelector('main') ||
      document.querySelector('[class*="conversation"]') ||
      document.body;

    let lastScrollTop = scrollContainer.scrollTop;
    let scrollAttempts = 0;
    const maxAttempts = 20; // 最多尝试 20 次

    const scrollUp = () => {
      // 滚动到顶部
      scrollContainer.scrollTo({ top: 0, behavior: 'instant' });

      scrollAttempts++;

      // 等待内容加载
      setTimeout(() => {
        const currentScrollTop = scrollContainer.scrollTop;

        // 如果已经到顶部或达到最大尝试次数
        if (scrollContainer.scrollTop === 0 || scrollAttempts >= maxAttempts) {
          console.log(`[LumiFlow] Scroll complete after ${scrollAttempts} attempts`);
          // 等待最后一批内容渲染
          setTimeout(resolve, 500);
        } else {
          scrollUp();
        }
      }, 200);
    };

    scrollUp();
  });
}

// ========================================
// PLATFORM DETECTION
// ========================================

function detectPlatform() {
  const hostname = window.location.hostname;

  if (hostname.includes('claude.ai')) {
    return PLATFORMS.CLAUDE;
  } else if (hostname.includes('openai.com') || hostname.includes('chatgpt.com')) {
    return PLATFORMS.CHATGPT;
  } else if (hostname.includes('gemini.google.com')) {
    return PLATFORMS.GEMINI;
  }

  return PLATFORMS.UNKNOWN;
}

// ========================================
// CONVERSATION EXTRACTION
// ========================================

function extractConversation() {
  const platform = detectPlatform();

  switch (platform) {
    case PLATFORMS.CLAUDE:
      return extractClaudeConversation();
    case PLATFORMS.CHATGPT:
      return extractChatGPTConversation();
    case PLATFORMS.GEMINI:
      return extractGeminiConversation();
    default:
      return [];
  }
}

function extractClaudeConversation() {
  const messages = [];

  // Strategy 1: Use [data-test-render-count] containers
  const containers = document.querySelectorAll('[data-test-render-count]');

  if (containers.length > 0) {
    containers.forEach(container => {
      // Check for user/claude font classes
      const hasUserFont = container.querySelector('.font-user-message') || container.classList.contains('font-user-message');
      const hasClaudeFont = container.querySelector('.font-claude-message') || container.classList.contains('font-claude-message');

      let role = 'unknown';

      if (hasUserFont) {
        role = 'user';
      } else if (hasClaudeFont) {
        role = 'model';
      } else {
        // Enhanced fallback checks using safer methods
        const text = container.textContent || '';
        const className = container.className.toLowerCase();

        // Check for user indicators using safer alternatives
        if (className.includes('user') ||
          className.includes('text-user-message') ||
          container.getAttribute('role') === 'user' ||
          container.querySelector('[data-role="user"]')) {
          role = 'user';
        }
        // Check for claude indicators
        else if (className.includes('claude') ||
          className.includes('assistant') ||
          className.includes('text-claude-message') ||
          container.getAttribute('role') === 'assistant' ||
          container.querySelector('[data-role="assistant"]')) {
          role = 'model';
        }
        // Pattern-based fallback: User messages tend to be shorter
        else if (text.length < 500 && !container.querySelector('code')) {
          role = 'user';
        } else {
          role = 'model';
        }
      }

      let content = container.textContent || container.innerText;
      content = cleanMessageContent(content);

      if (content && content.length > 0) {
        messages.push({ role, content });
      }
    });
  } else {
    // Fallback Strategy 2: Specific class scraping
    const userMsgs = document.querySelectorAll('.font-user-message');
    const aiMsgs = document.querySelectorAll('.font-claude-message');

    const all = [...userMsgs, ...aiMsgs].sort((a, b) =>
      (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1
    );

    all.forEach(el => {
      const role = el.classList.contains('font-user-message') ? 'user' : 'model';
      let content = el.textContent || el.innerText;
      content = cleanMessageContent(content);

      if (content && content.length > 0) {
        messages.push({ role, content });
      }
    });
  }

  return messages;
}

function extractChatGPTConversation() {
  const messages = [];
  const messageElements = document.querySelectorAll('[data-message-author-role]');

  messageElements.forEach(el => {
    const role = el.getAttribute('data-message-author-role');
    let content = el.textContent || el.innerText;

    // Clean artifacts
    content = cleanMessageContent(content);

    if (content && content.length > 0) {
      messages.push({
        role: role === 'user' ? 'user' : 'model',
        content: content
      });
    }
  });

  return messages;
}

function extractGeminiConversation() {
  const messages = [];

  // Gemini-specific: Only get actual conversation messages
  // Avoid UI elements like menus, toolbars, sidebars

  // Strategy 1: Look for actual message content blocks
  // Gemini typically uses specific container structures for messages
  const conversationRoot = document.querySelector('main') || document.body;

  // Find message pairs (user query + model response)
  const allMessages = conversationRoot.querySelectorAll('[class*="message"], [data-message-id]');

  // Filter out UI elements by checking content characteristics
  const validMessages = Array.from(allMessages).filter(el => {
    const text = el.textContent || '';

    // Exclude if it's clearly UI chrome:
    // - Too short (buttons/labels are usually < 50 chars)
    // - Contains menu keywords
    // - Is a button or link container
    if (text.length < 50) return false;
    if (text.includes('New chat') ||
      text.includes('Search') ||
      text.includes('Add files') ||
      text.includes('Collapse menu') ||
      text.includes('More options')) return false;
    if (el.tagName === 'BUTTON' || el.tagName === 'A') return false;
    if (el.querySelector('button') && text.length < 200) return false;

    return true;
  });

  validMessages.forEach(el => {
    const className = el.className || '';
    const isUser = className.includes('user') ||
      el.querySelector('[class*="user"]') ||
      el.getAttribute('data-role') === 'user';

    let content = el.textContent || el.innerText;
    content = cleanMessageContent(content);

    if (content && content.length > 0) {
      messages.push({
        role: isUser ? 'user' : 'model',
        content: content
      });
    }
  });

  // Fallback: if we got nothing, try alternative approach
  if (messages.length === 0) {
    const userQueries = document.querySelectorAll('[class*="user-query"]');
    const modelResponses = document.querySelectorAll('[class*="model-response"]');

    const allElements = [...userQueries, ...modelResponses].sort((a, b) => {
      return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
    });

    allElements.forEach(el => {
      // Same UI filtering
      const text = el.textContent || '';
      if (text.length < 50) return;
      if (text.includes('New chat') || text.includes('Search')) return;

      const isUser = el.className.includes('user');
      let content = el.textContent || el.innerText;
      content = cleanMessageContent(content);

      if (content && content.length > 0) {
        messages.push({
          role: isUser ? 'user' : 'model',
          content: content
        });
      }
    });
  }

  return messages;
}

function cleanMessageContent(text) {
  if (!text) return "";

  // Remove common UI artifacts specific to Gemini
  let cleaned = text
    .replace(/Copy code/g, '')
    .replace(/^[0-9]+ \/ [0-9]+$/gm, '') // Remove pagination
    .replace(/Use microphone/g, '')
    .replace(/Search \(⌘⇧K\)/g, '')
    .replace(/Add files/g, '')
    .replace(/Collapse menu/g, '')
    .replace(/New chat \(⌘⇧O\)/g, '')
    .replace(/Copy response/g, '')
    .replace(/More/g, '')
    .replace(/Edit prompt/g, '')
    .trim();

  // Gemini-specific: Handle user/AI boundary

  // If "Show thinking" exists (Thinking/Pro mode), use it as separator
  if (cleaned.includes('Show thinking')) {
    cleaned = cleaned.replace(/Show thinking/g, '\n\n---\n\n');
  } else {
    // Fast mode: Try to detect user question end
    // Pattern: Double question marks often mark end of user query
    // "问题？？这是" → "问题？？\n\n---\n\n这是"
    // Only apply if followed by Chinese character or capital letter (start of answer)
    cleaned = cleaned.replace(/([？?]{2,})([这那很是要会可能A-Z\u4e00-\u9fa5])/g, '$1\n\n---\n\n$2');
  }

  // Gemini-specific: Insert newlines where sentences clearly end
  cleaned = cleaned
    .replace(/([。！])([A-Z\u4e00-\u9fa5])/g, '$1\n\n$2')  // Chinese punctuation + new sentence (not ？)
    .replace(/([.!])([A-Z])/g, '$1\n\n$2')  // English punctuation + capital letter (not ?)
    .replace(/(\))([A-Z\u4e00-\u9fa5])/g, '$1\n\n$2');  // Close paren + new sentence

  // Limit excessive newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned;
}

function getConversationStats(messages) {
  const totalMessages = messages.length;
  const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
  const estimatedTokens = Math.ceil(totalChars / 4);

  return {
    totalMessages,
    totalChars,
    estimatedTokens
  };
}

// ========================================
// INPUT FIELD DETECTION
// ========================================

function findInputField() {
  const platform = detectPlatform();
  let selectors = [];

  switch (platform) {
    case PLATFORMS.CLAUDE:
      selectors = [
        'div[contenteditable="true"]',
        'div[role="textbox"]',
        'textarea'
      ];
      break;

    case PLATFORMS.CHATGPT:
      selectors = [
        '#prompt-textarea',
        'textarea[placeholder*="Message"]',
        'div[contenteditable="true"]',
        'textarea'
      ];
      break;

    case PLATFORMS.GEMINI:
      selectors = [
        'div[contenteditable="true"]',
        'textarea[aria-label*="Ask"]',
        'textarea'
      ];
      break;

    default:
      selectors = [
        'div[contenteditable="true"]',
        'textarea',
        'input[type="text"]'
      ];
  }

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      console.log(`Found input: ${selector}`);
      return element;
    }
  }

  return null;
}

// ========================================
// SEND BUTTON DETECTION
// ========================================

function findSendButton() {
  const platform = detectPlatform();
  let selectors = [];

  switch (platform) {
    case PLATFORMS.CLAUDE:
      selectors = [
        'button[aria-label*="Send"]',
        'button[type="submit"]'
      ];
      break;

    case PLATFORMS.CHATGPT:
      selectors = [
        'button[data-testid="send-button"]',
        'button[aria-label*="Send"]'
      ];
      break;

    case PLATFORMS.GEMINI:
      selectors = [
        'button[aria-label*="Send"]',
        'button[type="submit"]'
      ];
      break;

    default:
      selectors = [
        'button[type="submit"]',
        'button[aria-label*="Send"]'
      ];
  }

  for (const selector of selectors) {
    const button = document.querySelector(selector);
    if (button && !button.disabled) {
      return button;
    }
  }

  return null;
}

// ========================================
// WAITING INDICATOR (可选的视觉提示)
// ========================================

function showWaitingIndicator() {
  // 可以在这里添加页面上的等待提示
  // 目前仅记录日志
  console.log('[LumiFlow] Waiting for AI to complete response...');
}

// ========================================
// TEXT INJECTION
// ========================================

function injectTextIntoField(element, text) {
  element.focus();

  const isInserted = document.execCommand('insertText', false, text);

  if (!isInserted) {
    console.warn("LumiFlow: execCommand failed, falling back to state hijacking.");

    const setter = Object.getOwnPropertyDescriptor(
      element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLElement.prototype,
      element instanceof HTMLTextAreaElement ? 'value' : 'innerText'
    )?.set;

    if (setter) {
      setter.call(element, text);
    } else {
      if (element.isContentEditable) {
        element.innerText = text;
      } else {
        element.value = text;
      }
    }

    ['input', 'change', 'bubbles'].forEach(evt => {
      element.dispatchEvent(new Event(evt, { bubbles: true }));
    });
  }

  console.log("LumiFlow: Text injected with formatting preserved.");
}

// ========================================
// WAIT FOR AI RESPONSE
// ========================================

// ========================================
// WAIT FOR AI RESPONSE (Gemini-Enhanced)
// ========================================

function waitForAIResponse(timeout = 60000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let stableCount = 0;
    let lastTextLength = 0;

    console.log(`[WAIT] Smart waiting for AI response...`);

    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;

      if (elapsed > timeout) {
        console.error('[WAIT] Timeout after', elapsed, 'ms');
        clearInterval(checkInterval);
        reject(new Error('Timeout waiting for AI response'));
        return;
      }

      // Get ONLY the last AI message (not user input!)
      const lastAIMessage = getLastAIMessage();

      if (!lastAIMessage) {
        console.log(`[WAIT] Waiting for AI to start... (${Math.floor(elapsed / 1000)}s)`);
        return;
      }

      const currentText = lastAIMessage.innerText || lastAIMessage.textContent || '';

      // Phase 1: Wait for end marker
      if (currentText.includes('<<<CHECKPOINT_END>>>')) {
        // Phase 2: Ensure content is stable
        if (currentText.length === lastTextLength) {
          stableCount++;
          console.log(`[WAIT] Content stable (${stableCount}/3)`);

          if (stableCount >= 3) {
            clearInterval(checkInterval);

            // Extract checkpoint content
            const checkpoint = extractCheckpoint(currentText);

            if (checkpoint && checkpoint.length > 100) {
              console.log('[WAIT] Extraction complete!');
              console.log('[WAIT] Checkpoint length:', checkpoint.length, 'chars');
              console.log('[WAIT] First 150 chars:', checkpoint.substring(0, 150));
              resolve(checkpoint);
            } else {
              console.error('[WAIT] Checkpoint too short or invalid');
              reject(new Error('Checkpoint extraction failed'));
            }
          }
        } else {
          // Content still growing
          lastTextLength = currentText.length;
          stableCount = 0;
          console.log(`[WAIT] AI typing... (${currentText.length} chars)`);
        }
      } else {
        console.log(`[WAIT] Waiting for <<<CHECKPOINT_END>>>... (${Math.floor(elapsed / 1000)}s)`);
      }
    }, 800);
  });
}

function getLastAIMessage() {
  const platform = detectPlatform();
  let selectors = [];

  switch (platform) {
    case PLATFORMS.CHATGPT:
      selectors = ['[data-message-author-role="assistant"]'];
      break;
    case PLATFORMS.CLAUDE:
      selectors = [
        '.font-claude-message',
        '[data-test-render-count]'
      ];
      break;
    case PLATFORMS.GEMINI:
      // Gemini 2025 更新后的选择器 - 更激进的匹配
      selectors = [
        'model-response',
        '.model-response-text',
        '[class*="model-response"]',
        '[class*="response-content"]',
        'message-content[class*="model"]',
        '.response-container',
        // 更通用的选择器
        '[class*="markdown"]',
        '[class*="response"]',
        // 尝试匹配包含 checkpoint 的元素
        'div[class*="message"]'
      ];
      break;
    default:
      selectors = ['[class*="assistant"]', '[class*="bot"]', '[class*="ai"]'];
      break;
  }

  // 尝试所有选择器，找到最后一个 AI 消息
  for (const selector of selectors) {
    try {
      const messages = document.querySelectorAll(selector);
      if (messages.length > 0) {
        // 找包含 CHECKPOINT 标记的元素
        for (let i = messages.length - 1; i >= 0; i--) {
          const text = messages[i].innerText || messages[i].textContent || '';
          if (text.includes('<<<CHECKPOINT')) {
            console.log(`[getLastAIMessage] Found checkpoint in: ${selector}, index ${i}`);
            return messages[i];
          }
        }
        // 如果没找到 checkpoint，返回最后一个
        console.log(`[getLastAIMessage] Using last element from: ${selector}`);
        return messages[messages.length - 1];
      }
    } catch (e) {
      continue;
    }
  }

  // 最后的回退：直接搜索页面中包含 CHECKPOINT 的元素
  console.log('[getLastAIMessage] Fallback: searching for CHECKPOINT in page...');
  const allElements = document.querySelectorAll('div, p, section, article');
  for (let i = allElements.length - 1; i >= 0; i--) {
    const text = allElements[i].innerText || '';
    if (text.includes('<<<CHECKPOINT_START>>>') && text.includes('<<<CHECKPOINT_END>>>')) {
      console.log('[getLastAIMessage] Found checkpoint via fallback search');
      return allElements[i];
    }
  }

  console.warn('[getLastAIMessage] No AI message found with any selector');
  return null;
}


function extractCheckpoint(fullText) {
  const startMarker = '<<<CHECKPOINT_START>>>';
  const endMarker = '<<<CHECKPOINT_END>>>';

  const startIdx = fullText.indexOf(startMarker);
  const endIdx = fullText.indexOf(endMarker);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    // Extract content between markers (excluding the markers themselves)
    const checkpoint = fullText.substring(startIdx + startMarker.length, endIdx).trim();
    return checkpoint;
  }

  console.warn('[WAIT] Markers not found or malformed');
  return null;
}

function getMessageSelector(platform) {
  switch (platform) {
    case PLATFORMS.CLAUDE:
      return '[data-test-render-count]';
    case PLATFORMS.CHATGPT:
      return '[data-message-author-role="assistant"]';
    case PLATFORMS.GEMINI:
      return '[class*="message"]';
    default:
      return 'div';
  }
}

// ========================================
// UTILITIES
// ========================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}