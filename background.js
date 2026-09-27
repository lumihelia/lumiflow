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

// ========================================
// GEMINI API
// ========================================

async function callGeminiAPI(prompt, apiKey) {
    const requestBody = JSON.stringify({
        contents: [{
            parts: [{ text: prompt }]
        }]
    });

    console.log('[GEMINI] Request body length:', requestBody.length, 'chars');
    console.log('[GEMINI] Prompt length:', prompt.length, 'chars');

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': requestBody.length.toString()
            },
            body: requestBody
        }
    );

    if (!response.ok) {
        console.error('[GEMINI] API request failed:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('[GEMINI] Error response (first 500 chars):', errorText.substring(0, 500));

        let errorData;
        try {
            errorData = JSON.parse(errorText);
            throw new Error(errorData.error?.message || `Gemini API error (${response.status})`);
        } catch (e) {
            // Not JSON, probably HTML error page
            if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
                throw new Error(`Gemini API returned HTML error page (${response.status}). Check API key or network.`);
            }
            throw new Error(`Gemini API failed (${response.status}): ${errorText.substring(0, 200)}`);
        }
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]) {
        throw new Error('Gemini returned empty response');
    }

    return data.candidates[0].content.parts[0].text;
}

// ========================================
// OPENAI API
// ========================================

async function callOpenAIAPI(prompt, apiKey) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4-turbo-preview',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 2000
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API request failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// ========================================
// ANTHROPIC API (Now works via Service Worker!)
// ========================================

async function callAnthropicAPI(prompt, apiKey) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2000,
            messages: [{ role: 'user', content: prompt }]
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Anthropic API request failed');
    }

    const data = await response.json();
    return data.content[0].text;
}
