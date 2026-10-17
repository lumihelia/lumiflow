// background.js - LumiFlow Service Worker
// =========================================
// Handles API calls to bypass CORS restrictions
// Supports: Gemini, OpenAI, Anthropic
// =========================================

console.log('LumiFlow: Service Worker started');

// 压缩 prompt 模板与 popup 共用
importScripts('prompts.js');

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

    if (request.action === 'compressConversation') {
        compressConversation(request.tabId, request.apiSettings)
            .then(result => sendResponse({ success: true, ...result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
});

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

    const conversationText = conversation.map(m =>
        `${m.role === 'user' ? 'Human' : 'AI'}: ${m.content}`
    ).join('\n\n');

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
