# LumiFlow User Guide

[中文](USER_GUIDE_CN.md) · [English](USER_GUIDE_EN.md)

For **LumiFlow v2.5.0**.

LumiFlow currently supports two main paths:

1. Export a complete conversation as TXT or Markdown.
2. Turn the context that still matters into a checkpoint and inject it into a new conversation.

## Installation

### Chrome Web Store

Install directly from [LumiFlow - Chrome Web Store](https://chromewebstore.google.com/detail/lumiflow/onekhnkogijnmpddmceomhibhenhffaf).

After installation, pin LumiFlow to the browser toolbar if you want quick access from ChatGPT, Claude, Gemini, and DeepSeek conversation pages.

### Load from source

```bash
git clone https://github.com/lumihelia/lumiflow.git
cd lumiflow
```

Open `chrome://extensions/`, enable **Developer mode**, click **Load unpacked**, and select the repository folder.

## Supported platforms

- ChatGPT: `chatgpt.com` / `chat.openai.com`
- Claude: `claude.ai`
- Gemini: `gemini.google.com`
- DeepSeek: `chat.deepseek.com`

Use LumiFlow on an actual conversation page. Home pages, settings pages, and other non-conversation routes may not contain extractable chat content.

## Workflow 1: Export the full conversation

Use either:

- `DOWNLOAD TXT`
- `DOWNLOAD MD`

The exported file keeps speaker labels such as User, ChatGPT, Claude, Gemini, and DeepSeek.

This workflow:

- does not create a segment;
- does not compress the conversation;
- does not require a model API key;
- is useful for archiving, reading, backups, or downstream processing.

For ChatGPT and Claude, LumiFlow first tries to read the current conversation from the platform data used by the web app. If that path is unavailable, it falls back to loading and extracting the page. Gemini uses page extraction. DeepSeek first reads the conversation data used by the web app (final answers only, without DeepThink reasoning) and falls back to page extraction.

If an export is obviously incomplete, refresh the conversation page and retry. If the problem persists, see [Troubleshooting](TROUBLESHOOTING.md).

## Workflow 2: Create and migrate a checkpoint

A checkpoint stores what the next conversation still needs to know. It contains one or more segments.

### Auto Mode: compress the full conversation

Use Auto Mode when a conversation is long and you want to quickly extract goals, current state, decisions, constraints, examples, failed attempts, and next steps.

#### Auto in-chat: use the current web conversation

1. Open LumiFlow on a supported AI conversation page and keep Auto Mode enabled.
2. Turn **Enable API Compression** off in Settings; this route is also used when no API key is saved.
3. Click `COMPRESS`. The extension inserts a compression prompt into the current chat and attempts to send it.
4. Wait for the AI checkpoint. If you see "Prompt injected. Click Send", send it yourself and use Manual `ABSORB` after the reply finishes.
5. If clicking the page closes the popup, reopen LumiFlow after the result is saved to pick it up as Checkpoint Segments. If it is still missing, select the AI checkpoint reply and use Manual `ABSORB`.

No extension API key is required, but this uses your current website account. Its login requirements, subscription, quota, and terms still apply.

#### Auto API: optional background compression

1. Open LumiFlow Settings on the conversation page.
2. Enable **API Compression** and choose Gemini, OpenAI, or Anthropic.
3. Enter your own valid API key and save it.
4. Return to Auto Mode and click `COMPRESS`.
5. Compression runs in the background. You can close the popup and reopen it after completion to view the segments.

This route is used only when API Compression is enabled and a key is saved. Content goes directly to the selected API provider, without sending a compression prompt into the current chat. The key and settings stay in local browser storage; the provider's quota, pricing, and privacy terms still apply.

### Manual Mode: choose what moves forward

Use Manual Mode when you only want to keep specific material, want precise control over the checkpoint, or do not want to use a third-party compression API.

Steps:

1. Open LumiFlow.
2. Switch to Manual Mode.
3. Select the text you want to preserve on the current conversation page.
4. Click `ABSORB`.
5. Select more material and repeat as needed.

Each absorbed selection becomes a segment without calling a model to compress it.

## Manage checkpoint segments

The Checkpoint area lets you refine the context before moving it forward:

- edit a segment;
- delete a segment;
- drag to reorder;
- expand / collapse;
- clear all segments;
- export the checkpoint as Markdown;
- export the checkpoint as JSON.

Editing is an important part of the workflow. Auto Mode output is still yours to revise: remove noise, add missing constraints, change wording, and decide what belongs in the next conversation.

## Inject the checkpoint into a new conversation

1. Open a new ChatGPT / Claude / Gemini / DeepSeek conversation.
2. Open LumiFlow.
3. Check that the segments are ready.
4. Click `INJECT`.
5. LumiFlow places the checkpoint into the current input field.
6. Review it and decide whether to send it.

If a checkpoint is long, LumiFlow may offer another compression step. With an API configured, you can compress again. Without one, you can continue with the existing content or cancel.

## API settings

LumiFlow supports:

- Google Gemini API
- OpenAI API
- Anthropic API

API compression is optional. Auto in-chat, Manual Mode, full conversation export, and local segment management require no extension API key; Auto in-chat still uses the website platform's model and account quota.

### Cost

LumiFlow itself has no subscription and does not impose a count-based usage limit.

API compression uses your own third-party API key, so actual cost, free quota, and rate limits are controlled by the provider.

### API keys

API keys are stored in `chrome.storage.local`. LumiFlow currently has no hosted backend; API requests go directly from the extension to the provider you selected.

See [Privacy Policy](PRIVACY.md) for the complete data boundary.

## Keyboard shortcuts

Default shortcuts:

| Action | Windows / Linux | macOS |
| --- | --- | --- |
| COMPRESS | `Ctrl+Shift+C` | `Command+Shift+C` |
| INJECT | `Ctrl+Shift+I` | `Command+Shift+I` |
| Open extension | `Ctrl+Shift+L` | `Command+Shift+L` |

Chrome or another extension may already use the same shortcut. If a shortcut does not respond, check Chrome's extension shortcut settings for conflicts.

## Common issues

### COMPRESS does not work

Check that:

- you are on a supported AI conversation page;
- for Auto in-chat: your website account is signed in and able to send messages; check whether the prompt was sent or the AI is still generating, then reopen the popup after the result is saved;
- for Auto API: API Compression is enabled, the provider and valid key are saved, and the API quota and network are available.

If you need to keep moving, switch to Manual Mode and use `ABSORB` to build the checkpoint yourself.

### INJECT does not place content in the input field

Click the target AI input field first so it has focus, then try `INJECT` again. If the page was just refreshed, allow the page and extension content script to finish loading before retrying. If no input box is found, the popup attempts to copy the checkpoint to the clipboard; after a copied confirmation, paste and review it yourself before sending.

### Full export only contains part of the conversation

Refresh the conversation page and retry. On long chats, a fallback extraction path may need the history to load first. If the issue persists, capture the platform, browser version, and relevant console logs before opening an issue.

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more steps.

## Local data and deletion

LumiFlow stores these items locally in the browser:

- checkpoint segments;
- API settings and API key;
- preferences such as Auto / Manual mode.

Clearing Checkpoint Segments removes the saved segments. Uninstalling the extension removes its local extension storage.

## Getting help

For bugs, platform compatibility problems, or feature requests:

https://github.com/lumihelia/lumiflow/issues

When reporting a problem, include when possible:

- AI platform;
- browser and version;
- reproducible steps;
- expected and actual behavior;
- relevant console logs or screenshots.
