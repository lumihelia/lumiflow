/*
 * LumiFlow - AI Context Manager
 * Copyright (C) 2026 Helia (@LumiHelia)
 * 
 * Licensed under AGPLv3 - Closed-source forks prohibited.
 * See LICENSE file for details.
 */

// ========================================
// LumiFlow v2.1 - Popup Script
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    const modeToggle = document.getElementById('mode-toggle');
    const autoBtn = document.getElementById('auto-compress-btn');
    const manualAbsorbBtn = document.getElementById('manual-absorb-btn');
    const injectBtn = document.getElementById('inject-btn');
    const messageArea = document.getElementById('message-area');
    const statsArea = document.getElementById('stats-area');
    const previewArea = document.getElementById('preview-area');
    const segmentsContainer = document.getElementById('segments-container');
    const checkpointStats = document.getElementById('checkpoint-stats');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const copyAllBtn = document.getElementById('copy-all-btn');

    // Settings
    const settingsBtn = document.getElementById('settings-btn');
    const settingsPanel = document.getElementById('settings-panel');
    const closeSettingsBtn = document.getElementById('close-settings-btn');

    let segments = []; // Array of segment objects
    let draggedSegment = null;
    let isAutoMode = true;

    // Initialize
    init();

    async function init() {
        // Load mode preference
        const savedMode = await getFromStorage('compressionMode');
        isAutoMode = savedMode !== 'manual';
        updateModeUI();
        
        // Load stats if on supported platform
        loadStats();
        
        // Load segments
        await loadSegments();
    }

    // ========================================
    // MODE TOGGLE
    // ========================================

    const toggleSwitch = document.getElementById('mode-toggle-switch');
    
    // Handle toggle switch clicks
    toggleSwitch.addEventListener('click', () => {
        modeToggle.checked = !modeToggle.checked;
        isAutoMode = modeToggle.checked;
        saveToStorage('compressionMode', isAutoMode ? 'auto' : 'manual');
        updateModeUI();
    });

    modeToggle.addEventListener('change', () => {
        isAutoMode = modeToggle.checked;
        saveToStorage('compressionMode', isAutoMode ? 'auto' : 'manual');
        updateModeUI();
    });

    function updateModeUI() {
        modeToggle.checked = isAutoMode;
        const modeText = document.getElementById('mode-text');
        const modeDescription = document.querySelector('.mode-label-description');
        
        // Update toggle visual
        if (isAutoMode) {
            toggleSwitch.classList.add('active');
            modeText.textContent = 'Auto Mode';
            modeDescription.textContent = 'AI generates checkpoint';
            autoBtn.style.display = 'flex';
            manualAbsorbBtn.style.display = 'none';
        } else {
            toggleSwitch.classList.remove('active');
            modeText.textContent = 'Manual Mode';
            modeDescription.textContent = 'Select AI response';
            autoBtn.style.display = 'none';
            manualAbsorbBtn.style.display = 'flex';
        }
    }

    // ========================================
    // AUTO COMPRESS
    // ========================================

    autoBtn.addEventListener('click', async () => {
        try {
            showMessage("Starting compression...");
            autoBtn.disabled = true;
            
            const tab = await getActiveTab();
            if (!validateTab(tab)) {
                autoBtn.disabled = false;
                return;
            }

            // Check if API is enabled
            const apiSettings = await getFromStorage('apiSettings') || {};
            
            if (apiSettings.enabled && apiSettings.key) {
                // Use API backend compression (doesn't pollute conversation!)
                await compressWithAPIBackend(tab, apiSettings);
            } else {
                // Use traditional in-chat compression
                await compressInChat(tab);
            }

        } catch (err) {
            autoBtn.disabled = false;
            handleError(err, "Auto-compress");
        }
    });

    async function compressWithAPIBackend(tab, apiSettings) {
        showMessage("Using API backend (won't pollute conversation)...", "info");
        
        // Get conversation from current tab
        chrome.tabs.sendMessage(tab.id, {
            action: "get_conversation"
        }, async (response) => {
            if (chrome.runtime.lastError || !response || response.status !== 'success') {
                autoBtn.disabled = false;
                showMessage("Failed to get conversation", "error");
                return;
            }

            const conversation = response.conversation;
            showMessage(`Compressing ${conversation.length} messages with ${apiSettings.provider.toUpperCase()}...`, "info");

            try {
                // Build conversation text
                const conversationText = conversation.map(m => 
                    `${m.role === 'user' ? 'Human' : 'AI'}: ${m.content}`
                ).join('\n\n');
                
                // Call API to compress
                const checkpoint = await compressTextWithAPI(conversationText, apiSettings);
                
                // Add as new segment
                addSegment(checkpoint, response.platform);
                
                showMessage(`Checkpoint created via ${apiSettings.provider.toUpperCase()} API!`);
                autoBtn.disabled = false;
                
            } catch (err) {
                console.error('[API] Compression error:', err);
                showMessage(`API compression failed: ${err.message}`, "error");
                autoBtn.disabled = false;
            }
        });
    }

    async function compressInChat(tab) {
        // Send auto-compress command (original method - injects prompt into chat)
        chrome.tabs.sendMessage(tab.id, {
            action: "auto_compress",
            autoSend: true
        }, async (response) => {
            autoBtn.disabled = false;
            
            if (chrome.runtime.lastError) {
                showMessage("Please refresh the page and try again", "error");
                return;
            }

            if (response.status === 'success') {
                // Add as new segment
                addSegment(response.checkpoint, response.platform);
                showMessage("Checkpoint created!");
                
            } else if (response.status === 'pending_send') {
                showMessage("Prompt injected. Click Send, then use Manual Absorb.", "info");
                
            } else if (response.status === 'timeout') {
                showMessage("Timeout. Please select AI response and use Manual Absorb.", "info");
                
            } else {
                showMessage(response.message || "Error", "error");
            }
        });
    }

    // ========================================
    // MANUAL ABSORB
    // ========================================

    manualAbsorbBtn.addEventListener('click', async () => {
        try {
            console.log('[DEBUG] Manual Absorb clicked');
            showMessage("Absorbing selection...");
            
            const tab = await getActiveTab();
            console.log('[DEBUG] Active tab:', tab?.id, tab?.url);
            if (!validateTab(tab)) return;

            chrome.tabs.sendMessage(tab.id, {
                action: "manual_absorb"
            }, async (response) => {
                console.log('[DEBUG] Response received:', response);
                
                if (chrome.runtime.lastError) {
                    console.error('[DEBUG] Runtime error:', chrome.runtime.lastError);
                    showMessage("Please refresh the page", "error");
                    return;
                }

                if (response.status === 'success') {
                    const newContent = response.checkpoint;
                    const platform = response.platform;
                    
                    console.log('[DEBUG] Adding segment:', newContent.length, 'chars');
                    
                    // Simply add as new segment
                    addSegment(newContent, platform);
                    
                    const totalChars = segments.reduce((sum, s) => sum + s.content.length, 0);
                    showMessage(`Segment added (${segments.length} total, ${totalChars} chars)`);
                    
                } else {
                    console.error('[DEBUG] Failed:', response.message);
                    showMessage(response.message, "error");
                }
            });

        } catch (err) {
            console.error('[DEBUG] Exception:', err);
            handleError(err, "Manual absorb");
        }
    });

    // ========================================
    // INJECT
    // ========================================

    injectBtn.addEventListener('click', async () => {
        try {
            // Check if we have segments
            if (segments.length === 0) {
                showMessage("No segments found. Create checkpoint first!", "error");
                return;
            }

            // Combine all segments
            let checkpointText = getCombinedCheckpoint();
            
            // Check if checkpoint is too long and needs compression
            if (checkpointText.length > 800) {
                const apiSettings = await getFromStorage('apiSettings') || {};

                if (apiSettings.enabled && apiSettings.key) {
                    // Ask user preference: Compress or Direct Inject
                    const useCompression = confirm(
                        `Long Text Detected (${checkpointText.length} chars).\n\n` +
                        `Use API to compress before injecting? (Recommended)\n\n` +
                        `Cancel = Direct Inject (Raw)`
                    );

                    if (useCompression) {
                        // Auto-compress with API before injection
                        showMessage(`Compressing ${checkpointText.length} chars before injection...`, "info");

                        try {
                            checkpointText = await compressTextWithAPI(checkpointText, apiSettings);
                            showMessage(`Compressed to ${checkpointText.length} chars, injecting...`, "info");

                        } catch (err) {
                            console.error('[Compression] Failed:', err);

                            // Ask if user wants to continue with uncompressed
                            const continueAnyway = confirm(
                                `Compression failed: ${err.message}\n\n` +
                                `Continue with uncompressed text (${checkpointText.length} chars)?`
                            );

                            if (!continueAnyway) {
                                showMessage("Injection cancelled", "info");
                                return;
                            }
                        }
                    } else {
                        // User chose to skip compression (Direct Inject)
                        showMessage("Skipping compression...", "info");
                    }

                } else {
                    // No API configured, warn user but allow direct injection
                    const continueAnyway = confirm(
                        `Checkpoint is ${checkpointText.length} characters (quite long).\n\n` +
                        `This might be too much for the AI to process effectively.\n\n` +
                        `OK = Direct Inject (Risk of truncation)\n` +
                        `Cancel = Abort`
                    );

                    if (!continueAnyway) {
                        showMessage("Injection cancelled", "info");
                        return;
                    }
                }
            }

            showMessage("Injecting context...");

            const tab = await getActiveTab();
            if (!validateTab(tab)) return;

            chrome.tabs.sendMessage(tab.id, {
                action: "inject",
                text: checkpointText
            }, async (response) => {
                if (chrome.runtime.lastError) {
                    showMessage("Please refresh the page", "error");
                    return;
                }

                if (response.status === 'success') {
                    showMessage("Context injected! Click Send to continue.");
                    
                } else if (response.status === 'clipboard') {
                    showMessage("Copied to clipboard (input not found)", "info");
                    
                } else {
                    showMessage(response.message || "Error", "error");
                }
            });

        } catch (err) {
            handleError(err, "Inject");
        }
    });
    // ========================================
    // SETTINGS PANEL
    // ========================================

    const apiToggleSwitch = document.getElementById('api-toggle-switch');
    const apiEnabled = document.getElementById('api-enabled');
    const apiProviderSection = document.getElementById('api-provider-section');
    const apiKeySection = document.getElementById('api-key-section');
    const saveApiBtn = document.getElementById('save-api-btn');
    const showApiBtn = document.getElementById('show-api-btn');
    const clearApiBtn = document.getElementById('clear-api-btn');
    const apiStatusText = document.getElementById('api-status-text');
    const apiKeyInput = document.getElementById('api-key');
    const apiProviderSelect = document.getElementById('api-provider');

    console.log('[DEBUG] Settings elements:', {
        apiToggleSwitch,
        apiEnabled,
        apiProviderSection,
        apiKeySection,
        saveApiBtn,
        settingsBtn,
        settingsPanel,
        closeSettingsBtn
    });

    // Settings button
    if (!settingsBtn) {
        console.error('[ERROR] settingsBtn not found!');
    } else {
        console.log('[DEBUG] Setting up settings button');
        settingsBtn.addEventListener('click', async () => {
            console.log('[DEBUG] Settings button clicked!');
            try {
                settingsPanel.style.display = 'block';
                
                // Load saved settings
                const apiSettings = await getFromStorage('apiSettings') || {};
                console.log('[Settings] Loaded:', apiSettings);
                
                if (apiEnabled) {
                    apiEnabled.checked = apiSettings.enabled || false;
                }
                
                // Load provider and key
                const providerSelect = document.getElementById('api-provider');
                const keyInput = document.getElementById('api-key');
                
                if (providerSelect && apiSettings.provider) {
                    providerSelect.value = apiSettings.provider;
                }
                if (keyInput && apiSettings.key) {
                    keyInput.value = apiSettings.key;
                }
                
                updateApiUI(apiSettings.enabled);
            } catch (err) {
                console.error('[ERROR] Settings click handler:', err);
            }
        });
    }

    // Close settings
    closeSettingsBtn.addEventListener('click', () => {
        settingsPanel.style.display = 'none';
    });

    // API Toggle
    if (apiToggleSwitch && apiEnabled) {
        apiToggleSwitch.addEventListener('click', () => {
            apiEnabled.checked = !apiEnabled.checked;
            updateApiUI(apiEnabled.checked);
        });
    }

    function updateApiUI(enabled) {
        if (apiToggleSwitch) {
            if (enabled) {
                apiToggleSwitch.classList.add('active');
            } else {
                apiToggleSwitch.classList.remove('active');
            }
        }
        
        if (apiProviderSection) {
            apiProviderSection.style.display = enabled ? 'flex' : 'none';
        }
        if (apiKeySection) {
            apiKeySection.style.display = enabled ? 'flex' : 'none';
        }
        if (saveApiBtn) {
            saveApiBtn.style.display = enabled ? 'block' : 'none';
        }
    }

    // Load and display saved API settings
    async function loadAndDisplayApiSettings() {
        const settings = await getFromStorage('apiSettings');
        
        if (settings && settings.enabled && settings.key) {
            // API is configured
            apiEnabled.checked = true;
            updateApiUI(true);
            
            // Set provider
            if (apiProviderSelect && settings.provider) {
                apiProviderSelect.value = settings.provider;
            }
            
            // Show masked key
            if (apiKeyInput) {
                const maskedKey = maskApiKey(settings.key);
                apiKeyInput.value = maskedKey;
                apiKeyInput.dataset.savedKey = settings.key; // Store original key
                apiKeyInput.dataset.isMasked = 'true';
            }
            
            // Update status text
            updateApiStatus('saved', settings.provider);
        } else {
            // No API configured
            apiEnabled.checked = false;
            updateApiUI(false);
            updateApiStatus('not-configured');
        }
    }

    // Mask API key for display (show first 8 and last 4 chars)
    function maskApiKey(key) {
        if (!key || key.length < 12) return '***';
        const start = key.substring(0, 8);
        const end = key.substring(key.length - 4);
        return `${start}...${end}`;
    }

    // Update API status text
    function updateApiStatus(status, provider = '') {
        if (!apiStatusText) return;
        
        switch(status) {
            case 'saved':
                const providerName = {
                    'gemini': 'Gemini',
                    'openai': 'OpenAI', 
                    'anthropic': 'Claude'
                }[provider] || provider;
                apiStatusText.textContent = `Saved (${providerName})`;
                apiStatusText.className = 'help-text success';
                break;
            case 'not-configured':
                apiStatusText.textContent = 'Your key is stored locally and never sent to our servers';
                apiStatusText.className = 'help-text';
                break;
            case 'modified':
                apiStatusText.textContent = 'Click "Save" to apply changes';
                apiStatusText.className = 'help-text warning';
                break;
        }
    }

    // Show/Hide API Key
    if (showApiBtn && apiKeyInput) {
        showApiBtn.addEventListener('click', () => {
            if (apiKeyInput.type === 'password') {
                // Show the key
                if (apiKeyInput.dataset.isMasked === 'true' && apiKeyInput.dataset.savedKey) {
                    // If it's masked, show the real saved key
                    apiKeyInput.value = apiKeyInput.dataset.savedKey;
                }
                apiKeyInput.type = 'text';
                showApiBtn.textContent = '🙈';
                showApiBtn.title = 'Hide Key';
            } else {
                // Hide the key
                apiKeyInput.type = 'password';
                showApiBtn.textContent = '👁️';
                showApiBtn.title = 'Show Key';
            }
        });
    }

    // Clear API Settings
    if (clearApiBtn) {
        clearApiBtn.addEventListener('click', async () => {
            const confirmed = confirm(
                'Clear all API settings?\n\n' +
                'This will delete your saved API key and disable API compression.'
            );
            
            if (confirmed) {
                // Clear storage
                await saveToStorage('apiSettings', {
                    enabled: false,
                    provider: 'gemini',
                    key: ''
                });
                
                // Reset UI
                apiEnabled.checked = false;
                updateApiUI(false);
                if (apiKeyInput) {
                    apiKeyInput.value = '';
                    delete apiKeyInput.dataset.savedKey;
                    delete apiKeyInput.dataset.isMasked;
                    apiKeyInput.type = 'password';
                }
                if (apiProviderSelect) {
                    apiProviderSelect.value = 'gemini';
                }
                updateApiStatus('not-configured');
                
                showMessage('API settings cleared', 'success');
            }
        });
    }

    // Detect when user starts typing (unmask for editing)
    if (apiKeyInput) {
        apiKeyInput.addEventListener('focus', () => {
            if (apiKeyInput.dataset.isMasked === 'true') {
                // User wants to edit, clear the masked value
                apiKeyInput.value = '';
                delete apiKeyInput.dataset.isMasked;
                updateApiStatus('modified');
            }
        });
        
        apiKeyInput.addEventListener('input', () => {
            // User is typing, mark as modified
            if (apiKeyInput.dataset.savedKey && apiKeyInput.value !== apiKeyInput.dataset.savedKey) {
                updateApiStatus('modified');
            }
        });
    }

    // Provider change detection
    if (apiProviderSelect) {
        apiProviderSelect.addEventListener('change', () => {
            updateApiStatus('modified');
        });
    }

    // Save API settings
    if (saveApiBtn) {
        saveApiBtn.addEventListener('click', async () => {
            const provider = apiProviderSelect ? apiProviderSelect.value : 'gemini';
            const key = apiKeyInput ? apiKeyInput.value.trim() : '';

            if (apiEnabled && apiEnabled.checked && !key) {
                showMessage("Please enter an API key", "error");
                return;
            }

            await saveToStorage('apiSettings', {
                enabled: apiEnabled ? apiEnabled.checked : false,
                provider: provider,
                key: key
            });

            // Update UI to show saved state
            if (key && apiKeyInput) {
                const maskedKey = maskApiKey(key);
                apiKeyInput.value = maskedKey;
                apiKeyInput.dataset.savedKey = key;
                apiKeyInput.dataset.isMasked = 'true';
                apiKeyInput.type = 'password';
                if (showApiBtn) {
                    showApiBtn.textContent = '👁️';
                    showApiBtn.title = 'Show Key';
                }
            }

            updateApiStatus('saved', provider);
            showMessage("API settings saved", "success");
            
            // Don't close the panel, let user see the confirmation
            setTimeout(() => {
                settingsPanel.style.display = 'none';
            }, 1500);
        });
    }

    // Load saved settings when settings panel opens
    if (settingsBtn) {
        settingsBtn.addEventListener('click', async () => {
            settingsPanel.style.display = 'block';
            await loadAndDisplayApiSettings();
        });
    }

    // ========================================
    // COPY ALL (SCRAPE & SAVE)
    // ========================================


    if (copyAllBtn) {
        copyAllBtn.addEventListener('click', async () => {
            try {
                showMessage("Scraping & Cleaning conversation...", "info");

                const tab = await getActiveTab();
                if (!validateTab(tab)) return;

                // 1. Content Script Communication  
                chrome.tabs.sendMessage(tab.id, {
                action: "get_conversation"
                }, async (response) => {
                    if (chrome.runtime.lastError || !response || response.status !== 'success') {
                        showMessage("Failed to capture conversation", "error");
                        return;
                    }

                    const conversation = response.conversation;
                    if (conversation.length === 0) {
                        showMessage("No messages found on page", "info");
                        return;
                 }

                // 2. Format conversation with clean spacing

                const markdownText = conversation.map(m => {
                    const role = m.role === 'user' ? 'User said:' : 'AI said:';
                    const cleanContent = sanitizeContent(m.content);

                    if (!cleanContent) return null;

                    // Single newline: role directly followed by content (no gap)
                    return `${role}\n${cleanContent}`;
                })
                .filter(item => item !== null)
                .join('\n\n'); // Double newline between messages (1 blank line)
                

                // 3. Segments Replacement Confirmation
                if (segments.length > 0) {
                    const shouldReplace = confirm(
                        `Preview area has ${segments.length} segment(s).\n\n` +
                        `Replace with full conversation from this page?`
                    );

                    if (!shouldReplace) {
                        showMessage("Operation cancelled", "info");
                        return; 
                    }
                    segments = []; //
                }

                // 4. New Segment Creation
                const newSegment = {
                    id: Date.now(),
                    content: markdownText,
                    platform: response.platform || 'unknown',
                    timestamp: new Date().toISOString(),
                    collapsed: false
                };

                segments.push(newSegment);
                renderSegments();
                updateCheckpointStats();
                await saveSegments();

                // 5. Double Output Strategy
                await navigator.clipboard.writeText(markdownText);

                showMessage(`Success! ${conversation.length} msgs captured & cleaned.`, "success");
            });

        } catch (err) {
            console.error('[ERROR] Copy All failed:', err);
            handleError(err, "Copy All");
        }
    });
}

    // ========================================
    // CLEAR ALL SEGMENTS
    // ========================================

    if (!clearAllBtn) {
        console.error('[ERROR] clearAllBtn not found!');
    } else {
        console.log('[DEBUG] Setting up clear all button');
        clearAllBtn.addEventListener('click', async () => {
            console.log('[DEBUG] Clear All button clicked!');
            try {
                if (segments.length === 0) {
                    showMessage("No segments to clear", "info");
                    return;
                }

                const confirmed = confirm(`Clear all ${segments.length} segments? This cannot be undone.`);
                
                if (!confirmed) {
                    return;
                }

                segments = [];
                renderSegments();
                updateCheckpointStats();
                await saveSegments();
                showMessage("All segments cleared");
            } catch (err) {
                console.error('[ERROR] Clear All click handler:', err);
                showMessage("Failed to clear segments", "error");
            }
        });
    }

    // ========================================
    // API COMPRESSION FUNCTIONS
    // ========================================

    async function compressTextWithAPI(text, apiSettings) {
        const { provider, key } = apiSettings;
        
        // Detect if text is primarily Chinese
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const totalChars = text.length;
        const isChinese = chineseChars / totalChars > 0.3;
        
        const languageInstruction = isChinese 
            ? "CRITICAL: Output MUST be in Chinese (中文)."
            : "CRITICAL: Output MUST be in the same language as input.";
        
        const compressionPrompt = `${languageInstruction}

You are a context compression specialist. Extract what matters, forget the noise.

CORE PRINCIPLE: The 80/20 Rule
- 80% of value comes from 20% of conversation
- Extract that critical 20%

WHAT TO KEEP:
1. The Goal (What is the user trying to achieve?)
2. Current State (What works? What's broken?)
3. Key Decisions (What have we decided? Don't re-debate.)
4. Important Examples (Specific cases user referenced)
5. Failed Attempts (What didn't work? Don't retry.)
6. Next Action (What should the AI do immediately?)

WHAT TO FORGET:
- Greetings and pleasantries
- Repetitive explanations
- Debugging steps that worked
- Off-topic tangents

OUTPUT FORMAT (plain text, no markdown):

GOAL:
[One sentence]

CURRENT STATE:
[2-3 sentences]

KEY DECISIONS:
- [Decision 1]
- [Decision 2]

IMPORTANT EXAMPLES:
- [Example 1]

WHAT FAILED:
- [Failed approach 1]

NEXT STEP:
[One sentence]

RULES:
- Target 10:1 compression (10,000 words → 1,000 words)
- Plain text only (no **, ##, or *)
- No hallucinations (only facts from conversation)
- Keep specifics (numbers, names, versions)

Text to compress:
${text}`;

        if (provider === 'gemini') {
            return await callGeminiAPI(compressionPrompt, key);
        } else if (provider === 'openai') {
            return await callOpenAIAPI(compressionPrompt, key);
        } else if (provider === 'anthropic') {
            return await callAnthropicAPI(compressionPrompt, key);
        }
        
        throw new Error('Unsupported API provider');
    }

    async function callGeminiAPI(prompt, apiKey) {
        try {
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
                console.error('[Gemini API] Error response:', errorText);
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
            
        } catch (error) {
            console.error('[Gemini API] Call failed:', error);
            throw error;
        }
    }

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

    async function callAnthropicAPI(prompt, apiKey) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
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

    // ========================================
    // LOAD STATS
    // ========================================

    async function loadStats() {
        try {
            const tab = await getActiveTab();
            if (!tab || !validateTab(tab, true)) return;

            chrome.tabs.sendMessage(tab.id, {
                action: "get_stats"
            }, (response) => {
                if (chrome.runtime.lastError || !response) return;

                if (response.status === 'success') {
                    displayStats(response.platform, response.stats);
                }
            });
        } catch (err) {
            // Silent fail for stats
        }
    }

    function displayStats(platform, stats) {
        const platformNames = {
            'claude': 'CLAUDE',
            'chatgpt': 'CHATGPT',
            'gemini': 'GEMINI',
            'unknown': 'UNKNOWN'
        };
        
        const displayName = platformNames[platform] || 'UNKNOWN';
        
        statsArea.innerHTML = `
            <div class="stat-badge">
                <strong>${displayName}</strong>
            </div>
            <div class="stat-badge">
                ${stats.totalMessages} messages
            </div>
            <div class="stat-badge">
                ~${stats.estimatedTokens.toLocaleString()} tokens
            </div>
        `;
        statsArea.style.display = 'flex';
    }

    // ========================================
    // CHECKPOINT MANAGEMENT
    // ========================================

    // ========================================
    // SEGMENTS MANAGEMENT
    // ========================================

    function addSegment(content, platform = 'unknown') {
        const segment = {
            id: Date.now() + Math.random(),
            content: content,
            platform: platform,
            timestamp: new Date().toISOString(),
            collapsed: content.length > 200
        };
        
        segments.push(segment);
        renderSegments();
        updateCheckpointStats();
        saveSegments();
    }

    function deleteSegment(segmentId) {
        segments = segments.filter(s => s.id !== segmentId);
        renderSegments();
        updateCheckpointStats();
        saveSegments();
        
        if (segments.length === 0) {
            previewArea.style.display = 'none';
        }
    }

    function editSegment(segmentId, newContent) {
        const segment = segments.find(s => s.id === segmentId);
        if (segment) {
            segment.content = newContent;
            renderSegments();
            updateCheckpointStats();
            saveSegments();
        }
    }

    function moveSegment(fromIndex, toIndex) {
        const [moved] = segments.splice(fromIndex, 1);
        segments.splice(toIndex, 0, moved);
        renderSegments();
        saveSegments();
    }

    function renderSegments() {
        segmentsContainer.innerHTML = '';
        
        if (segments.length === 0) {
            previewArea.style.display = 'none';
            return;
        }
        
        previewArea.style.display = 'block';
        
        segments.forEach((segment, index) => {
            const segmentEl = createSegmentElement(segment, index);
            segmentsContainer.appendChild(segmentEl);
        });
    }

    function createSegmentElement(segment, index) {
        const div = document.createElement('div');
        div.className = `segment ${segment.collapsed ? 'collapsed' : ''}`;
        div.dataset.id = segment.id;
        div.dataset.index = index;
        
        const header = document.createElement('div');
        header.className = 'segment-header';
        
        const label = document.createElement('span');
        label.className = 'segment-label';
        label.textContent = `Segment ${index + 1} (${segment.content.length} chars)`;
        
        const actions = document.createElement('div');
        actions.className = 'segment-actions';
        
        const dragBtn = document.createElement('button');
        dragBtn.className = 'segment-btn drag';
        dragBtn.innerHTML = '⋮⋮';
        dragBtn.title = 'Drag to reorder';
        dragBtn.draggable = true;
        
        const editBtn = document.createElement('button');
        editBtn.className = 'segment-btn edit';
        editBtn.innerHTML = '✎';
        editBtn.title = 'Edit';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'segment-btn delete';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Delete';
        
        actions.appendChild(dragBtn);
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        
        header.appendChild(label);
        header.appendChild(actions);
        
        const content = document.createElement('div');
        content.className = 'segment-content';
        content.textContent = segment.content;
        
        div.appendChild(header);
        div.appendChild(content);
        
        setupSegmentEvents(div, segment, content, editBtn, deleteBtn, dragBtn);
        
        return div;
    }

    function setupSegmentEvents(segmentEl, segment, contentEl, editBtn, deleteBtn, dragBtn) {
        segmentEl.addEventListener('click', (e) => {
            if (e.target.closest('.segment-actions')) return;
            if (contentEl.contentEditable === 'true') return;
            
            segmentEl.classList.toggle('collapsed');
            segment.collapsed = segmentEl.classList.contains('collapsed');
            saveSegments();
        });
        
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (contentEl.contentEditable === 'true') {
                const newContent = contentEl.textContent.trim();
                if (newContent) {
                    editSegment(segment.id, newContent);
                }
                contentEl.contentEditable = 'false';
                segmentEl.classList.remove('editing');
                editBtn.innerHTML = '✎';
            } else {
                contentEl.contentEditable = 'true';
                contentEl.focus();
                segmentEl.classList.add('editing');
                editBtn.innerHTML = '✓';
            }
        });
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const confirmed = confirm(`Delete Segment ${segments.findIndex(s => s.id === segment.id) + 1}?`);
            if (confirmed) {
                deleteSegment(segment.id);
            }
        });
        
        dragBtn.addEventListener('dragstart', (e) => {
            e.stopPropagation();
            draggedSegment = segment.id;
            segmentEl.classList.add('dragging');
        });
        
        dragBtn.addEventListener('dragend', (e) => {
            e.stopPropagation();
            segmentEl.classList.remove('dragging');
            draggedSegment = null;
        });
        
        segmentEl.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        segmentEl.addEventListener('drop', (e) => {
            e.preventDefault();
            const fromIndex = segments.findIndex(s => s.id === draggedSegment);
            const toIndex = parseInt(segmentEl.dataset.index);
            if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
                moveSegment(fromIndex, toIndex);
            }
        });
    }

    function updateCheckpointStats() {
        const totalChars = segments.reduce((sum, s) => sum + s.content.length, 0);
        checkpointStats.textContent = `${segments.length} segment${segments.length !== 1 ? 's' : ''}, ${totalChars} characters`;
    }

    async function saveSegments() {
        await saveToStorage('segments', segments);
    }

    async function loadSegments() {
        const saved = await getFromStorage('segments');
        if (saved && Array.isArray(saved)) {
            segments = saved;
            renderSegments();
            updateCheckpointStats();
        }
    }

    function getCombinedCheckpoint() {
    return segments
        .map(s => s.content.trim()) 
        .filter(content => content.length > 0)
        .join('\n\n'); 
}

    // ========================================
    // HELPER FUNCTIONS
    // ========================================

    async function getActiveTab() {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        return tabs[0];
    }

    function validateTab(tab, silent = false) {
        if (!tab) {
            if (!silent) showMessage("❌ No active tab", "error");
            return false;
        }
        
        if (tab.url.startsWith("chrome://") || 
            tab.url.startsWith("edge://") ||
            tab.url.startsWith("about:")) {
            if (!silent) showMessage("❌ Cannot use on system pages", "error");
            return false;
        }
        
        if (tab.url.includes("chrome.google.com/webstore") ||
            tab.url.includes("microsoftedge.microsoft.com/addons")) {
            if (!silent) showMessage("Blocked on extension stores", "error");
            return false;
        }
        
        return true;
    }

    function showMessage(msg, type = 'info') {
        messageArea.textContent = msg;
        messageArea.className = 'message-area ' + type;
        messageArea.style.display = 'block';
        
        if (type !== 'error') {
            setTimeout(() => {
                messageArea.style.display = 'none';
            }, 5000);
        }
    }

    function handleError(err, context) {
        console.error(`${context} Error:`, err);
        showMessage(`Error: ${err.message}`, "error");
    }

    // ========================================
    // STORAGE FUNCTIONS
    // ========================================

    async function saveToStorage(key, value) {
        return new Promise(resolve => {
            chrome.storage.local.set({ [key]: value }, resolve);
        });
    }

    async function getFromStorage(key) {
        return new Promise(resolve => {
            chrome.storage.local.get([key], result => resolve(result[key]));
        });
    }
    // ========================================
    // DATA SANITIZER FUNCTION
    // ========================================
    function sanitizeContent(text) {
        if (!text) return "";
    
        return text
            // Step 1: Reduce excessive newlines (3+ → 2)
            .replace(/\n{3,}/g, '\n\n')
            // Step 2: Trim overall whitespace
            .trim()
            // Step 3: Clean up each line (remove leading/trailing spaces)
            .split('\n')
            .map(line => line.trim())
            .join('\n')
            // Step 4: Final safety - max 2 consecutive newlines
            .replace(/\n{3,}/g, '\n\n');
    }


});
