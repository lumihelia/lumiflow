// background.js - LumiFlow Service Worker
// =========================================
// Handles API calls to bypass CORS restrictions
// Supports: Gemini, OpenAI, Anthropic
// =========================================

console.log('LumiFlow: Service Worker started');

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
});

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
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
            errorData = JSON.parse(errorText);
        } catch (e) {
            throw new Error(`Gemini API failed (${response.status}): ${errorText.substring(0, 200)}`);
        }
        throw new Error(errorData.error?.message || `Gemini API failed (${response.status})`);
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
