/*
 * LumiFlow - AI Context Manager
 * Copyright (C) 2026 Helia (@LumiHelia)
 * 
 * Licensed under AGPLv3 - Closed-source forks prohibited.
 * See LICENSE file for details.
 */

// ========================================
// LumiFlow v2.1 - Content Script
// ========================================

console.log("LumiFlow v2.1: Content script loaded");

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

const DEFAULT_COMPRESSION_PROMPT = `CONTEXT COMPRESSION TASK\n\n` +
`You are helping me transition to a new chat session. I need you to compress our entire conversation into a structured checkpoint that I can paste into a new session to continue seamlessly.\n\n` +
`CRITICAL: You must analyze our actual conversation history and fill in specific details, NOT just repeat the template structure.\n\n` +
`Your output MUST follow this EXACT format:\n\n` +
`<<<CHECKPOINT_START>>>\n\n` +
`1. Project Goal\n[Describe the specific "North Star" - what are we actually trying to solve/build?]\n\n` +
`2. Current Status\n[Where are we RIGHT NOW? What has been 100% verified/completed? What are we stuck on?]\n\n` +
`3. Immutable Decisions\n[List the specific constraints, design decisions, or principles we've agreed on - things we should NOT re-discuss]\n\n` +
`4. Pending Actions\n[List the immediate next steps in priority order - what should we do next?]\n\n` +
`5. Critical Context\n[Any essential details: code snippets, variable names, specific user requirements, technical constraints]\n\n` +
`<<<CHECKPOINT_END>>>\n\n` +
`IMPORTANT RULES:\n` +
`- Replace ALL bracketed placeholders with ACTUAL content from our conversation\n` +
`- Optimize for information density - be concise but complete\n` +
`- Include ONLY facts and decisions from our actual conversation\n` +
`- Do NOT include explanatory text or meta-commentary\n` +
`- Your response MUST start with <<<CHECKPOINT_START>>> and end with <<<CHECKPOINT_END>>>`;

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
});

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
        
        // Step 2: Get compression prompt (custom or default)
        const prompt = request.customPrompt || DEFAULT_COMPRESSION_PROMPT;
        
        // Step 3: Inject prompt
        console.log('Injecting compression prompt...');
        injectTextIntoField(inputField, prompt);
        await sleep(500);
        
        // Step 4: Try to auto-send (optional)
        if (request.autoSend !== false) {
            const sendButton = findSendButton();
            if (sendButton) {
                console.log('Auto-sending...');
                sendButton.click();
                
                // Step 5: Wait for response
                try {
                    const response = await waitForAIResponse(60000);
                    
                    console.log('[CONTENT] Got AI response, saving to storage...');
                    
                    // Save directly to chrome.storage.local
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
                    console.error('Timeout waiting for response');
                    sendResponse({
                        status: 'timeout',
                        message: 'AI response timeout. Please select the response manually.'
                    });
                }
            } else {
                // No send button found, user must send manually
                sendResponse({
                    status: 'pending_send',
                    message: 'Prompt injected. Please click Send, then select the AI response.'
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

function handleGetConversation(sendResponse) {
    try {
        const platform = detectPlatform();
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
    
    switch(platform) {
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
                // Enhanced fallback checks
                const html = container.innerHTML.toLowerCase();
                const text = container.textContent || '';
                
                // Check for user indicators
                if (html.includes('user avatar') || 
                    html.includes('text-user-message') ||
                    html.includes('role="user"') ||
                    container.querySelector('[data-role="user"]')) {
                    role = 'user';
                }
                // Check for claude indicators
                else if (html.includes('claude avatar') ||
                         html.includes('text-claude-message') ||
                         html.includes('role="assistant"') ||
                         container.querySelector('[data-role="assistant"]')) {
                    role = 'model';
                }
                // Pattern-based fallback: User messages tend to be shorter
                else if (text.length < 500 && !html.includes('<code')) {
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
        const html = el.innerHTML;
        
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
    
    switch(platform) {
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
    
    switch(platform) {
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
// TEXT INJECTION
// ========================================

function injectTextIntoField(element, text) {
    element.focus();

    const formattedText = text.replace(/\n/g, '\n');

    const isInserted = document.execCommand('insertText', false, formattedText);

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
                console.log(`[WAIT] Waiting for AI to start... (${Math.floor(elapsed/1000)}s)`);
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
                console.log(`[WAIT] Waiting for <<<CHECKPOINT_END>>>... (${Math.floor(elapsed/1000)}s)`);
            }
        }, 800);
    });
}

function getLastAIMessage() {
    const platform = detectPlatform();
    let selector = '';
    
    switch(platform) {
        case PLATFORMS.CHATGPT:
            selector = '[data-message-author-role="assistant"]';
            break;
        case PLATFORMS.CLAUDE:
            selector = '[data-test-render-count]';
            break;
        case PLATFORMS.GEMINI:
            selector = 'model-response, .model-response-text';
            break;
        case PLATFORMS.PERPLEXITY:
            selector = '[class*="Answer"], [class*="answer"]';
            break;
        case PLATFORMS.POE:
            selector = '[class*="Message_botMessageBubble"]';
            break;
        case PLATFORMS.MISTRAL:
            selector = '[class*="assistant"]';
            break;
        case PLATFORMS.DEEPSEEK:
            selector = '[class*="assistant"], [data-role="assistant"]';
            break;
        default:
            // Generic fallback
            selector = '[class*="assistant"], [class*="bot"], [class*="ai"]';
            break;
    }

    const messages = document.querySelectorAll(selector);
    
    if (messages.length === 0) {
        return null;
    }
    
    // Return the last (most recent) AI message
    return messages[messages.length - 1];
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
    switch(platform) {
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
