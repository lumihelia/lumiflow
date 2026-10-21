// background.js - LumiFlow Service Worker
// =========================================
// Handles API calls to bypass CORS restrictions
// Supports: Gemini, OpenAI, Anthropic
// =========================================

console.log('LumiFlow: Service Worker started');

// 压缩 prompt 模板（prompts.js）和附件标记的处理（export.js）与 popup 共用。
// Chrome 以 service worker 运行，这里加载；Firefox 以后台页面运行，
// manifest 的 background.scripts 已先加载 prompts.js，且那里没有 importScripts。
if (typeof importScripts === 'function') {
    importScripts('prompts.js', 'export.js');
}

// 🆕 Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
    console.log('[LumiFlow] Command received:', command);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: command === 'compress' ? 'auto_compress' : 'keyboard_inject',
                autoSend: command === 'compress'
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('[LumiFlow] Command error:', chrome.runtime.lastError);
                }
            });
        }
    });
});

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'callAPI') {
        handleAPICall(request)
            .then(result => sendResponse({ success: true, data: result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep channel open for async response
    }

    if (request.action === 'openPermissionPage') {
        chrome.tabs.create({ url: chrome.runtime.getURL(`permissions.html?platform=${encodeURIComponent(request.platform || '')}`) });
        sendResponse({ ok: true });
        return false;
    }

    if (request.action === 'captureVisibleTab') {
        captureSenderTab(sender)
            .then(dataUrl => sendResponse({ ok: true, dataUrl }))
            .catch(error => sendResponse({ ok: false, error: error.message }));
        return true;
    }

    if (request.action === 'fetchBinary') {
        fetchBinaryForZip(request.url)
            .then(result => sendResponse({ ok: true, ...result }))
            .catch(error => sendResponse({ ok: false, error: error.message }));
        return true;
    }

    if (request.action === 'compressConversation') {
        compressConversation(request.tabId, request.apiSettings)
            .then(result => sendResponse({ success: true, ...result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
});

// ========================================
// ZIP 附件下载
// ========================================
// 页面脚本受网站的跨域限制，拿不到放在其他域名上的文件（ChatGPT 的在 oaiusercontent.com，Gemini 的在 googleusercontent.com）。
// 后台在用户授权了对应网站后可以下载，再以 base64 交回页面打包。
// 只接受下面这些域名，避免被当成任意地址的下载代理。
const ZIP_DOWNLOAD_HOSTS = ['oaiusercontent.com', 'googleusercontent.com'];

async function fetchBinaryForZip(url) {
    const parsed = new URL(url);
    const allowed = parsed.protocol === 'https:' &&
        ZIP_DOWNLOAD_HOSTS.some(host => parsed.hostname === host || parsed.hostname.endsWith('.' + host));
    if (!allowed) {
        throw new Error('host not allowed');
    }

    if (chrome.permissions && chrome.permissions.contains) {
        const granted = await chrome.permissions.contains({ origins: [`https://${parsed.hostname}/*`] }).catch(() => true);
        if (!granted) {
            throw new Error(`NO_ACCESS: LumiFlow does not have access to ${parsed.hostname} yet`);
        }
    }

    // 先带着登录状态请求（Gemini 上传的图片可能需要），网络层失败再不带登录状态试一次。
    // 失败时尽量写出真实原因，方便排查：网络错误、被跳转到哪里、HTTP 状态码、拿到的是网页还是图片。
    // 网络卡住时不要无限等待
    const timed = (options) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30000);
        return fetch(parsed.href, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
    };

    let response;
    let firstError = null;
    try {
        response = await timed({ credentials: 'include' });
    } catch (error) {
        firstError = error;
        try {
            response = await timed({ credentials: 'omit' });
        } catch (secondError) {
            throw new Error(`network error from ${parsed.hostname}: ${firstError.message}${await describeRedirect(parsed.href)}`);
        }
    }

    const finalHost = response.url ? new URL(response.url).hostname : parsed.hostname;
    const redirectNote = response.redirected && finalHost !== parsed.hostname ? ` after redirect to ${finalHost}` : '';
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${parsed.hostname}${redirectNote}`);
    }
    const contentType = response.headers.get('content-type') || '';
    if (/text\/html/i.test(contentType)) {
        throw new Error(`got a web page instead of the file${redirectNote} (sign-in required?)`);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return {
        base64: btoa(binary),
        contentType
    };
}

// 截取发出请求的那个分页的当前画面（用于下载不到原图时，从画面上保存图片）。
// 浏览器限制每秒最多截取两次，所以两次之间至少间隔 600ms；
// 分页不在前台时截到的会是别的画面，所以先确认它仍是当前分页。
let lastCaptureAt = 0;

async function captureSenderTab(sender) {
    if (!sender.tab) throw new Error('no tab');
    const tab = await chrome.tabs.get(sender.tab.id);
    if (!tab.active) throw new Error('switch back to the conversation tab to capture images');

    const wait = Math.max(0, lastCaptureAt + 600 - Date.now());
    if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
    lastCaptureAt = Date.now();

    return await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
}

// 网络层失败时，看看是不是被跳转到了另一个网站（跳转目标没有权限时，浏览器会直接拦下）
async function describeRedirect(url) {
    try {
        const probe = await fetch(url, { credentials: 'include', redirect: 'manual' });
        if (probe.type === 'opaqueredirect') return ' (the file host redirected to another site)';
        return ` (direct request returned HTTP ${probe.status})`;
    } catch (error) {
        return '';
    }
}

// ========================================
// COMPRESS (API MODE)
// ========================================
// 整个流程（读对话 → 调 API → 存结果）都在 Service Worker 里跑，
// popup 在等待期间被关掉也不影响；结果写进 lastCheckpoint，popup 下次打开时收进 segments。

function sendToTab(tabId, message) {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            resolve(response);
        });
    });
}

async function compressConversation(tabId, apiSettings) {
    let response;
    try {
        response = await sendToTab(tabId, { action: 'get_conversation' });
    } catch (error) {
        // 页面刚刷新时 content script 可能还没就绪，稍等再试一次
        await new Promise(r => setTimeout(r, 800));
        response = await sendToTab(tabId, { action: 'get_conversation' });
    }

    if (!response || response.status !== 'success') {
        throw new Error((response && response.message) || 'Could not read the conversation. Try refreshing the page.');
    }

    const conversation = response.conversation || [];
    if (conversation.length === 0) {
        throw new Error('No messages found on page');
    }

    // 图片和附件本身不发给模型，但留下名字，让 checkpoint 知道这里曾有哪些材料
    const conversationText = conversation.map(m => {
        const label = a => `[${a.kind === 'image' ? 'Image' : 'File'}: ${a.name}]`;
        const raw = String(m.content || '');
        const leading = (m.attachments || []).filter(a => !raw.includes(attachmentMarker(a.id))).map(label);
        const text = replaceAttachmentMarkers(raw, m.attachments, label);
        return `${m.role === 'user' ? 'Human' : 'AI'}: ${[...leading, text].filter(Boolean).join('\n')}`;
    }).join('\n\n');

    const checkpoint = await handleAPICall({
        provider: apiSettings.provider,
        apiKey: apiSettings.key,
        prompt: buildCompressionPrompt(conversationText)
    });

    const result = {
        checkpoint,
        timestamp: new Date().toISOString(),
        platform: response.platform || 'unknown',
        originalLength: conversationText.length,
        messageCount: conversation.length
    };

    await chrome.storage.local.set({ lastCheckpoint: result });
    return result;
}

async function handleAPICall(request) {
    const { provider, apiKey, prompt } = request;

    switch (provider) {
        case 'gemini':
            return await callGeminiAPI(prompt, apiKey);
        case 'openai':
            return await callOpenAIAPI(prompt, apiKey);
        case 'anthropic':
            return await callAnthropicAPI(prompt, apiKey);
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}

// 模型名统一放在这里。2024 年写死的 gemini-2.0-flash / gpt-4-turbo-preview /
// claude-3-5-sonnet-20241022 都已停用，压缩会直接失败。
const MODELS = {
    // 官方别名：始终指向当前的 Flash 模型，切换前 Google 会提前两周通知
    gemini: 'gemini-flash-latest',
    // OpenAI 推荐的性价比档（Responses API）
    openai: 'gpt-6.1-sol',
    anthropic: 'claude-opus-5-5'
};

// checkpoint 通常几百到一两千字；留足空间，避免长对话的 checkpoint 被截断
const MAX_OUTPUT_TOKENS = 16000;

async function readErrorMessage(response, providerName) {
    const errorText = await response.text();
    let message = '';
    try {
        const errorData = JSON.parse(errorText);
        message = (errorData.error && (errorData.error.message || errorData.error.type)) || '';
    } catch (e) {
        if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
            message = 'returned an HTML error page. Check API key or network.';
        } else {
            message = errorText.substring(0, 200);
        }
    }
    return `${providerName} API error (${response.status}): ${message || response.statusText}`;
}

// ========================================
// GEMINI API
// ========================================

async function callGeminiAPI(prompt, apiKey) {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.gemini}:generateContent`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS }
            })
        }
    );

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Gemini'));
    }

    const data = await response.json();
    const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
    // 跳过思考过程（thought: true），只取正文
    const text = (parts || [])
        .filter(p => typeof p.text === 'string' && !p.thought)
        .map(p => p.text)
        .join('');

    if (!text) {
        throw new Error('Gemini returned empty response');
    }
    return text;
}

// ========================================
// OPENAI API (Responses API)
// ========================================

async function callOpenAIAPI(prompt, apiKey) {
    const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: MODELS.openai,
            input: prompt,
            max_output_tokens: MAX_OUTPUT_TOKENS
        })
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'OpenAI'));
    }

    const data = await response.json();
    // output 里可能先有 reasoning 项，正文在 type === 'message' 的项里
    const text = (data.output || [])
        .filter(item => item.type === 'message' && Array.isArray(item.content))
        .flatMap(item => item.content)
        .filter(c => c.type === 'output_text' && typeof c.text === 'string')
        .map(c => c.text)
        .join('');

    if (!text) {
        throw new Error('OpenAI returned empty response');
    }
    return text;
}

// ========================================
// ANTHROPIC API
// ========================================

async function callAnthropicAPI(prompt, apiKey) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
            // 安全分类器拒绝时，由服务端自动换用合适的模型重试
            'anthropic-beta': 'server-side-fallback-2026-07-01'
        },
        body: JSON.stringify({
            model: MODELS.anthropic,
            max_tokens: MAX_OUTPUT_TOKENS,
            fallbacks: 'default',
            messages: [{ role: 'user', content: prompt }]
        })
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Anthropic'));
    }

    const data = await response.json();
    if (data.stop_reason === 'refusal') {
        throw new Error('Anthropic declined this request. Try Manual Mode for this conversation.');
    }

    // 新模型的回复里可能先有 thinking 块，正文在 type === 'text' 的块里
    const text = (data.content || [])
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('');

    if (!text) {
        throw new Error('Anthropic returned empty response');
    }
    return text;
}
