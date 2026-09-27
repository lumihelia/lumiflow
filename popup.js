/*
 * LumiFlow - AI Context Manager
 * Copyright (C) 2026 Helia (@LumiHelia)
 * 
 * Licensed under the MIT License.
 * See LICENSE file for details.
 */

// ========================================
// LumiFlow v2.5.0 - Popup Script
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
    const downloadTxtBtn = document.getElementById('download-txt-btn');
    const downloadMdBtn = document.getElementById('download-md-btn');
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

        // popup 在等待 AI 生成期间关掉的话，checkpoint 只存进了 lastCheckpoint，这里接回来
        await consumePendingCheckpoint();
    }

    // 页面上的 content script 把 checkpoint 写进 lastCheckpoint 后，popup 若还开着就立刻收进 segments
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.lastCheckpoint && changes.lastCheckpoint.newValue) {
            consumePendingCheckpoint();
        }
    });

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
        showMessage(`Compressing with ${apiSettings.provider.toUpperCase()} API... You can close this popup; the checkpoint will be here when you reopen it.`, "info");

        // 读对话、调 API、存结果都交给 background.js，popup 关掉也会继续
        chrome.runtime.sendMessage({
            action: 'compressConversation',
            tabId: tab.id,
            apiSettings: apiSettings
        }, (response) => {
            autoBtn.disabled = false;

            if (chrome.runtime.lastError || !response) {
                showMessage(`API compression failed: ${chrome.runtime.lastError ? chrome.runtime.lastError.message : 'no response'}`, "error");
                return;
            }

            if (!response.success) {
                console.error('[API] Compression error:', response.error);
                handleError(new Error(response.error), 'API compression');
                return;
            }

            if (!hasSegmentWithContent(response.checkpoint)) {
                addSegment(response.checkpoint, response.platform, { originalLength: response.originalLength });
            }
            chrome.storage.local.remove('lastCheckpoint');
            showMessage(`Checkpoint created via ${apiSettings.provider.toUpperCase()} API (${response.messageCount} messages)!`);
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
        sendTabMessageWithRetry(tab.id, {
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
                if (!hasSegmentWithContent(response.checkpoint)) {
                    addSegment(response.checkpoint, response.platform);
                }
                chrome.storage.local.remove('lastCheckpoint');
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

                const storageSuccess = await consumePendingCheckpoint();
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

    function hasSegmentWithContent(content) {
        return segments.some(s => s.content === content);
    }

    // 把 content script 存下的 checkpoint（lastCheckpoint）收进 segments，收完即删，避免重复
    async function consumePendingCheckpoint() {
        const data = await getFromStorage('lastCheckpoint');
        if (!data || !data.checkpoint) return false;

        chrome.storage.local.remove('lastCheckpoint');

        // 太旧的 checkpoint（超过 30 分钟）视为过期，丢弃
        const age = Date.now() - new Date(data.timestamp).getTime();
        if (!(age < 30 * 60 * 1000)) {
            console.log('[DEBUG] Pending checkpoint expired, discarded');
            return false;
        }

        if (!hasSegmentWithContent(data.checkpoint)) {
            addSegment(data.checkpoint, data.platform, data.originalLength ? { originalLength: data.originalLength } : {});
            showMessage("Checkpoint retrieved! Open a new chat and click INJECT.");
        }
        return true;
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

            sendTabMessageWithRetry(tab.id, {
                action: "manual_absorb"
            }, async (response) => {
                console.log('[DEBUG] Response received:', response);

                if (chrome.runtime.lastError || !response) {
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

            sendTabMessageWithRetry(tab.id, {
                action: "inject",
                text: checkpointText
            }, async (response) => {
                if (chrome.runtime.lastError || !response) {
                    showMessage("Please refresh the page", "error");
                    return;
                }

                if (response.status === 'success') {
                    showMessage("Context injected! Click Send to continue.");

                } else if (response.status === 'no_input') {
                    try {
                        await navigator.clipboard.writeText(checkpointText);
                        showMessage("Input box not found. Checkpoint copied to clipboard — paste it in.", "info");
                    } catch (e) {
                        showMessage("Input box not found. Click into the chat box and try again.", "error");
                    }

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
            // 输入框里显示的是打码后的 key（如 AIzaSyAb...wxyz），没改动过就保存原来的真实 key
            const key = !apiKeyInput ? '' :
                (apiKeyInput.dataset.isMasked === 'true' && apiKeyInput.dataset.savedKey)
                    ? apiKeyInput.dataset.savedKey
                    : apiKeyInput.value.trim();

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
    // DOWNLOAD TXT / DOWNLOAD MD (SCRAPE & SAVE AS FILE)
    // ========================================
    // 直接把整段对话抓下来存成文件，不再先复制到剪贴板或存成 segment——
    // 抓完即下载，不需要再粘贴到别的地方。

    function getAiSpeakerLabel(platform) {
        const names = {
            claude: 'Claude',
            chatgpt: 'ChatGPT',
            gemini: 'Gemini',
            deepseek: 'DeepSeek'
        };
        return names[platform] || 'AI';
    }

    // 把对话数组格式化成带说话人标注的文本（分块处理，避免长对话卡死 UI）
    async function formatConversationForDownload(conversation, platform, format) {
        const aiLabel = getAiSpeakerLabel(platform);
        const CHUNK_SIZE = 50;
        let text = '';

        for (let i = 0; i < conversation.length; i += CHUNK_SIZE) {
            const chunk = conversation.slice(i, i + CHUNK_SIZE);
            const formatted = chunk.map(m => {
                const speaker = m.role === 'user' ? 'User' : aiLabel;
                const cleanContent = sanitizeContent(m.content);

                if (!cleanContent) return null;

                return format === 'md'
                    ? `**${speaker}:**\n\n${cleanContent}`
                    : `${speaker} said:\n${cleanContent}`;
            })
                .filter(item => item !== null)
                .join('\n\n');

            text += formatted + '\n\n';

            if (conversation.length > 100) {
                const progress = Math.min(i + CHUNK_SIZE, conversation.length);
                showMessage(`Processing... ${progress}/${conversation.length} messages`, 'info');
            }

            await sleep(0);
        }

        return text.trim();
    }

    async function scrapeAndDownload(format) {
        const formatLabel = format === 'md' ? 'Markdown' : 'TXT';

        try {
            showMessage(`Scraping conversation for ${formatLabel} download...`, "info");

            const tab = await getActiveTab();
            if (!validateTab(tab)) return;

            sendTabMessageWithRetry(tab.id, {
                action: "get_conversation"
            }, async (response) => {
                console.log(`[DOWNLOAD_${format.toUpperCase()}] Response:`, response);

                if (chrome.runtime.lastError) {
                    showMessage(`Failed: ${chrome.runtime.lastError.message}`, "error");
                    return;
                }

                if (!response) {
                    showMessage("No response. Try refreshing the page.", "error");
                    return;
                }

                if (response.status !== 'success') {
                    showMessage(`Failed to capture: ${response.message || 'Unknown error'}`, "error");
                    return;
                }

                const conversation = response.conversation;
                if (!conversation || conversation.length === 0) {
                    showMessage("No messages found on page", "info");
                    return;
                }

                const text = await formatConversationForDownload(conversation, response.platform, format);

                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                const ext = format === 'md' ? 'md' : 'txt';
                const mimeType = format === 'md' ? 'text/markdown' : 'text/plain';
                const filename = `lumiflow_${response.platform || 'unknown'}_${timestamp}.${ext}`;

                downloadFile(text, filename, mimeType);
                showMessage(`✓ Downloaded ${filename} (${conversation.length} messages)`, "success");
            });

        } catch (err) {
            console.error(`[ERROR] Download ${formatLabel} failed:`, err);
            handleError(err, `Download ${formatLabel}`);
        }
    }

    if (downloadTxtBtn) {
        downloadTxtBtn.addEventListener('click', () => scrapeAndDownload('txt'));
    }

    if (downloadMdBtn) {
        downloadMdBtn.addEventListener('click', () => scrapeAndDownload('md'));
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
                version: chrome.runtime.getManifest().version,
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
        // prompt 模板在 prompts.js，和 background.js 共用
        const compressionPrompt = buildCompressionPrompt(text);

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
                    if (chrome.runtime.lastError || !response) {
                        reject(new Error(chrome.runtime.lastError ? chrome.runtime.lastError.message : 'No response from background'));
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

            sendTabMessageWithRetry(tab.id, {
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
            'deepseek': 'DEEPSEEK',
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

    function addSegment(content, platform = 'unknown', extra = {}) {
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
            collapsed: content.length > 200,
            ...extra
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
                // innerText 才能保留编辑时敲出的换行；textContent 会把多行挤成一行
                const newContent = contentEl.innerText.trim();
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

    // 页面刚刷新时，content script 可能还没注入完成，这时发消息会报
    // "Could not establish connection. Receiving end does not exist."
    // 这是瞬时的，稍等一下重试一次基本都能成功，不应该直接报错给用户。
    function isTransientConnectionError(message) {
        return !!message && (
            message.includes('Receiving end does not exist') ||
            message.includes('Could not establish connection')
        );
    }

    function sendTabMessageWithRetry(tabId, message, callback, retriesLeft = 1) {
        chrome.tabs.sendMessage(tabId, message, (response) => {
            const lastError = chrome.runtime.lastError;

            if (lastError && isTransientConnectionError(lastError.message) && retriesLeft > 0) {
                console.log('[LumiFlow] Content script not ready yet, retrying in 800ms...');
                setTimeout(() => {
                    sendTabMessageWithRetry(tabId, message, callback, retriesLeft - 1);
                }, 800);
                return;
            }

            callback(response);
        });
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
