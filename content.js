// content.js - LumiFlow v2.9.1
// ===================================
// Content script for AI chat platforms
// Only runs on claude.ai, chatgpt.com, gemini.google.com, chat.deepseek.com
// (controlled by manifest.json content_scripts.matches)
// ===================================

console.log("LumiFlow v2.9.1: Content script loaded on", window.location.hostname);

// ========================================
// DOMAIN PROTECTION (双重防护)
// ========================================
// 即使 manifest.json 被意外修改，也不会污染其他网站

const ALLOWED_DOMAINS = [
  'claude.ai',
  'chat.openai.com',
  'chatgpt.com',
  'gemini.google.com',
  'chat.deepseek.com'
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
// PLATFORMS (MUST BE DEFINED BEFORE USE!)
// ========================================

const PLATFORMS = {
  CLAUDE: 'claude',
  CHATGPT: 'chatgpt',
  GEMINI: 'gemini',
  DEEPSEEK: 'deepseek',
  UNKNOWN: 'unknown'
};

// ========================================
// PLATFORM HEALTH CHECK ON LOAD
// ========================================

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
        console.log('[LumiFlow] ℹ️ Some UI elements not detected yet (page may still be loading)');
        console.log('[LumiFlow] Missing:', {
            input: !inputField,
            sendButton: !sendButton
        });
    } else {
        console.log('[LumiFlow] ✅ Platform support validated');
    }
}

// ========================================
// COMPRESSION PROMPT
// ========================================
// 提示词统一放在 prompts.js（manifest 里先于本文件加载）：buildInChatCompressionPrompt()

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

  if (request.action === "download_zip") {
    handleDownloadZip(sendResponse);
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
    const result = await chrome.storage.local.get(['segments', 'lastCheckpoint']);
    const segments = result.segments || [];

    // 用快捷键压缩后没打开过 popup 时，checkpoint 还停在 lastCheckpoint 里，先把它收进 segments
    const pending = result.lastCheckpoint;
    if (pending && pending.checkpoint && !segments.some(s => s.content === pending.checkpoint)) {
      segments.push({
        id: Date.now() + Math.random(),
        content: pending.checkpoint,
        platform: pending.platform || 'unknown',
        timestamp: pending.timestamp || new Date().toISOString(),
        collapsed: pending.checkpoint.length > 200
      });
      await chrome.storage.local.set({ segments });
    }
    if (pending) {
      await chrome.storage.local.remove('lastCheckpoint');
    }

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
    const prompt = request.customPrompt || buildInChatCompressionPrompt();
    console.log('[AUTO] Compression prompt generated');

    // Step 3: 发送前先记下页面上已有的 checkpoint（之前压缩过的），等待时只认新生成的
    snapshotExistingCheckpoints();

    // Step 4: Inject prompt
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
        if (platform === PLATFORMS.GEMINI || platform === PLATFORMS.DEEPSEEK) {
          console.log(`[AUTO] Trying Enter key for ${platform}...`);
          inputField.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        }
      }

      // Step 5: 无论发送方式如何，都等待 AI 响应
      console.log('[AUTO] Waiting for AI to generate checkpoint...');
      showWaitingIndicator();

      try {
        // Gemini 和 DeepSeek（深度思考）生成较慢，给更长时间
        const slowPlatforms = [PLATFORMS.GEMINI, PLATFORMS.DEEPSEEK];
        const timeout = slowPlatforms.includes(detectPlatform()) ? 90000 : 60000;
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
          showPageToast('LumiFlow: checkpoint saved. Open a new chat and click INJECT.');
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
        showPageToast('LumiFlow: timed out. Select the checkpoint and use Manual Absorb.');
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
    // 选中 AI 生成的 checkpoint 时，顺手去掉首尾的 <<<CHECKPOINT_START/END>>> 标记
    const cleanSelection = selection
      .replace(/<<<CHECKPOINT_(START|END)>>>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!cleanSelection) {
      sendResponse({ status: 'error', message: 'Please select some text first.' });
      return;
    }

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
      // popup 开着时页面没有焦点，这里写剪贴板会失败；交给 popup 去复制
      sendResponse({
        status: 'no_input',
        message: 'Input field not found.'
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

// 统计和下载使用同一条数据来源：先读平台接口，失败再退回页面提取。
// 只读页面的话，长对话里早期消息已被懒加载卸载，数量会明显偏少。
async function handleGetStats(sendResponse) {
  try {
    const platform = detectPlatform();
    const messages = normalizeConversation((await fetchConversationViaAPI(platform)) || extractConversation());
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
    console.log('[GET_CONVERSATION] Starting...');
    const platform = detectPlatform();
    console.log('[GET_CONVERSATION] Platform detected:', platform);

    // 优先尝试该平台自己的对话接口：一次请求拿到完整对话 JSON，
    // 不依赖页面渲染/滚动，瞬间且不受 UI 改版影响。
    let messages = await fetchConversationViaAPI(platform);

    if (messages) {
      console.log('[GET_CONVERSATION] Loaded via API:', messages.length, 'messages');
    } else {
      // 接口不可用（未登录/接口变更/团队账号等）时，退回 DOM 抓取。
      // ChatGPT/Claude/Gemini 均会在长对话中懒加载/卸载早期消息，
      // 必须先滚动到顶部把全部消息加载进 DOM，否则只能抓到当前已渲染的部分
      if (platform !== PLATFORMS.UNKNOWN) {
        console.log(`[LumiFlow] API path unavailable, scrolling to load full ${platform} history before DOM extraction...`);
        await scrollToLoadAllMessages(platform);
      }
      messages = extractConversation();
    }

    messages = normalizeConversation(messages);
    console.log('[GET_CONVERSATION] Extracted messages:', messages.length);

    if (messages.length === 0) {
      console.warn('[GET_CONVERSATION] ⚠️ No messages found! Possible causes:');
      console.warn('  1. Platform UI changed (selectors outdated)');
      console.warn('  2. Not on a conversation page');
      console.warn('  3. Page not fully loaded');

      // Try diagnostic info
      console.log('[GET_CONVERSATION] Diagnostic info:');
      console.log('  - URL:', window.location.href);
      console.log('  - Page title:', document.title);
      console.log('  - Body text length:', document.body.innerText.length);
    }

    sendResponse({
      status: 'success',
      platform: platform,
      conversation: messages
    });

  } catch (error) {
    console.error('[GET_CONVERSATION] Error:', error);
    sendResponse({
      status: 'error',
      message: error.message
    });
  }
}

// ========================================
// DOWNLOAD ZIP（对话 + 图片 + 附件）
// ========================================
// 整个流程在页面里完成：popup 点完就可以关掉，进度显示在页面右下角。
// 附件目前来自 ChatGPT / Claude 的平台对话数据；读不到时仍然导出文字，并在文件末尾说明。

const ATTACHMENT_PLATFORMS = [PLATFORMS.CHATGPT, PLATFORMS.CLAUDE, PLATFORMS.GEMINI];
// 这两个平台的附件来自平台对话数据；读不到时只能导出文字。Gemini 本来就从页面读取。
const PLATFORM_DATA_ATTACHMENTS = [PLATFORMS.CHATGPT, PLATFORMS.CLAUDE];

async function handleDownloadZip(sendResponse) {
  try {
    const platform = detectPlatform();
    showPageToast('LumiFlow: reading the conversation…');

    let messages = await fetchConversationViaAPI(platform);
    const viaPlatformData = !!messages;
    if (!messages) {
      if (platform !== PLATFORMS.UNKNOWN) await scrollToLoadAllMessages(platform);
      messages = extractConversation();
    }
    messages = normalizeConversation(messages);

    if (messages.length === 0) {
      showPageToast('LumiFlow: no messages found on this page.');
      sendResponse({ status: 'error', message: 'No messages found on page' });
      return;
    }

    // 同一个文件可能在对话里出现多次，只下载一次
    const unique = [];
    const seen = new Set();
    messages.forEach(m => (m.attachments || []).forEach(att => {
      if (!seen.has(att.id)) {
        seen.add(att.id);
        unique.push(att);
      }
    }));

    const files = [];
    const mediaPaths = {};
    const failed = [];
    console.log(`[ZIP] ${messages.length} messages, ${unique.length} attachments`);

    for (let i = 0; i < unique.length; i++) {
      const att = unique[i];
      showPageToast(`LumiFlow: downloading attachments ${i + 1}/${unique.length}…`);
      try {
        console.log('[ZIP] Downloading', att.name, (att.source && att.source.urls) || att.id);
        const { bytes, mimeType } = await fetchAttachment(att);
        console.log('[ZIP] Downloaded', att.name, bytes.length, 'bytes', mimeType);
        const path = buildMediaFileName(files.length + 1, attachmentFileName(att, mimeType), mimeType);
        files.push({ name: path, data: bytes });
        mediaPaths[att.id] = path;
      } catch (error) {
        console.warn('[ZIP] Attachment failed:', att.name, error.message);
        failed.push({ name: att.name, reason: error.message });
      }
    }

    let markdown = formatConversation(messages, platform, 'md', mediaPaths);

    // 因为没有访问图片网站的权限而失败：打开权限页面，让用户允许后再下载一次
    const needsAccess = failed.some(f => /^NO_ACCESS:/.test(f.reason));
    failed.forEach(f => { f.reason = f.reason.replace(/^NO_ACCESS:\s*/, ''); });

    const notes = [];
    if (failed.length > 0) {
      let note = 'Not included:\n' + failed.map(f => `- ${f.name}: ${f.reason}`).join('\n');
      if (needsAccess) {
        note += '\n\nTo include these, allow access in the LumiFlow tab that opened, then click DOWNLOAD ZIP again.';
      }
      notes.push(note);
    }
    if (!ATTACHMENT_PLATFORMS.includes(platform)) {
      notes.push(`Images and files are not collected on ${getAiSpeakerLabel(platform)} yet; this file contains the text only.`);
    } else if (!viaPlatformData && PLATFORM_DATA_ATTACHMENTS.includes(platform)) {
      notes.push('LumiFlow could not read the platform conversation data, so this file contains the text only.');
    }
    if (notes.length > 0) {
      markdown += '\n\n---\n\n' + notes.join('\n\n');
    }
    markdown += `\n\n---\n\nExported by LumiFlow v${chrome.runtime.getManifest().version}`;

    files.unshift({ name: 'conversation.md', data: markdown });

    const zip = createZip(files);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `lumiflow_${platform}_${timestamp}.zip`;
    saveBytesAsFile(zip, filename, 'application/zip');

    const saved = files.length - 1;
    if (needsAccess) {
      chrome.runtime.sendMessage({ action: 'openPermissionPage', platform }).catch(() => {});
      showPageToast(`LumiFlow: saved ${filename} without ${failed.length} file(s). Allow access in the tab that opened, then download again.`);
      sendResponse({ status: 'success', filename, messageCount: messages.length, attachmentCount: saved, failedCount: failed.length, needsAccess: true });
      return;
    }
    showPageToast(failed.length > 0
      ? `LumiFlow: saved ${filename} (${saved} attachments, ${failed.length} could not be downloaded).`
      : `LumiFlow: saved ${filename} (${saved} attachments).`);

    sendResponse({
      status: 'success',
      filename,
      messageCount: messages.length,
      attachmentCount: saved,
      failedCount: failed.length
    });
  } catch (error) {
    console.error('[ZIP] Error:', error);
    showPageToast(`LumiFlow: ZIP failed — ${error.message}`);
    sendResponse({ status: 'error', message: error.message });
  }
}

// 预览图的类型和原文件名对不上时（例如 Claude 只给了 PDF 首页的预览图），
// 文件名写成 "report.pdf (preview).png"，避免把图片误存成 .pdf
function attachmentFileName(att, mimeType) {
  const name = att.name || '';
  const type = (mimeType || '').split(';')[0].trim();
  if (att.kind === 'file' && type.startsWith('image/') && !/\.(png|jpe?g|webp|gif|svg|heic)$/i.test(name)) {
    const ext = (MIME_EXTENSIONS[type] || 'img');
    return `${name} (preview).${ext}`;
  }
  return name;
}

async function fetchAttachment(att) {
  if (typeof att.inlineText === 'string') {
    return { bytes: new TextEncoder().encode(att.inlineText), mimeType: 'text/plain' };
  }

  const source = att.source || {};

  if (source.platform === 'chatgpt') {
    const url = await resolveChatGPTDownloadUrl(source.fileId, source.conversationId);
    return fetchBinary(url, chatgptAuthHeaders());
  }

  if (source.platform === 'claude' || source.platform === 'gemini') {
    let lastError = new Error('no download address');
    for (const url of source.urls || []) {
      try {
        return await fetchBinary(url);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }

  throw new Error('unsupported attachment');
}

function chatgptAuthHeaders() {
  return chatgptAuth ? { 'Authorization': `Bearer ${chatgptAuth.accessToken}` } : {};
}

// ChatGPT 的文件编号要先换成一个临时下载地址。两种新旧接口都试一下。
async function resolveChatGPTDownloadUrl(fileId, conversationId) {
  const candidates = [
    `/backend-api/files/download/${encodeURIComponent(fileId)}?conversation_id=${encodeURIComponent(conversationId || '')}&inline=false`,
    `/backend-api/files/${encodeURIComponent(fileId)}/download`
  ];

  let lastStatus = '';
  for (const path of candidates) {
    try {
      const res = await fetchWithTimeout(path, { headers: chatgptAuthHeaders() }, 15000);
      if (!res.ok) {
        lastStatus = `HTTP ${res.status}`;
        continue;
      }
      const data = await res.json();
      if (data && typeof data.download_url === 'string' && data.download_url) {
        return data.download_url;
      }
      lastStatus = (data && (data.error_code || data.status)) || 'no download address';
    } catch (error) {
      lastStatus = error.message;
    }
  }
  throw new Error(`file no longer available (${lastStatus})`);
}

// 同一个网站上的文件直接下载（带着登录状态）；其他域名的文件交给后台下载
async function fetchBinary(url, headers = {}) {
  const absolute = new URL(url, window.location.href);

  // 页面里的临时图片（blob:）和内嵌图片（data:）直接在页面里读取
  if (absolute.protocol === 'blob:' || absolute.protocol === 'data:') {
    const res = await pageFetch(absolute.href);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { bytes: new Uint8Array(await res.arrayBuffer()), mimeType: res.headers.get('content-type') || '' };
  }

  if (absolute.origin === window.location.origin) {
    const res = await fetchWithTimeout(absolute.href, { headers, credentials: 'include' }, 60000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return {
      bytes: new Uint8Array(await res.arrayBuffer()),
      mimeType: res.headers.get('content-type') || ''
    };
  }

  const response = await chrome.runtime.sendMessage({ action: 'fetchBinary', url: absolute.href });
  if (response && response.ok) {
    return { bytes: base64ToBytes(response.base64), mimeType: response.contentType || '' };
  }
  const backgroundError = (response && response.error) || 'download failed';
  if (/^NO_ACCESS:/.test(backgroundError)) throw new Error(backgroundError);

  // 后台下载失败时，再从网页本身试一次（有些图片网站允许被网页直接读取）
  try {
    const res = await fetchWithTimeout(absolute.href, { credentials: 'include', mode: 'cors' }, 30000);
    if (res.ok && !/text\/html/i.test(res.headers.get('content-type') || '')) {
      return { bytes: new Uint8Array(await res.arrayBuffer()), mimeType: res.headers.get('content-type') || '' };
    }
    throw new Error(`HTTP ${res.status}`);
  } catch (pageError) {
    throw new Error(`${backgroundError}; from the page: ${pageError.message}`);
  }
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function saveBytesAsFile(bytes, filename, mimeType) {
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 10000);
}

// ========================================
// DIRECT API EXTRACTION (ChatGPT / Claude)
// ========================================
// ChatGPT 和 Claude 的网页本身就是靠调用自己的后端对话接口来渲染整个对话的——
// 这个接口一次性返回完整对话 JSON（不分页、不受虚拟滚动影响）。
// 直接复用同一个接口，比抓 DOM 快得多也稳得多；唯一代价是这是未公开的内部接口，
// 接口形状可能在对方不通知的情况下变化。任何一步失败都返回 null，
// 调用方会自动退回到现有的 DOM 抓取 + 滚动加载方案，不会比之前更差。

async function fetchConversationViaAPI(platform) {
  try {
    if (platform === PLATFORMS.CHATGPT) {
      return await fetchChatGPTConversationAPI();
    }
    if (platform === PLATFORMS.CLAUDE) {
      return await fetchClaudeConversationAPI();
    }
    if (platform === PLATFORMS.DEEPSEEK) {
      return await fetchDeepSeekConversationAPI();
    }
  } catch (error) {
    console.warn('[LumiFlow] API extraction failed, falling back to DOM scraping:', error.message);
  }
  return null;
}

// Firefox 的 content script 用普通 fetch 发请求时，身份是扩展而不是网页，
// 不会带上用户在该网站的登录状态；content.fetch 才是"以网页身份"发请求。Chrome 没有 content，用普通 fetch。
const pageFetch = (typeof content !== 'undefined' && content && typeof content.fetch === 'function')
  ? content.fetch.bind(content)
  : fetch;

// ChatGPT 下载附件需要同一个登录 token，读取对话时顺手记下
let chatgptAuth = null;

function fetchWithTimeout(url, options, timeoutMs = 8000) {
  return Promise.race([
    pageFetch(url, options),
    new Promise((_, reject) => setTimeout(() => reject(new Error('API request timed out')), timeoutMs))
  ]);
}

function getChatGPTConversationId() {
  const match = window.location.pathname.match(/\/c\/([a-zA-Z0-9-]+)/);
  return match ? match[1] : null;
}

async function fetchChatGPTConversationAPI() {
  const conversationId = getChatGPTConversationId();
  if (!conversationId) return null;

  const sessionRes = await fetchWithTimeout('/api/auth/session');
  if (!sessionRes.ok) return null;
  const session = await sessionRes.json();
  const accessToken = session && session.accessToken;
  if (!accessToken) return null;
  chatgptAuth = { accessToken, conversationId };

  const convRes = await fetchWithTimeout(`/backend-api/conversation/${conversationId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!convRes.ok) return null;

  const data = await convRes.json();
  const mapping = data && data.mapping;
  const currentNode = data && data.current_node;
  if (!mapping || !currentNode) return null;

  // current_node 是当前激活分支的叶子节点，沿 parent 一路走到根，
  // 再反转就是按时间顺序排列的完整对话（含所有楼层，不依赖任何渲染状态）
  const orderedNodes = [];
  let nodeId = currentNode;
  let guard = 0;
  while (nodeId && mapping[nodeId] && guard < 5000) {
    orderedNodes.push(mapping[nodeId]);
    nodeId = mapping[nodeId].parent;
    guard++;
  }
  orderedNodes.reverse();

  const messages = [];
  for (const node of orderedNodes) {
    const msg = node.message;
    if (!msg || !msg.content) continue;

    const role = msg.author && msg.author.role;
    if (role !== 'user' && role !== 'assistant' && role !== 'tool') continue; // 跳过 system 等非对话内容

    // 页面上不显示的消息（自定义指令、记忆、系统注入的上下文等）不属于对话本身
    if (msg.metadata && msg.metadata.is_visually_hidden_from_conversation) continue;

    const attachments = extractChatGPTAttachments(msg, conversationId);

    // tool 消息的文字是工具的内部输出，不导出；但 AI 生成的图片就在这里，算作回答的一部分
    if (role === 'tool') {
      if (attachments.length > 0) {
        appendMessage(messages, 'model', '', { mergeSameRole: true, attachments });
      }
      continue;
    }

    const content = (extractChatGPTNodeText(msg.content) || '').trim();
    if (content || attachments.length > 0) {
      // 一轮回答在接口里常被拆成多个 assistant 节点（调用工具前后各一段），合并成一条
      appendMessage(messages, role === 'user' ? 'user' : 'model', content, {
        mergeSameRole: role === 'assistant',
        attachments
      });
    }
  }

  return messages.length > 0 ? messages : null;
}

// 图片在 multimodal_text 的 parts 里以 asset_pointer 出现（file-service://file-xxx 或 sediment://file_xxx）；
// 其他附件（PDF、Word、表格……）记录在 metadata.attachments。两处可能指向同一个文件，按 id 去重。
function extractChatGPTAttachments(msg, conversationId) {
  const result = [];
  const seen = new Set();
  const listed = (msg.metadata && Array.isArray(msg.metadata.attachments)) ? msg.metadata.attachments : [];
  const nameOf = id => {
    const hit = listed.find(a => a && a.id === id);
    return hit && hit.name;
  };

  const parts = msg.content && Array.isArray(msg.content.parts) ? msg.content.parts : [];
  parts.forEach(part => {
    if (!part || typeof part !== 'object' || typeof part.asset_pointer !== 'string') return;
    const fileId = part.asset_pointer.replace(/^[a-z-]+:\/\//i, '');
    if (!fileId || seen.has(fileId)) return;
    seen.add(fileId);
    const generated = !!(part.metadata && (part.metadata.dalle || part.metadata.generation));
    result.push({
      id: `chatgpt:${fileId}`,
      kind: 'image',
      name: nameOf(fileId) || (generated ? 'generated-image' : 'image'),
      source: { platform: 'chatgpt', fileId, conversationId }
    });
  });

  listed.forEach(a => {
    if (!a || !a.id || seen.has(a.id)) return;
    seen.add(a.id);
    const mimeType = a.mime_type || a.mimeType || '';
    result.push({
      id: `chatgpt:${a.id}`,
      kind: mimeType.startsWith('image/') ? 'image' : 'file',
      name: a.name || a.id,
      mimeType,
      source: { platform: 'chatgpt', fileId: a.id, conversationId }
    });
  });

  return result;
}

// 只取真正显示给用户看的正文。code（搜索词、Python 代码调用）、thoughts（推理过程）、
// reasoning_recap、tether_browsing_display 等内部内容不导出。
function extractChatGPTNodeText(content) {
  const type = content.content_type;
  if ((type === 'text' || type === 'multimodal_text') && Array.isArray(content.parts)) {
    return content.parts.filter(p => typeof p === 'string').join('\n');
  }
  return '';
}

function getClaudeConversationId() {
  const match = window.location.pathname.match(/\/chat\/([a-zA-Z0-9-]+)/);
  return match ? match[1] : null;
}

async function fetchClaudeConversationAPI() {
  const conversationId = getClaudeConversationId();
  if (!conversationId) return null;

  const orgRes = await fetchWithTimeout('/api/organizations');
  if (!orgRes.ok) return null;
  const orgs = await orgRes.json();
  const orgId = Array.isArray(orgs) && orgs.length > 0 ? orgs[0].uuid : null;
  if (!orgId) return null;

  const convRes = await fetchWithTimeout(
    `/api/organizations/${orgId}/chat_conversations/${conversationId}?tree=True&rendering_mode=messages&render_all_tools=true`
  );
  if (!convRes.ok) return null;

  const data = await convRes.json();
  const rawMessages = data && data.chat_messages;
  if (!Array.isArray(rawMessages)) return null;

  // tree=True 会把所有分支（编辑过的提问、重新生成的回答）都返回；
  // 沿 current_leaf_message_uuid → parent_message_uuid 回溯，只保留屏幕上显示的那条分支
  const ordered = orderClaudeMessages(rawMessages, data.current_leaf_message_uuid);

  const messages = [];
  for (const m of ordered) {
    const role = m.sender === 'human' ? 'user' : 'model';
    const content = (extractClaudeMessageText(m) || '').trim();
    const attachments = extractClaudeAttachments(m);
    if (content || attachments.length > 0) {
      appendMessage(messages, role, content, { attachments });
    }
  }

  return messages.length > 0 ? messages : null;
}

// files_v2 / files：图片和文档，带同站点的预览地址（/api/{org}/files/{uuid}/preview）。
// attachments：Claude 只保留了"读出来的文字"的文件（例如粘贴的长文本、部分文档），没有原文件，
// 这种情况把文字本身存成 .txt。
function extractClaudeAttachments(m) {
  const result = [];
  const files = Array.isArray(m.files_v2) ? m.files_v2 : (Array.isArray(m.files) ? m.files : []);

  files.forEach(f => {
    if (!f) return;
    const urls = [
      f.preview_asset && f.preview_asset.url,
      f.preview_url,
      f.document_asset && f.document_asset.url,
      f.thumbnail_asset && f.thumbnail_asset.url,
      f.thumbnail_url
    ].filter(u => typeof u === 'string' && u.length > 0);
    const id = f.file_uuid || f.uuid || f.file_name;
    if (!id) return;
    result.push({
      id: `claude:${id}`,
      kind: f.file_kind === 'image' ? 'image' : 'file',
      name: f.file_name || id,
      source: { platform: 'claude', urls }
    });
  });

  (Array.isArray(m.attachments) ? m.attachments : []).forEach((a, i) => {
    if (!a || typeof a.extracted_content !== 'string' || !a.extracted_content) return;
    const name = a.file_name || `attachment-${i + 1}`;
    result.push({
      id: `claude:text:${m.uuid || ''}:${i}`,
      kind: 'file',
      name: /\.(txt|md)$/i.test(name) ? name : `${name}.txt`,
      note: 'text extracted by Claude',
      inlineText: a.extracted_content
    });
  });

  return result;
}

function orderClaudeMessages(rawMessages, leafId) {
  if (!leafId) return rawMessages;
  const byId = new Map(rawMessages.filter(m => m && m.uuid).map(m => [m.uuid, m]));
  const chain = [];
  let id = leafId;
  let guard = 0;
  while (id && byId.has(id) && guard < 5000) {
    const m = byId.get(id);
    chain.push(m);
    id = m.parent_message_uuid;
    guard++;
  }
  return chain.length > 0 ? chain.reverse() : rawMessages;
}

function extractClaudeMessageText(m) {
  if (typeof m.text === 'string' && m.text.length > 0) {
    return m.text;
  }
  if (Array.isArray(m.content)) {
    return m.content
      .filter(block => block && (block.type === 'text' || typeof block.text === 'string'))
      .map(block => block.text || '')
      .join('\n\n');
  }
  return '';
}

// DeepSeek：网页把登录 token 存在 localStorage.userToken（形如 {"value": "..."}），
// 并通过 /api/v0/chat/history_messages 拉取整段会话。会话可能有分支（重新生成/编辑），
// 若返回了 current_message_id，就沿 parent_id 回溯出当前显示的那条分支。
function getDeepSeekConversationId() {
  const match = window.location.pathname.match(/\/chat\/s\/([a-zA-Z0-9-]+)/);
  return match ? match[1] : null;
}

function getDeepSeekToken() {
  try {
    const raw = window.localStorage.getItem('userToken');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.value === 'string') return parsed.value;
      if (typeof parsed === 'string') return parsed;
    } catch (e) {
      return raw;
    }
  } catch (e) {
    // localStorage 不可用
  }
  return null;
}

async function fetchDeepSeekConversationAPI() {
  const sessionId = getDeepSeekConversationId();
  if (!sessionId) return null;

  const headers = {};
  const token = getDeepSeekToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetchWithTimeout(
    `/api/v0/chat/history_messages?chat_session_id=${encodeURIComponent(sessionId)}`,
    { headers, credentials: 'include' }
  );
  if (!res.ok) return null;

  const data = await res.json();
  const biz = data && data.data && data.data.biz_data;
  const rawMessages = biz && biz.chat_messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) return null;

  const ordered = orderDeepSeekMessages(rawMessages, biz.chat_session && biz.chat_session.current_message_id);

  const messages = [];
  for (const m of ordered) {
    const role = String(m.role || '').toUpperCase() === 'USER' ? 'user' : 'model';
    const content = extractDeepSeekMessageText(m);
    if (content && content.trim().length > 0) {
      messages.push({ role, content: content.trim() });
    }
  }

  return messages.length > 0 ? messages : null;
}

function orderDeepSeekMessages(rawMessages, currentMessageId) {
  const byId = new Map();
  rawMessages.forEach(m => {
    if (m && m.message_id !== undefined && m.message_id !== null) byId.set(m.message_id, m);
  });

  if (currentMessageId !== undefined && currentMessageId !== null && byId.has(currentMessageId)) {
    const chain = [];
    let id = currentMessageId;
    let guard = 0;
    while (id !== undefined && id !== null && byId.has(id) && guard < 5000) {
      const m = byId.get(id);
      chain.push(m);
      id = m.parent_id;
      guard++;
    }
    if (chain.length > 0) return chain.reverse();
  }

  return rawMessages;
}

// 只取正文，不导出"深度思考"(thinking) 过程
function extractDeepSeekMessageText(m) {
  if (Array.isArray(m.fragments) && m.fragments.length > 0) {
    return m.fragments
      .filter(f => f && typeof f.content === 'string' && !/THINK/i.test(String(f.type || '')))
      .map(f => f.content)
      .join('\n\n');
  }
  if (typeof m.content === 'string') {
    return m.content;
  }
  return '';
}

// 懒加载修复：所有平台在长对话中都会按需加载/卸载早期消息（无限滚动）。
// 反复滚动到顶部，直到消息数量连续多轮保持不变，才认为历史已全部加载。
// 用"消息数量是否还在增长"判断完成，而不是 scrollTop===0
// （滚动容器到顶后，新内容会被插入顶部，scrollTop 会被浏览器顶回非 0）。
function getMessageCountSelector(platform) {
  switch (platform) {
    case PLATFORMS.CLAUDE:
      return '[data-test-render-count]';
    case PLATFORMS.CHATGPT:
      return '[data-message-author-role]';
    case PLATFORMS.GEMINI:
      return 'user-query, model-response';
    case PLATFORMS.DEEPSEEK:
      return '.ds-markdown';
    default:
      return null;
  }
}

// 从一条已知消息元素出发，向上找到真正可滚动的祖先容器
function findScrollableAncestor(el) {
  let node = el ? el.parentElement : null;

  while (node && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    const isScrollableStyle = overflowY === 'auto' || overflowY === 'scroll';

    if (isScrollableStyle && node.scrollHeight > node.clientHeight + 10) {
      return node;
    }
    node = node.parentElement;
  }

  return document.scrollingElement || document.documentElement;
}

async function scrollToLoadAllMessages(platform) {
  const countSelector = getMessageCountSelector(platform);
  if (!countSelector) return;

  const sampleEl = document.querySelector(countSelector);
  const scrollContainer = findScrollableAncestor(sampleEl);

  let previousCount = document.querySelectorAll(countSelector).length;
  let stableRounds = 0;
  let attempts = 0;
  const maxAttempts = 60; // 硬上限，避免极端情况下死循环
  const stableRoundsNeeded = 3; // 连续 3 轮数量不变，才认为加载完成

  console.log(`[LumiFlow] Scroll-load start: ${previousCount} messages currently in DOM`);

  while (attempts < maxAttempts && stableRounds < stableRoundsNeeded) {
    scrollContainer.scrollTo({ top: 0, behavior: 'instant' });
    await sleep(350);

    const currentCount = document.querySelectorAll(countSelector).length;

    if (currentCount === previousCount) {
      stableRounds++;
    } else {
      stableRounds = 0;
      previousCount = currentCount;
    }

    attempts++;
  }

  // 给最后一批内容留出渲染时间
  await sleep(500);

  console.log(`[LumiFlow] Scroll-load complete: ${previousCount} messages after ${attempts} attempts`);
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
  } else if (hostname.includes('deepseek.com')) {
    return PLATFORMS.DEEPSEEK;
  }

  return PLATFORMS.UNKNOWN;
}

// ========================================
// CONVERSATION EXTRACTION
// ========================================

function extractConversation() {
  const platform = detectPlatform();
  console.log('[EXTRACT] Starting extraction for platform:', platform);

  let messages = [];

  switch (platform) {
    case PLATFORMS.CLAUDE:
      messages = extractClaudeConversation();
      break;
    case PLATFORMS.CHATGPT:
      messages = extractChatGPTConversation();
      break;
    case PLATFORMS.GEMINI:
      messages = extractGeminiConversation();
      break;
    case PLATFORMS.DEEPSEEK:
      messages = extractDeepSeekConversation();
      break;
    default:
      console.warn('[EXTRACT] Unknown platform, cannot extract');
      return [];
  }

  console.log('[EXTRACT] Extracted', messages.length, 'messages');

  if (messages.length === 0) {
    console.warn('[EXTRACT] No messages extracted. Debugging info:');
    console.warn('  - Platform:', platform);
    console.warn('  - URL:', window.location.href);

    // Platform-specific debugging
    if (platform === PLATFORMS.CLAUDE) {
      const containers = document.querySelectorAll('[data-test-render-count]');
      console.warn('  - Claude: Found', containers.length, '[data-test-render-count] elements');
    } else if (platform === PLATFORMS.CHATGPT) {
      const msgs = document.querySelectorAll('[data-message-author-role]');
      console.warn('  - ChatGPT: Found', msgs.length, '[data-message-author-role] elements');
    } else if (platform === PLATFORMS.GEMINI) {
      const main = document.querySelector('main');
      console.warn('  - Gemini: Found main element:', !!main);
      const allMessages = document.querySelectorAll('[class*="message"], [data-message-id]');
      console.warn('  - Gemini: Found', allMessages.length, 'message candidates');
    } else if (platform === PLATFORMS.DEEPSEEK) {
      const replies = document.querySelectorAll('.ds-markdown');
      console.warn('  - DeepSeek: Found', replies.length, '.ds-markdown elements');
    }
  }

  return messages;
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

      const content = cleanMessageContent(getElementText(container));

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
      const content = cleanMessageContent(getElementText(el));

      if (content && content.length > 0) {
        messages.push({ role, content });
      }
    });
  }

  return messages;
}

function extractChatGPTConversation() {
  const messages = [];
  // 只取最外层的消息元素，避免嵌套元素把同一条消息读两遍
  const messageElements = Array.from(document.querySelectorAll('[data-message-author-role]'))
    .filter(el => !el.parentElement || !el.parentElement.closest('[data-message-author-role]'));

  messageElements.forEach(el => {
    const role = el.getAttribute('data-message-author-role');
    if (role !== 'user' && role !== 'assistant') return;

    const content = cleanMessageContent(getElementText(el));
    if (content) {
      appendMessage(messages, role === 'user' ? 'user' : 'model', content, {
        mergeSameRole: role === 'assistant'
      });
    }
  });

  return messages;
}

// Gemini 的页面结构：每轮对话是 <user-query> 和 <model-response> 两个自定义元素。
// - 提问正文在 .query-text-line 段落里；同一个提问里还有一个给读屏软件用的隐藏标题
//   （.cdk-visually-hidden），里面是 "You said" 加完整提问，整块读取会让提问出现两次。
// - 回答正文在 message-content 的 .markdown 里；正文中夹着引用来源的小标签
//   （source-inline-chip 等，显示为 "PNG"、"PNG + 4"），要先剔除。
// - 用户上传的图片是 img[data-test-id="uploaded-img"]。
const GEMINI_NOISE_SELECTORS = [
  '.cdk-visually-hidden', 'source-inline-chip', 'sources-carousel-inline', 'source-footnote',
  'sources-list', 'message-actions', 'mat-icon', 'gem-icon', 'button'
].join(', ');
// 判断图片时不排除 button：生成的图片通常包在"点击放大"的按钮里
const GEMINI_IMAGE_EXCLUDE = [
  '.cdk-visually-hidden', 'source-inline-chip', 'sources-carousel-inline', 'source-footnote',
  'sources-list', 'message-actions', 'mat-icon', 'gem-icon'
].join(', ');

function extractGeminiConversation() {
  const turns = document.querySelectorAll('user-query, model-response');
  if (turns.length === 0) return extractGeminiConversationLegacy();

  const messages = [];
  turns.forEach(el => {
    if (el.tagName.toLowerCase() === 'user-query') {
      const lines = Array.from(el.querySelectorAll('.query-text-line'));
      const text = lines.length > 0
        ? lines.map(line => getElementText(line).trim()).join('\n')
        : textWithout(el.querySelector('.query-text') || el, GEMINI_NOISE_SELECTORS);
      const attachments = collectGeminiImages(el.querySelectorAll('img[data-test-id="uploaded-img"]'), 'uploaded-image');
      const content = cleanMessageContent(text);
      if (content || attachments.length > 0) appendMessage(messages, 'user', content, { attachments });
    } else {
      const body = el.querySelector('message-content .markdown') || el.querySelector('.markdown') || el.querySelector('message-content');
      // Gemini 生成的图片：回答区域里的内容图片（排除图标、头像、来源标签里的小图）
      const generatedImgs = Array.from(el.querySelectorAll('img')).filter(img =>
        !img.closest(GEMINI_IMAGE_EXCLUDE) &&
        !img.closest('thinking-overlay') &&
        !/icon|avatar|sparkle|favicon/i.test(img.className + ' ' + (img.getAttribute('data-test-id') || '')) &&
        (img.naturalWidth === 0 || img.naturalWidth >= 96)
      );
      const attachments = collectGeminiImages(generatedImgs, 'generated-image');
      // 正文里的图片换成位置标记，导出时图片就出现在原来的位置
      const markers = new Map();
      generatedImgs.forEach(img => {
        const att = attachments.find(a => a.id === `gemini:${img.currentSrc || img.src}`);
        if (att) markers.set(img, attachmentMarker(att.id));
      });
      const content = body ? cleanMessageContent(textWithout(body, GEMINI_NOISE_SELECTORS, markers)) : '';
      if (content || attachments.length > 0) appendMessage(messages, 'model', content, { attachments });
    }
  });

  return messages;
}

// 取一个元素的可见文字，但去掉其中的某些子元素。
// 复制一份放到屏幕外再读 innerText，才能保留段落和列表的换行。
// imageMarkers：Map<原页面里的 img, 文字>，在复制品里把这些图片换成对应文字。
function textWithout(el, selectors, imageMarkers = null) {
  if (!el) return '';
  const clone = el.cloneNode(true);
  if (imageMarkers && imageMarkers.size > 0) {
    const originals = Array.from(el.querySelectorAll('img'));
    const copies = Array.from(clone.querySelectorAll('img'));
    originals.forEach((img, i) => {
      if (imageMarkers.has(img) && copies[i]) {
        // 图片常包在"点击放大"的按钮里，而按钮会被当作界面元素删掉；连同按钮一起换成标记
        const wrapper = copies[i].closest('button');
        const target = wrapper && clone.contains(wrapper) ? wrapper : copies[i];
        target.replaceWith(document.createTextNode(`\n${imageMarkers.get(img)}\n`));
      }
    });
  }
  clone.querySelectorAll(selectors).forEach(n => n.remove());
  // 复制品放进页面时，其中的图片和影片会被浏览器重新加载；读文字不需要它们
  clone.querySelectorAll('img, video, audio, picture, source, iframe').forEach(n => n.remove());
  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-100000px;top:0;width:800px;white-space:normal;';
  holder.appendChild(clone);
  document.body.appendChild(holder);
  const text = clone.innerText || clone.textContent || '';
  holder.remove();
  return text;
}

function collectGeminiImages(imgs, fallbackName) {
  const result = [];
  Array.from(imgs).forEach((img, i) => {
    const src = img.currentSrc || img.src || '';
    if (!/^(https:|blob:|data:)/.test(src)) return;
    const urls = [src];
    // Google 图片地址末尾的 =s512 / =w400-h300 是缩放参数，=s0 取原图；失败时退回页面上显示的那张
    if (/googleusercontent\.com\//.test(src) && /=[a-z0-9-]+$/i.test(src)) {
      urls.unshift(src.replace(/=[a-z0-9-]+$/i, '=s0'));
    }
    result.push({
      id: `gemini:${src}`,
      kind: 'image',
      name: fallbackName,
      source: { platform: 'gemini', urls }
    });
  });
  return result;
}

function extractGeminiConversationLegacy() {
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

    const content = cleanMessageContent(getElementText(el));

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
      const content = cleanMessageContent(getElementText(el));

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

// DeepSeek 的 class 名多为构建时生成的哈希，只有回答正文稳定地带 .ds-markdown。
// 做法：从回答节点向上找到"消息列表"那一层（它的子节点就是一条条消息），
// 含 .ds-markdown 的子节点是 DeepSeek 的回答，其余有文字的子节点是用户消息。
function findDeepSeekMessageList(replyEls) {
  const first = replyEls[0];
  let node = first.parentElement;

  while (node && node !== document.body) {
    const parent = node.parentElement;
    if (!parent) break;
    const containsAll = replyEls.every(el => parent.contains(el));
    if (containsAll && parent.children.length >= replyEls.length) {
      return parent;
    }
    node = parent;
  }
  return null;
}

function getDeepSeekReplyText(el) {
  const clone = el.cloneNode(true);
  // 去掉深度思考过程，只保留最终回答
  clone.querySelectorAll('[class*="think"], [class*="Think"]').forEach(n => n.remove());
  const markdowns = clone.querySelectorAll('.ds-markdown');
  const source = markdowns.length > 0 ? Array.from(markdowns).map(n => n.innerText || n.textContent || '').join('\n\n') : (clone.innerText || clone.textContent || '');
  return source;
}

function extractDeepSeekConversation() {
  const messages = [];
  const replyEls = Array.from(document.querySelectorAll('.ds-markdown'))
    // 嵌套在另一个 .ds-markdown 里的（例如思考块内部）不单独算
    .filter(el => !el.parentElement || !el.parentElement.closest('.ds-markdown'));

  if (replyEls.length === 0) return messages;

  const list = findDeepSeekMessageList(replyEls);
  if (!list) {
    replyEls.forEach(el => {
      const content = (el.innerText || el.textContent || '').trim();
      if (content) messages.push({ role: 'model', content });
    });
    return messages;
  }

  Array.from(list.children).forEach(child => {
    const isReply = !!child.querySelector('.ds-markdown') || child.classList.contains('ds-markdown');
    const raw = isReply ? getDeepSeekReplyText(child) : (child.innerText || child.textContent || '');
    const content = raw.replace(/\n{3,}/g, '\n\n').trim();
    if (content) {
      messages.push({ role: isReply ? 'model' : 'user', content });
    }
  });

  return messages;
}

// innerText 会按页面排版保留段落、列表、代码块的换行；textContent 会把它们挤成一行
function getElementText(el) {
  return (el.innerText || el.textContent || '');
}

// 平台界面上的按钮/提示文字，只在它们独占一行时才删除，
// 避免误伤正文（例如旧版本会把 "Moreover" 里的 "More" 删掉）
const UI_ONLY_LINES = new Set([
  'Copy code', 'Copy', 'Copy response', 'Edit', 'Edit prompt', 'More', 'Show thinking',
  'Use microphone', 'Add files', 'Collapse menu', 'Search (⌘⇧K)', 'New chat (⌘⇧O)'
]);

function cleanMessageContent(text) {
  if (!text) return '';

  return text
    .split('\n')
    .filter(line => !UI_ONLY_LINES.has(line.trim()) && !/^[0-9]+ \/ [0-9]+$/.test(line.trim()))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// 读屏用的隐藏标题（ChatGPT 的 "You said:" / "ChatGPT said:" 等）会混进文字里，
// 导出时又会再加一次说话人标签，看起来就"多了一个 You said"
const SPEAKER_LABEL_PREFIX = /^\s*(you said|user said|i said|chatgpt said|claude said|gemini said|deepseek said|assistant said|你说|您说|ChatGPT\s*说|ChatGPT\s*說)\s*[:：]\s*/i;

// 追加一条消息：同一角色的完全相同内容（同一条消息被读到两次）直接跳过；
// mergeSameRole 时，同一角色的相邻片段合并成一条（文字和附件都合并）
function appendMessage(messages, role, content, { mergeSameRole = false, attachments = [] } = {}) {
  const last = messages[messages.length - 1];
  const attachmentKey = list => (list || []).map(a => a.id).join('|');

  if (last && last.role === role) {
    if (last.content === content && attachmentKey(last.attachments) === attachmentKey(attachments)) return;
    if (mergeSameRole) {
      // 附件出现在一轮回答的中间（例如"正在生成" → 图片 → "已经生成好了"），
      // 在文字里留一个位置标记，导出时图片就出现在原来的位置
      const markers = attachments.map(a => attachmentMarker(a.id));
      last.content = [last.content, ...markers, content].filter(Boolean).join('\n\n');
      if (attachments.length > 0) {
        last.attachments = [...(last.attachments || []), ...attachments];
      }
      return;
    }
  }

  const message = { role, content };
  if (attachments.length > 0) message.attachments = attachments;
  messages.push(message);
}

// 所有平台、所有提取路径的出口：去掉混进来的说话人标签，再去掉相邻重复
function normalizeConversation(messages) {
  const result = [];
  (messages || []).forEach(m => {
    const content = String(m.content || '').replace(SPEAKER_LABEL_PREFIX, '').trim();
    const attachments = m.attachments || [];
    if (content || attachments.length > 0) appendMessage(result, m.role, content, { attachments });
  });
  return result;
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

    case PLATFORMS.DEEPSEEK:
      selectors = [
        'textarea#chat-input',
        'textarea',
        'div[contenteditable="true"]'
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
  console.log('[LumiFlow] Waiting for AI to complete response...');
  showPageToast('LumiFlow: waiting for the checkpoint…');
}

// popup 在等待期间经常被关掉（点一下页面就会关），所以直接在页面上提示进度
function showPageToast(text) {
  let toast = document.getElementById('lumiflow-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'lumiflow-toast';
    toast.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2147483647;' +
      'padding:10px 14px;border-radius:8px;background:#4a4270;color:#fff;' +
      'font:13px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.2);';
    document.body.appendChild(toast);
  }
  toast.textContent = text;
  clearTimeout(showPageToast._timer);
  showPageToast._timer = setTimeout(() => toast.remove(), 6000);
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
        '.font-claude-response',
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
    case PLATFORMS.DEEPSEEK:
      selectors = ['.ds-markdown'];
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
        // 找包含 CHECKPOINT 标记的元素（跳过我们自己发出去的压缩 prompt——它里面也有这两个标记）
        for (let i = messages.length - 1; i >= 0; i--) {
          const text = messages[i].innerText || messages[i].textContent || '';
          if (text.includes('<<<CHECKPOINT') && !isCompressionPromptEcho(text) && !isExistingCheckpoint(messages[i], text)) {
            console.log(`[getLastAIMessage] Found checkpoint in: ${selector}, index ${i}`);
            return messages[i];
          }
        }
        // 如果没找到 checkpoint，返回最后一个（同样不能是 prompt 本身）
        const last = messages[messages.length - 1];
        const lastText = last.innerText || last.textContent || '';
        if (isCompressionPromptEcho(lastText) || isExistingCheckpoint(last, lastText)) continue;
        console.log(`[getLastAIMessage] Using last element from: ${selector}`);
        return last;
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
    if (text.includes('<<<CHECKPOINT_START>>>') && text.includes('<<<CHECKPOINT_END>>>') && !isCompressionPromptEcho(text) && !isExistingCheckpoint(allElements[i], text)) {
      console.log('[getLastAIMessage] Found checkpoint via fallback search');
      return allElements[i];
    }
  }

  console.warn('[getLastAIMessage] No AI message found with any selector');
  return null;
}


// 对话里可能已经有上一次生成的 checkpoint。发送前把它们（元素和内容）记下来，
// 否则等待时会立刻把旧的那份当成新结果。
let existingCheckpointEls = new WeakSet();
let existingCheckpointTexts = new Set();

function snapshotExistingCheckpoints() {
  existingCheckpointEls = new WeakSet();
  existingCheckpointTexts = new Set();
  document.querySelectorAll('div, p, section, article, model-response, message-content').forEach(el => {
    const text = el.innerText || el.textContent || '';
    if (text.includes('<<<CHECKPOINT_END>>>')) {
      existingCheckpointEls.add(el);
      const cp = extractCheckpoint(text);
      if (cp) existingCheckpointTexts.add(cp);
    }
  });
}

function isExistingCheckpoint(el, text) {
  if (existingCheckpointEls.has(el)) return true;
  const cp = text.includes('<<<CHECKPOINT_END>>>') ? extractCheckpoint(text) : null;
  return !!cp && existingCheckpointTexts.has(cp);
}

// 用户消息里的压缩 prompt 同样含有 START/END 标记；靠 prompt 独有的文字把它认出来
function isCompressionPromptEcho(text) {
  return text.includes(CHECKPOINT_PROMPT_TITLE);
}

function extractCheckpoint(fullText) {
  const startMarker = '<<<CHECKPOINT_START>>>';
  const endMarker = '<<<CHECKPOINT_END>>>';

  // 取最后一对标记：AI 有时会在正文前先复述一遍"我会用 <<<CHECKPOINT_START>>> ... 输出"
  const endIdx = fullText.lastIndexOf(endMarker);
  const startIdx = endIdx === -1 ? -1 : fullText.lastIndexOf(startMarker, endIdx);

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
    case PLATFORMS.DEEPSEEK:
      return '.ds-markdown';
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