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
    const exportMdBtn = document.getElementById('export-md-btn');
    const exportJsonBtn = document.getElementById('export-json-btn');

    // Settings
    const settingsBtn = document.getElementById('settings-btn');
    const settingsPanel = document.getElementById('settings-panel');
    const closeSettingsBtn = document.getElementById('close-settings-btn');

    let segments = []; // Array of segment objects
    let draggedSegment = null;
    let isAutoMode = true;

    // 🆕 Undo functionality
    let deletedSegmentsBackup = null;
    let undoTimeout = null;

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
            console.log('[API_COMPRESS] Response received:', response);
            console.log('[API_COMPRESS] Runtime error:', chrome.runtime.lastError);

            if (chrome.runtime.lastError) {
                autoBtn.disabled = false;
                const errorMsg = chrome.runtime.lastError.message;
                console.error('[API_COMPRESS] Chrome runtime error:', errorMsg);
                showMessage(`Failed: ${errorMsg}`, "error");
                return;
            }

            if (!response) {
                autoBtn.disabled = false;
                console.error('[API_COMPRESS] No response from content script');
                showMessage("No response from page. Try refreshing.", "error");
                return;
            }

            if (response.status !== 'success') {
                autoBtn.disabled = false;
                const errorMsg = response.message || 'Unknown error';
                console.error('[API_COMPRESS] Error from content script:', errorMsg);
                showMessage(`Failed to capture: ${errorMsg}`, "error");
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

                // 🆕 Add as new segment with original length for compression stats
                const segment = {
                    id: Date.now() + Math.random(),
                    content: checkpoint,
                    originalLength: conversationText.length,  // Track original length
                    platform: response.platform,
                    timestamp: new Date().toISOString(),
                    collapsed: checkpoint.length > 200
                };

                segments.push(segment);
                renderSegments();
                updateCheckpointStats();
                saveSegments();

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
        // 🆕 Start countdown timer
        let countdown = 60; // seconds
        let countdownInterval = null;

        const updateCountdown = () => {
            if (countdown > 0) {
                showMessage(`Waiting for AI response... (${countdown}s remaining)`, "info");
                countdown--;
            } else {
                clearInterval(countdownInterval);
                showMessage("Still waiting... AI is taking longer than expected", "info");
            }
        };

        // Start countdown immediately
        updateCountdown();
        countdownInterval = setInterval(updateCountdown, 1000);

        // Send auto-compress command (original method - injects prompt into chat)
        chrome.tabs.sendMessage(tab.id, {
            action: "auto_compress",
            autoSend: true
        }, async (response) => {
            // Clear countdown timer
            if (countdownInterval) {
                clearInterval(countdownInterval);
            }

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

            // 🆕 Security warning for first-time API key save
            if (key && apiEnabled.checked) {
                const existingSettings = await getFromStorage('apiSettings');
                const isFirstTime = !existingSettings || !existingSettings.key;

                if (isFirstTime) {
                    const confirmed = confirm(
                        '🔐 API Key Security Tips:\n\n' +
                        '• Your key is stored locally (never sent to our servers)\n' +
                        '• Use API keys with spending limits\n' +
                        '• Regularly rotate your keys\n' +
                        '• Never use production keys\n\n' +
                        'Continue saving this API key?'
                    );

                    if (!confirmed) {
                        showMessage("API key not saved", "info");
                        return;
                    }
                }
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
                    console.log('[COPY_ALL] Response:', response);
                    console.log('[COPY_ALL] Runtime error:', chrome.runtime.lastError);

                    if (chrome.runtime.lastError) {
                        const errorMsg = chrome.runtime.lastError.message;
                        console.error('[COPY_ALL] Chrome runtime error:', errorMsg);
                        showMessage(`Failed: ${errorMsg}`, "error");
                        return;
                    }

                    if (!response) {
                        console.error('[COPY_ALL] No response from content script');
                        showMessage("No response. Try refreshing the page.", "error");
                        return;
                    }

                    if (response.status !== 'success') {
                        const errorMsg = response.message || 'Unknown error';
                        console.error('[COPY_ALL] Error:', errorMsg);
                        showMessage(`Failed to capture: ${errorMsg}`, "error");
                        return;
                    }

                    const conversation = response.conversation;
                    if (conversation.length === 0) {
                        showMessage("No messages found on page", "info");
                        return;
                    }

                    // 2. 🆕 Format conversation with chunked processing (prevent UI freeze)
                    let markdownText = '';
                    const CHUNK_SIZE = 50;

                    for (let i = 0; i < conversation.length; i += CHUNK_SIZE) {
                        const chunk = conversation.slice(i, i + CHUNK_SIZE);
                        const formatted = chunk.map(m => {
                            const role = m.role === 'user' ? 'User said:' : 'AI said:';
                            const cleanContent = sanitizeContent(m.content);

                            if (!cleanContent) return null;

                            return `${role}\n${cleanContent}`;
                        })
                            .filter(item => item !== null)
                            .join('\n\n');

                        markdownText += formatted + '\n\n';

                        // Update progress for long conversations
                        if (conversation.length > 100) {
                            const progress = Math.min(i + CHUNK_SIZE, conversation.length);
                            showMessage(`Processing... ${progress}/${conversation.length} messages`, 'info');
                        }

                        // Let browser breathe
                        await sleep(0);
                    }


                    // 3. Add as new segment (no confirmation needed - just append)
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

                    // Show success message with segment count
                    const totalSegments = segments.length;
                    showMessage(`✓ Added! ${conversation.length} msgs → Segment ${totalSegments} (${markdownText.length} chars)`, "success");
                });

            } catch (err) {
                console.error('[ERROR] Copy All failed:', err);
                handleError(err, "Copy All");
            }
        });
    }

    // ========================================
    // EXPORT FEATURES
    // ========================================

    // 🆕 Export as Markdown
    if (exportMdBtn) {
        exportMdBtn.addEventListener('click', () => {
            if (segments.length === 0) {
                showMessage("No segments to export", "info");
                return;
            }

            const markdown = getCombinedCheckpoint();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filename = `lumiflow_checkpoint_${timestamp}.md`;

            downloadFile(markdown, filename, 'text/markdown');
            showMessage(`Exported as ${filename}`, "success");
        });
    }

    // 🆕 Export as JSON
    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', () => {
            if (segments.length === 0) {
                showMessage("No segments to export", "info");
                return;
            }

            const exportData = {
                version: "2.3.0",
                exportedAt: new Date().toISOString(),
                segmentCount: segments.length,
                totalChars: segments.reduce((sum, s) => sum + s.content.length, 0),
                segments: segments.map(s => ({
                    content: s.content,
                    platform: s.platform,
                    timestamp: s.timestamp
                }))
            };

            const json = JSON.stringify(exportData, null, 2);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filename = `lumiflow_checkpoint_${timestamp}.json`;

            downloadFile(json, filename, 'application/json');
            showMessage(`Exported as ${filename}`, "success");
        });
    }

    // 🆕 Helper function to download files
    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();

        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
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

                const confirmed = confirm(`Clear all ${segments.length} segments?`);

                if (!confirmed) {
                    return;
                }

                // 🆕 Backup segments for undo
                deletedSegmentsBackup = [...segments];
                segments = [];

                renderSegments();
                updateCheckpointStats();
                await saveSegments();

                // 🆕 Show undo option
                messageArea.innerHTML = `
                    All segments cleared.
                    <button id="undo-clear-btn" style="
                        margin-left: 8px;
                        padding: 4px 12px;
                        background: var(--accent-color);
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 0.9rem;
                    ">UNDO</button>
                `;
                messageArea.className = 'message-area warning';
                messageArea.style.display = 'block';

                // Clear undo timeout if exists
                if (undoTimeout) {
                    clearTimeout(undoTimeout);
                }

                // Set 8 second timeout for undo
                undoTimeout = setTimeout(() => {
                    deletedSegmentsBackup = null;
                    messageArea.style.display = 'none';
                }, 8000);

            } catch (err) {
                console.error('[ERROR] Clear All click handler:', err);
                showMessage("Failed to clear segments", "error");
            }
        });
    }

    // 🆕 Undo button event listener (delegated)
    document.addEventListener('click', async (e) => {
        if (e.target.id === 'undo-clear-btn' && deletedSegmentsBackup) {
            // Clear timeout
            if (undoTimeout) {
                clearTimeout(undoTimeout);
                undoTimeout = null;
            }

            // Restore segments
            segments = deletedSegmentsBackup;
            deletedSegmentsBackup = null;

            renderSegments();
            updateCheckpointStats();
            await saveSegments();

            showMessage(`${segments.length} segments restored!`, 'success');
        }
    });

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

        // Complete prompt templates for each language
        const compressionPromptTemplates = {
            chinese: `关键要求：所有输出必须使用中文。

你是一位上下文压缩专家。提取重要内容，忽略冗余信息。

核心原则：80/20法则 - 80%的价值来自20%的对话。提取那关键的20%。

输出格式（纯文本，不使用markdown ** ## 或 *）：

目标（占输出10%）：
[一句话：我们到底在构建/解决什么？
不好："构建一个Chrome扩展"
良好："LumiFlow v2.1 - 用于ChatGPT/Claude/Gemini之间AI上下文传输的Chrome扩展"]

当前状态（占30% - 最重要）：
[什么已经100%可用？当前的阻碍是什么？
不好："扩展有所进展"
良好："v2.1.1在ChatGPT/Claude上正常工作。Bug：Gemini懒加载导致Copy All不完整。已通过添加scrollToLoadAllMessages()修复"]

关键决策（占20%）：
[我们达成一致的约束 - 不要重新讨论这些
- 包含具体的文件名、函数名、技术选择及原因
不好："使用API"
良好："使用background.js Service Worker绕过Anthropic API调用的CORS限制"]

失败经验（占15%）：
[什么行不通？不要重试这些
- 包含具体的错误信息、症状]

下一步（占25%）：
[按优先级排序的立即可执行步骤
不好："修复bug"
良好："1. 测试Gemini Copy All处理长对话 2. 部署到Chrome商店"]

规则：
- 目标10:1压缩率（10,000字 → 1,000字）
- 使用具体术语：文件名、函数名、确切URL、版本号
- 避免模糊表述："系统"、"项目"、"我们决定"
- 如果对话超过50条消息：优先保留最新决策
- 仅基于对话事实（禁止臆造）

待压缩文本：
${text}`,

            japanese: `重要：すべての出力は日本語でなければなりません。

あなたはコンテキスト圧縮のスペシャリストです。重要なことを抽出し、ノイズを忘れてください。

核心原則：80/20の法則 - 価値の80%は会話の20%から来ます。その重要な20%を抽出してください。

出力形式（プレーンテキスト、markdown ** ## や * なし）：

目標（出力の10%）：
[一文で：正確に何を構築/解決しているのか？
悪い例："Chrome拡張機能を構築"
良い例："LumiFlow v2.1 - ChatGPT/Claude/Gemini間のAIコンテキスト転送用Chrome拡張機能"]

現状（30% - 最重要）：
[100%動作しているものは？現在のブロッカーは？
悪い例："拡張機能が進展"
良い例："v2.1.1はChatGPT/Claudeで動作。バグ：Geminiの遅延読み込みでCopy Allが不完全。scrollToLoadAllMessages()追加で修正"]

重要な決定（20%）：
[合意した制約 - これらを再議論しない
- 具体的なファイル名、関数名、理由付きの技術選択を含める
悪い例："APIを使用"
良い例："background.js Service WorkerでAnthropic API呼び出しのCORSを回避"]

失敗したこと（15%）：
[何がうまくいかなかったか？これらを再試行しない
- 具体的なエラーメッセージ、症状を含める]

次のステップ（25%）：
[優先順位順の即座に実行可能なステップ
悪い例："バグを修正"
良い例："1. 長い会話でGemini Copy Allをテスト 2. Chromeストアにデプロイ"]

ルール：
- 目標10:1圧縮（10,000語 → 1,000語）
- 具体的な用語を使用：ファイル名、関数名、正確なURL、バージョン番号
- 曖昧な表現を避ける："システム"、"プロジェクト"、"決定した"
- 50以上のメッセージがある場合：最新の決定を優先
- 会話からの事実のみ（作り話禁止）

圧縮するテキスト：
${text}`,

            korean: `중요: 모든 출력은 한국어로 작성해야 합니다.

당신은 컨텍스트 압축 전문가입니다. 중요한 것을 추출하고 잡음을 잊으세요.

핵심 원칙: 80/20 법칙 - 가치의 80%는 대화의 20%에서 나옵니다. 그 중요한 20%를 추출하세요.

출력 형식 (일반 텍스트, markdown ** ## 또는 * 없음):

목표 (출력의 10%):
[한 문장: 정확히 무엇을 구축/해결하고 있는가?
나쁨: "Chrome 확장 프로그램 구축"
좋음: "LumiFlow v2.1 - ChatGPT/Claude/Gemini 간 AI 컨텍스트 전송용 Chrome 확장"]

현재 상태 (30% - 가장 중요):
[무엇이 100% 작동하는가? 현재 차단 요소는?
나쁨: "확장 프로그램 진전"
좋음: "v2.1.1은 ChatGPT/Claude에서 작동. 버그: Gemini 지연 로딩으로 Copy All 불완전. scrollToLoadAllMessages() 추가로 수정"]

주요 결정 (20%):
[합의한 제약 조건 - 재논의하지 말 것
- 구체적인 파일명, 함수명, 이유가 있는 기술 선택 포함
나쁨: "API 사용"
좋음: "background.js Service Worker로 Anthropic API 호출의 CORS 우회"]

실패한 것 (15%):
[무엇이 작동하지 않았는가? 재시도하지 말 것
- 구체적인 오류 메시지, 증상 포함]

다음 단계 (25%):
[우선순위대로 즉시 실행 가능한 단계
나쁨: "버그 수정"
좋음: "1. 긴 대화로 Gemini Copy All 테스트 2. Chrome 스토어 배포"]

규칙:
- 목표 10:1 압축 (10,000단어 → 1,000단어)
- 구체적 용어 사용: 파일명, 함수명, 정확한 URL, 버전 번호
- 모호한 표현 피하기: "시스템", "프로젝트", "결정했다"
- 50개 이상 메시지: 최신 결정 우선
- 대화의 사실만 (허구 금지)

압축할 텍스트:
${text}`,

            german: `Wichtig: Alle Ausgaben müssen auf Deutsch sein.

Sie sind ein Kontextkomprimierungsspezialist. Extrahieren Sie das Wesentliche, vergessen Sie das Rauschen.

KERNPRINZIP: Die 80/20-Regel - 80% des Werts kommen von 20% der Konversation. Extrahieren Sie diese kritischen 20%.

AUSGABEFORMAT (Klartext, kein Markdown ** ## oder *):

ZIEL (10% der Ausgabe):
[Ein Satz: Was bauen/lösen wir GENAU?
SCHLECHT: "Eine Chrome-Erweiterung bauen"
GUT: "LumiFlow v2.1 - Chrome-Erweiterung für AI-Kontextübertragung zwischen ChatGPT/Claude/Gemini"]

AKTUELLER STATUS (30% - AM WICHTIGSTEN):
[Was funktioniert zu 100%? Was ist der aktuelle Blocker?
SCHLECHT: "Fortschritt bei der Erweiterung"
GUT: "v2.1.1 funktioniert auf ChatGPT/Claude. Bug: Gemini Lazy Loading führt zu unvollständigem Copy All. Behoben durch Hinzufügen von scrollToLoadAllMessages()"]

WICHTIGE ENTSCHEIDUNGEN (20%):
[Vereinbarte Einschränkungen - NICHT erneut diskutieren
- Spezifische Dateinamen, Funktionsnamen, technische Entscheidungen mit Begründungen einschließen
SCHLECHT: "Eine API verwenden"
GUT: "background.js Service Worker verwenden, um CORS für Anthropic API-Aufrufe zu umgehen"]

WAS GESCHEITERT IST (15%):
[Was hat nicht funktioniert? NICHT erneut versuchen
- Spezifische Fehlermeldungen, Symptome einschließen]

NÄCHSTER SCHRITT (25%):
[Sofort umsetzbare Schritte in Prioritätsreihenfolge
SCHLECHT: "Bugs beheben"
GUT: "1. Gemini Copy All mit langen Gesprächen testen 2. Im Chrome Store bereitstellen"]

REGELN:
- Ziel 10:1 Kompression (10.000 Wörter → 1.000 Wörter)
- SPEZIFISCHE Begriffe verwenden: Dateinamen, Funktionsnamen, genaue URLs, Versionsnummern
- Vage Phrasen VERMEIDEN: "das System", "das Projekt", "wir haben beschlossen"
- Bei 50+ Nachrichten: NEUESTE Entscheidungen priorisieren
- Nur Fakten aus der Konversation (keine Halluzinationen)

Zu komprimierender Text:
${text}`,

            french: `Important : Toutes les sorties doivent être en français.

Vous êtes un spécialiste de la compression de contexte. Extrayez l'essentiel, oubliez le bruit.

PRINCIPE FONDAMENTAL : La règle 80/20 - 80% de la valeur provient de 20% de la conversation. Extrayez ces 20% critiques.

FORMAT DE SORTIE (texte brut, pas de markdown ** ## ou *) :

OBJECTIF (10% de la sortie) :
[Une phrase : Que construisons/résolvons-nous EXACTEMENT ?
MAUVAIS : "Construire une extension Chrome"
BON : "LumiFlow v2.1 - Extension Chrome pour le transfert de contexte IA entre ChatGPT/Claude/Gemini"]

ÉTAT ACTUEL (30% - LE PLUS IMPORTANT) :
[Qu'est-ce qui fonctionne à 100% ? Quel est le bloqueur actuel ?
MAUVAIS : "Progrès sur l'extension"
BON : "v2.1.1 fonctionne sur ChatGPT/Claude. Bug : Le chargement paresseux de Gemini provoque un Copy All incomplet. Corrigé en ajoutant scrollToLoadAllMessages()"]

DÉCISIONS CLÉS (20%) :
[Contraintes convenues - NE PAS les rediscuter
- Inclure les noms de fichiers spécifiques, noms de fonctions, choix techniques avec raisons
MAUVAIS : "Utiliser une API"
BON : "Utiliser background.js Service Worker pour contourner CORS pour les appels API Anthropic"]

CE QUI A ÉCHOUÉ (15%) :
[Qu'est-ce qui n'a pas fonctionné ? NE PAS réessayer
- Inclure les messages d'erreur spécifiques, symptômes]

PROCHAINE ÉTAPE (25%) :
[Étapes immédiatement actionnables par ordre de priorité
MAUVAIS : "Corriger les bugs"
BON : "1. Tester Gemini Copy All avec de longues conversations 2. Déployer sur Chrome Store"]

RÈGLES :
- Cible compression 10:1 (10 000 mots → 1 000 mots)
- Utiliser des termes SPÉCIFIQUES : noms de fichiers, noms de fonctions, URLs exactes, numéros de version
- ÉVITER les phrases vagues : "le système", "le projet", "nous avons décidé"
- Si conversation 50+ messages : prioriser les DERNIÈRES décisions
- Seulement des faits de la conversation (pas d'hallucinations)

Texte à compresser :
${text}`,

            spanish: `Importante: Toda la salida debe estar en español.

Eres un especialista en compresión de contexto. Extrae lo importante, olvida el ruido.

PRINCIPIO FUNDAMENTAL: La regla 80/20 - El 80% del valor proviene del 20% de la conversación. Extrae ese 20% crítico.

FORMATO DE SALIDA (texto plano, sin markdown ** ## o *):

OBJETIVO (10% de la salida):
[Una oración: ¿Qué estamos construyendo/resolviendo EXACTAMENTE?
MALO: "Construir una extensión de Chrome"
BUENO: "LumiFlow v2.1 - Extensión de Chrome para transferencia de contexto IA entre ChatGPT/Claude/Gemini"]

ESTADO ACTUAL (30% - MÁS IMPORTANTE):
[¿Qué funciona al 100%? ¿Cuál es el bloqueador actual?
MALO: "Progreso en la extensión"
BUENO: "v2.1.1 funciona en ChatGPT/Claude. Bug: La carga diferida de Gemini causa Copy All incompleto. Corregido agregando scrollToLoadAllMessages()"]

DECISIONES CLAVE (20%):
[Restricciones acordadas - NO volver a discutirlas
- Incluir nombres de archivos específicos, nombres de funciones, decisiones técnicas con razones
MALO: "Usar una API"
BUENO: "Usar background.js Service Worker para evitar CORS en llamadas API de Anthropic"]

LO QUE FALLÓ (15%):
[¿Qué no funcionó? NO volver a intentar
- Incluir mensajes de error específicos, síntomas]

SIGUIENTE PASO (25%):
[Pasos inmediatamente accionables en orden de prioridad
MALO: "Arreglar bugs"
BUENO: "1. Probar Gemini Copy All con conversaciones largas 2. Desplegar en Chrome Store"]

REGLAS:
- Objetivo compresión 10:1 (10,000 palabras → 1,000 palabras)
- Usar términos ESPECÍFICOS: nombres de archivos, nombres de funciones, URLs exactas, números de versión
- EVITAR frases vagas: "el sistema", "el proyecto", "decidimos"
- Si conversación 50+ mensajes: priorizar ÚLTIMAS decisiones
- Solo hechos de la conversación (sin alucinaciones)

Texto a comprimir:
${text}`,

            russian: `Важно: Весь вывод должен быть на русском языке.

Вы специалист по сжатию контекста. Извлекайте важное, забудьте шум.

ОСНОВНОЙ ПРИНЦИП: Правило 80/20 - 80% ценности происходит от 20% разговора. Извлеките эти критические 20%.

ФОРМАТ ВЫВОДА (обычный текст, без markdown ** ## или *):

ЦЕЛЬ (10% вывода):
[Одно предложение: Что ИМЕННО мы создаём/решаем?
ПЛОХО: "Создание расширения Chrome"
ХОРОШО: "LumiFlow v2.1 - Расширение Chrome для передачи контекста ИИ между ChatGPT/Claude/Gemini"]

ТЕКУЩЕЕ СОСТОЯНИЕ (30% - САМОЕ ВАЖНОЕ):
[Что работает на 100%? Что является текущим блокером?
ПЛОХО: "Прогресс в расширении"
ХОРОШО: "v2.1.1 работает на ChatGPT/Claude. Баг: Ленивая загрузка Gemini вызывает неполный Copy All. Исправлено добавлением scrollToLoadAllMessages()"]

КЛЮЧЕВЫЕ РЕШЕНИЯ (20%):
[Согласованные ограничения - НЕ обсуждать повторно
- Включить конкретные имена файлов, имена функций, технические решения с причинами
ПЛОХО: "Использование API"
ХОРОШО: "Использование background.js Service Worker для обхода CORS для вызовов API Anthropic"]

ЧТО НЕ СРАБОТАЛО (15%):
[Что не сработало? НЕ пробовать снова
- Включить конкретные сообщения об ошибках, симптомы]

СЛЕДУЮЩИЙ ШАГ (25%):
[Немедленно выполнимые шаги в порядке приоритета
ПЛОХО: "Исправить баги"
ХОРОШО: "1. Протестировать Gemini Copy All с длинными разговорами 2. Развернуть в Chrome Store"]

ПРАВИЛА:
- Цель сжатия 10:1 (10,000 слов → 1,000 слов)
- Использовать КОНКРЕТНЫЕ термины: имена файлов, имена функций, точные URL, номера версий
- ИЗБЕГАТЬ расплывчатых фраз: "система", "проект", "мы решили"
- Если разговор 50+ сообщений: приоритет ПОСЛЕДНИМ решениям
- Только факты из разговора (без галлюцинаций)

Текст для сжатия:
${text}`,

            arabic: `مهم: يجب أن يكون كل الناتج بالعربية.

أنت متخصص في ضغط السياق. استخرج المهم، تجاهل الضوضاء.

المبدأ الأساسي: قاعدة 80/20 - 80% من القيمة تأتي من 20% من المحادثة. استخرج تلك الـ20% الحرجة.

تنسيق الناتج (نص عادي، بدون markdown ** ## أو *):

الهدف (10% من الناتج):
[جملة واحدة: ماذا نبني/نحل بالضبط؟
سيء: "بناء إضافة Chrome"
جيد: "LumiFlow v2.1 - إضافة Chrome لنقل سياق الذكاء الاصطناعي بين ChatGPT/Claude/Gemini"]

الحالة الحالية (30% - الأهم):
[ما الذي يعمل بنسبة 100%؟ ما هو المانع الحالي؟
سيء: "تقدم في الإضافة"
جيد: "v2.1.1 يعمل على ChatGPT/Claude. خلل: التحميل الكسول في Gemini يسبب Copy All غير مكتمل. تم إصلاحه بإضافة scrollToLoadAllMessages()"]

قرارات رئيسية (20%):
[قيود متفق عليها - لا تعيد مناقشتها
- تضمين أسماء ملفات محددة، أسماء دوال، خيارات تقنية مع الأسباب
سيء: "استخدام API"
جيد: "استخدام background.js Service Worker لتجاوز CORS لاستدعاءات Anthropic API"]

ما فشل (15%):
[ما الذي لم ينجح؟ لا تحاول مرة أخرى
- تضمين رسائل خطأ محددة، أعراض]

الخطوة التالية (25%):
[خطوات قابلة للتنفيذ فورياً حسب الأولوية
سيء: "إصلاح الأخطاء"
جيد: "1. اختبار Gemini Copy All مع محادثات طويلة 2. النشر على Chrome Store"]

قواعد:
- الهدف ضغط 10:1 (10,000 كلمة → 1,000 كلمة)
- استخدم مصطلحات محددة: أسماء ملفات، أسماء دوال، URLs دقيقة، أرقام إصدارات
- تجنب العبارات الغامضة: "النظام"، "المشروع"، "قررنا"
- إذا كانت المحادثة 50+ رسالة: أولوية للقرارات الأحدث
- فقط حقائق من المحادثة (لا هلوسة)

النص للضغط:
${text}`,

            thai: `สำคัญ: ผลลัพธ์ทั้งหมดต้องเป็นภาษาไทย

คุณเป็นผู้เชี่ยวชาญด้านการบีบอัดบริบท สกัดสิ่งสำคัญ ละเลยสิ่งรบกวน

หลักการหลัก: กฎ 80/20 - 80% ของคุณค่ามาจาก 20% ของการสนทนา สกัด 20% ที่สำคัญนั้น

รูปแบบผลลัพธ์ (ข้อความธรรมดา ไม่มี markdown ** ## หรือ *):

เป้าหมาย (10% ของผลลัพธ์):
[ประโยคเดียว: เรากำลังสร้าง/แก้ไขอะไรกันแน่?
ไม่ดี: "สร้างส่วนขยาย Chrome"
ดี: "LumiFlow v2.1 - ส่วนขยาย Chrome สำหรับถ่ายโอนบริบท AI ระหว่าง ChatGPT/Claude/Gemini"]

สถานะปัจจุบัน (30% - สำคัญที่สุด):
[อะไรทำงานได้ 100%? อุปสรรคปัจจุบันคืออะไร?
ไม่ดี: "มีความคืบหน้าในส่วนขยาย"
ดี: "v2.1.1 ทำงานบน ChatGPT/Claude บั๊ก: การโหลดแบบ lazy ของ Gemini ทำให้ Copy All ไม่สมบูรณ์ แก้ไขโดยเพิ่ม scrollToLoadAllMessages()"]

การตัดสินใจสำคัญ (20%):
[ข้อจำกัดที่ตกลงกัน - อย่าหารือใหม่
- รวมชื่อไฟล์เฉพาะ ชื่อฟังก์ชัน ตัวเลือกทางเทคนิคพร้อมเหตุผล
ไม่ดี: "ใช้ API"
ดี: "ใช้ background.js Service Worker เพื่อหลีกเลี่ยง CORS สำหรับการเรียก Anthropic API"]

สิ่งที่ล้มเหลว (15%):
[อะไรไม่ได้ผล? อย่าลองใหม่
- รวมข้อความแสดงข้อผิดพลาดเฉพาะ อาการ]

ขั้นตอนถัดไป (25%):
[ขั้นตอนที่ดำเนินการได้ทันทีตามลำดับความสำคัญ
ไม่ดี: "แก้บั๊ก"
ดี: "1. ทดสอบ Gemini Copy All กับการสนทนายาว 2. เผยแพร่บน Chrome Store"]

กฎ:
- เป้าหมายการบีบอัด 10:1 (10,000 คำ → 1,000 คำ)
- ใช้คำศัพท์เฉพาะ: ชื่อไฟล์ ชื่อฟังก์ชัน URL ที่แน่นอน หมายเลขเวอร์ชัน
- หลีกเลี่ยงวลีคลุมเครือ: "ระบบ", "โปรเจกต์", "เราตัดสินใจ"
- หากการสนทนามี 50+ ข้อความ: ให้ความสำคัญกับการตัดสินใจล่าสุด
- เฉพาะข้อเท็จจริงจากการสนทนา (ไม่มีการสมมติ)

ข้อความที่จะบีบอัด:
${text}`,

            english: `You are a context compression specialist. Extract what matters, forget the noise.

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
${text}`
        };

        // Get template for detected language (fallback to English)
        const compressionPrompt = compressionPromptTemplates[detectedLang] || compressionPromptTemplates.english;

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

        // Clear existing content safely
        while (statsArea.firstChild) {
            statsArea.removeChild(statsArea.firstChild);
        }

        // Create elements programmatically (safer than innerHTML)
        const platformBadge = document.createElement('div');
        platformBadge.className = 'stat-badge';
        const platformStrong = document.createElement('strong');
        platformStrong.textContent = displayName;
        platformBadge.appendChild(platformStrong);

        const messagesBadge = document.createElement('div');
        messagesBadge.className = 'stat-badge';
        messagesBadge.textContent = `${stats.totalMessages} messages`;

        const tokensBadge = document.createElement('div');
        tokensBadge.className = 'stat-badge';
        tokensBadge.textContent = `~${stats.estimatedTokens.toLocaleString()} tokens`;

        statsArea.appendChild(platformBadge);
        statsArea.appendChild(messagesBadge);
        statsArea.appendChild(tokensBadge);
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
        dragBtn.textContent = '⋮⋮';
        dragBtn.title = 'Drag to reorder';
        dragBtn.draggable = true;

        const editBtn = document.createElement('button');
        editBtn.className = 'segment-btn edit';
        editBtn.textContent = '✎';
        editBtn.title = 'Edit';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'segment-btn delete';
        deleteBtn.textContent = '×';
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
                editBtn.textContent = '✎';
            } else {
                contentEl.contentEditable = 'true';
                contentEl.focus();
                segmentEl.classList.add('editing');
                editBtn.textContent = '✓';
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

        // 🆕 Calculate compression rate if we have original data
        let statsText = `${segments.length} segment${segments.length !== 1 ? 's' : ''}, ${totalChars.toLocaleString()} chars`;

        // Check if any segment has compression metadata
        const compressedSegments = segments.filter(s => s.originalLength && s.originalLength > s.content.length);
        if (compressedSegments.length > 0) {
            const totalOriginal = compressedSegments.reduce((sum, s) => sum + (s.originalLength || s.content.length), 0);
            const totalCompressed = compressedSegments.reduce((sum, s) => sum + s.content.length, 0);
            const compressionRate = Math.round((1 - totalCompressed / totalOriginal) * 100);

            if (compressionRate > 0) {
                statsText += ` • ${compressionRate}% saved`;
            }
        }

        checkpointStats.textContent = statsText;
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

        // 🆕 User-friendly error messages
        const userFriendlyErrors = {
            'Network request failed': 'Network error. Please check your internet connection.',
            'Failed to fetch': 'Cannot connect to API. Check your network or API key.',
            'API key': 'Invalid API key. Please check Settings ⚙️',
            'api key': 'Invalid API key. Please check Settings ⚙️',
            'Timeout': 'Request timed out. The AI took too long to respond.',
            'timeout': 'Request timed out. The AI took too long to respond.',
            'not found': 'Could not find input field. Try refreshing the page.',
            'Please refresh': 'Extension needs page refresh. Press F5 or ⌘R.',
            'blocked': 'Request blocked. Check if API is accessible in your region.',
            '401': 'Authentication failed. Check your API key in Settings.',
            '403': 'Access forbidden. Your API key may lack permissions.',
            '429': 'Rate limit exceeded. Please wait a moment and try again.',
            '500': 'API server error. Please try again later.',
            'quota': 'API quota exceeded. Check your API usage limits.'
        };

        let message = err.message || 'Unknown error';

        // Find matching user-friendly message
        for (const [key, friendly] of Object.entries(userFriendlyErrors)) {
            if (message.toLowerCase().includes(key.toLowerCase())) {
                message = friendly;
                break;
            }
        }

        showMessage(`${context} failed: ${message}`, "error");
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

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }


});
