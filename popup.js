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
            // ⚠️ Note: response callback may timeout for long waits
            // Always check storage as fallback
            
            console.log('[DEBUG] Response received:', response);
            
            if (chrome.runtime.lastError) {
                console.log('[DEBUG] Runtime error:', chrome.runtime.lastError.message);
            }
            
            let checkpointAdded = false;
            
            // Try to use response if available
            if (response && response.status === 'success' && response.checkpoint) {
                console.log('[DEBUG] Got checkpoint from response, length:', response.checkpoint.length);
                addSegment(response.checkpoint, response.platform);
                showMessage("Checkpoint created!");
                checkpointAdded = true;
            } else if (response && response.status === 'pending_send') {
                showMessage("Prompt injected. Click Send, then use Manual Absorb.", "info");
                autoBtn.disabled = false;
                return;
            }
            
            // 🔥 CRITICAL FIX: Always check storage after 3 seconds
            // This handles cases where sendResponse is too slow
            if (!checkpointAdded) {
                console.log('[DEBUG] Waiting 3s then checking storage fallback...');
                await sleep(3000);  // Give content.js time to save
                
                const storageSuccess = await checkStorageFallback();
                if (storageSuccess) {
                    checkpointAdded = true;
                }
            }
            
            // Final fallback: show manual absorb message
            if (!checkpointAdded) {
                showMessage("Timeout. Please select AI response and use Manual Absorb.", "info");
            }
            
            autoBtn.disabled = false;
        });
    }

    // 从 storage 读取 checkpoint 的备用方案
    async function checkStorageFallback() {
        console.log('[DEBUG] checkStorageFallback called');
        const data = await getFromStorage('lastCheckpoint');
        
        if (!data || !data.checkpoint) {
            console.log('[DEBUG] No checkpoint in storage');
            return false;
        }
        
        console.log('[DEBUG] Found checkpoint in storage, length:', data.checkpoint.length);
        
        // 检查时间戳，确保是最近的（5分钟内）
        const checkpointTime = new Date(data.timestamp).getTime();
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        if (now - checkpointTime < fiveMinutes) {
            console.log('[DEBUG] Checkpoint is recent, adding to segments');
            addSegment(data.checkpoint, data.platform);
            showMessage("Checkpoint retrieved!");
            
            // 清除已使用的 checkpoint
            chrome.storage.local.remove('lastCheckpoint');
            return true;
        } else {
            console.log('[DEBUG] Checkpoint is too old (>5min)');
            return false;
        }
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

            // 检查内容来源和长度，决定是否显示提示
            // Copy All 的内容需要特殊处理
            const isCopyAllContent = segments.some(s => s.isCopyAllSource);
            const LONG_CONTENT_THRESHOLD = 500; // 超过此字符数视为"长内容"

            // 判断是否需要提示（Copy All 始终提示，Manual 超过阈值才提示，Auto 不提示）
            const shouldPrompt = isCopyAllContent ||
                (!isAutoMode && checkpointText.length > LONG_CONTENT_THRESHOLD);

            if (shouldPrompt && checkpointText.length > LONG_CONTENT_THRESHOLD) {
                const apiSettings = await getFromStorage('apiSettings') || {};

                if (apiSettings.enabled && apiSettings.key) {
                    // 有 API：询问是否压缩
                    const useCompression = confirm(
                        `Content is ${checkpointText.length} characters (quite long).\n\n` +
                        `Compress before injecting?\n\n` +
                        `OK = Compress first\n` +
                        `Cancel = Inject All (without compression)`
                    );

                    if (useCompression) {
                        showMessage(`Compressing ${checkpointText.length} chars...`, "info");
                        try {
                            checkpointText = await compressTextWithAPI(checkpointText, apiSettings);
                            showMessage(`Compressed to ${checkpointText.length} chars, injecting...`, "info");
                        } catch (err) {
                            console.error('[Compression] Failed:', err);
                            // 压缩失败时询问是否继续
                            const continueAnyway = confirm(
                                `Compression failed: ${err.message}\n\n` +
                                `Inject all content without compression?`
                            );
                            if (!continueAnyway) {
                                showMessage("Injection cancelled", "info");
                                return;
                            }
                        }
                    }
                    // 如果用户选择"否"，不 return，直接继续注入全部内容
                } else {
                    // 无 API：询问是否直接注入
                    const continueAnyway = confirm(
                        `Content is ${checkpointText.length} characters (quite long).\n\n` +
                        `No API configured. Inject all content?\n\n` +
                        `OK = Inject All\n` +
                        `Cancel = Abort`
                    );

                    if (!continueAnyway) {
                        showMessage("Injection cancelled", "info");
                        return;
                    }
                }
            }
            // Auto Mode（非 Copy All）或内容较短：不提示，直接注入

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

        switch (status) {
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

    // Note: settingsBtn event listener is already defined above (line 371)

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

                    // 4. New Segment Creation - 标记为 Copy All 来源
                    const newSegment = {
                        id: Date.now(),
                        content: markdownText,
                        platform: response.platform || 'unknown',
                        timestamp: new Date().toISOString(),
                        collapsed: false,
                        isCopyAllSource: true  // 标记这是 Copy All 的内容
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

        // 多语言检测：检测对话中的主要语言
        const detectLanguage = (text) => {
            const patterns = {
                chinese: /[\u4e00-\u9fa5]/g,
                japanese: /[\u3040-\u309f\u30a0-\u30ff]/g,  // 平假名+片假名
                korean: /[\uac00-\ud7af\u1100-\u11ff]/g,
                russian: /[\u0400-\u04ff]/g,
                arabic: /[\u0600-\u06ff]/g,
                thai: /[\u0e00-\u0e7f]/g,
                // 欧洲语言通过特殊字符检测
                german: /[äöüßÄÖÜ]/g,
                french: /[àâçéèêëîïôûùüÿœæ]/gi,
                spanish: /[áéíóúüñ¿¡]/gi,
            };

            let maxLang = 'english';
            let maxCount = 0;

            for (const [lang, pattern] of Object.entries(patterns)) {
                const matches = text.match(pattern) || [];
                if (matches.length > maxCount) {
                    maxCount = matches.length;
                    maxLang = lang;
                }
            }

            // 需要超过一定阈值才认定为该语言
            if (maxCount < 10) return 'english';
            return maxLang;
        };

        const detectedLang = detectLanguage(text);

        const languageInstructions = {
            chinese: "CRITICAL: Output MUST be in Chinese (中文). 所有输出必须使用中文。",
            japanese: "CRITICAL: Output MUST be in Japanese (日本語). すべての出力は日本語でなければなりません。",
            korean: "CRITICAL: Output MUST be in Korean (한국어). 모든 출력은 한국어로 작성해야 합니다.",
            russian: "CRITICAL: Output MUST be in Russian (Русский). Весь вывод должен быть на русском языке.",
            arabic: "CRITICAL: Output MUST be in Arabic (العربية). يجب أن يكون الناتج بالعربية.",
            thai: "CRITICAL: Output MUST be in Thai (ภาษาไทย). ผลลัพธ์ทั้งหมดต้องเป็นภาษาไทย",
            german: "CRITICAL: Output MUST be in German (Deutsch). Alle Ausgaben müssen auf Deutsch sein.",
            french: "CRITICAL: Output MUST be in French (Français). Toutes les sorties doivent être en français.",
            spanish: "CRITICAL: Output MUST be in Spanish (Español). Toda la salida debe estar en español.",
            english: "Output in the same language as the conversation."
        };

        const languageInstruction = languageInstructions[detectedLang] || languageInstructions.english;

        const compressionPrompt = `${languageInstruction}

You are a context compression specialist. Extract what matters, forget the noise.

CORE PRINCIPLE: The 80/20 Rule - 80% of value comes from 20% of conversation. Extract that critical 20%.

OUTPUT FORMAT (plain text, no markdown ** ## or *):

GOAL (10% of output):
[One sentence: What EXACTLY are we building/solving?
BAD: "Building a Chrome extension"
GOOD: "LumiFlow v2.1 - Chrome extension for AI context transfer across ChatGPT/Claude/Gemini"]

CURRENT STATE (30% - MOST IMPORTANT):
[What is 100% working? What's the current blocker?
BAD: "Made progress on the extension"
GOOD: "v2.1.1 works on ChatGPT/Claude. Bug: Gemini lazy loading causes incomplete Copy All. Fixed by adding scrollToLoadAllMessages()"]

KEY DECISIONS (20%):
[Constraints we agreed on - DON'T re-discuss these
- Include specific file names, function names, technical choices with reasons
BAD: "Using an API"
GOOD: "Using background.js Service Worker to bypass CORS for Anthropic API calls"]

WHAT FAILED (15%):
[What didn't work? DON'T retry these
- Include specific error messages, symptoms]

NEXT STEP (25%):
[Immediate actionable steps in priority order
BAD: "Fix bugs"
GOOD: "1. Test Gemini Copy All with long conversations 2. Deploy to Chrome Store"]

RULES:
- Target 10:1 compression (10,000 words → 1,000 words)
- Use SPECIFIC terms: file names, function names, exact URLs, version numbers
- AVOID vague phrases: "the system", "the project", "we decided"
- If conversation has 50+ messages: prioritize LATEST decisions
- Only facts from conversation (no hallucination)

Text to compress:
${text}`;

        // Route all API calls through background.js (bypasses CORS)
        return await callAPIViaBackground(provider, key, compressionPrompt);
    }

    // Unified API call through background.js Service Worker
    async function callAPIViaBackground(provider, apiKey, prompt) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                {
                    action: 'callAPI',
                    provider: provider,
                    apiKey: apiKey,
                    prompt: prompt
                },
                (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    if (response.success) {
                        resolve(response.data);
                    } else {
                        reject(new Error(response.error || 'API call failed'));
                    }
                }
            );
        });
    }

    // Note: Individual API functions removed - all calls now go through background.js

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
        console.log('[DEBUG] addSegment called');
        console.log('[DEBUG] Content length:', content ? content.length : 0);
        console.log('[DEBUG] Platform:', platform);
        console.log('[DEBUG] First 100 chars:', content ? content.substring(0, 100) : 'EMPTY');
        
        if (!content || content.length === 0) {
            console.error('[DEBUG] ❌ Empty content passed to addSegment!');
            return;
        }
        
        const segment = {
            id: Date.now() + Math.random(),
            content: content,
            platform: platform,
            timestamp: new Date().toISOString(),
            collapsed: content.length > 200
        };

        segments.push(segment);
        console.log('[DEBUG] Segment added, total segments:', segments.length);
        
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
