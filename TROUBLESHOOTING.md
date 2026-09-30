# LumiFlow Troubleshooting

[中文](TROUBLESHOOTING.zh-CN.md) · [English](TROUBLESHOOTING.md)

For **LumiFlow v2.5.0**.

Start with the simplest recovery step: refresh the AI conversation page, wait for the conversation UI to finish loading, then try the LumiFlow action again.

## Confirm that the page is supported

LumiFlow currently supports conversation pages on:

- `chatgpt.com` / `chat.openai.com`
- `claude.ai`
- `gemini.google.com`
- `chat.deepseek.com`

Home pages, settings pages, login pages, or other routes without an active conversation may not provide extractable messages or an injectable input field.

## "No response from page" / action does nothing

The extension content script may not have attached to the page yet.

Try in this order:

1. Refresh the conversation page.
2. Wait for the page to finish loading.
3. Open LumiFlow and retry the action.
4. If it still fails, reload LumiFlow from `chrome://extensions/`.
5. Refresh the AI page once more after reloading the extension.

A page that was already open before installing or updating an extension often needs one refresh before the new content script is available.

## Full conversation export is incomplete

### ChatGPT / Claude

LumiFlow first tries to read the current conversation from platform data used by the web application. If that path is unavailable, it falls back to page-based loading and extraction.

If the exported TXT / Markdown is incomplete:

1. Refresh the conversation page.
2. Confirm that the correct conversation has fully opened.
3. Retry `DOWNLOAD TXT` or `DOWNLOAD MD`.
4. On a very long conversation, allow the fallback path enough time to load older messages.
5. Check the browser console for LumiFlow extraction logs if the problem persists.

### Gemini

Gemini export depends on the rendered page structure. If Gemini changes its markup, extraction selectors may need to be updated.

Refresh first. If the problem is reproducible after a refresh, report it with a screenshot and relevant console logs.

### DeepSeek

The extension first reads the current web conversation data, exporting final answers without DeepThink reasoning, then falls back to page extraction if needed. Confirm that you are signed in and the correct conversation is open, then refresh and retry.

## COMPRESS fails

First identify the Auto route: an API is used only when **Enable API Compression** is on and a key is saved; otherwise the checkpoint is generated in the current web conversation.

### Auto in-chat

- Confirm that the website account is signed in, can send messages, and has available platform quota.
- Check whether the compression prompt was sent. If you see "Prompt injected. Click Send", send it yourself and use Manual `ABSORB` after the reply finishes.
- Keep the original conversation page open and wait for the AI. DeepSeek has a longer 90-second wait window; the popup countdown is not proof that generation has finished.
- If the popup closes, reopen it to pick up a saved checkpoint. Do this promptly: pending checkpoints older than 30 minutes expire.
- If the AI replied but segments are still empty, select that checkpoint reply and use Manual `ABSORB`; configuring an API is not a prerequisite.

### Auto API

Check:

- **Enable API Compression** is turned on;
- the selected provider matches the API key you entered;
- the API key is still valid;
- the provider account has available quota / billing capacity;
- your network can reach the provider API;
- the provider is not experiencing an outage.

LumiFlow supports Gemini, OpenAI, and Anthropic API compression.

API compression runs in the background even if the popup closes; reopen it after completion to see the result. A failed API request does not automatically retry in-chat. You can disable API Compression and start an in-chat request, or switch to Manual Mode and use `ABSORB` to save selected text without model compression.

## INJECT does not place text in the input field

1. Open the target ChatGPT / Claude / Gemini / DeepSeek conversation.
2. Click the message input field so it has focus.
3. Open LumiFlow and click `INJECT` again.
4. If the page was just refreshed, wait briefly for its editor and the extension content script to initialize.
5. Refresh the page if the editor has changed or stopped responding.

If no input box is found, the popup attempts to copy the checkpoint to the clipboard. After a copied confirmation, paste it into the target input and review it; if copying fails too, click the input box and retry.

AI services regularly change their editors. A reproducible injection failure after a platform UI update may require a compatibility fix in LumiFlow.

## ABSORB does not capture selected text

Manual Mode depends on the text selection that currently exists on the AI page.

Check that:

1. LumiFlow is in Manual Mode.
2. Text is visibly selected on the conversation page.
3. You have not clicked somewhere else and cleared the selection before pressing `ABSORB`.

If selection capture repeatedly fails on one platform, report the platform and browser version.

## API key / privacy questions

API keys are stored in LumiFlow's Chrome local extension storage. When API compression runs, the key and the content needed for compression are sent directly to the provider you selected.

The request does not pass through a LumiFlow-hosted backend because the current extension has no hosted backend.

See [PRIVACY.md](PRIVACY.md) for the current data flow and permission details.

## Check console logs

Open DevTools on the AI conversation page:

- Chrome / Edge: right-click the page → **Inspect** → **Console**.

Look for LumiFlow-related messages such as:

```text
[LumiFlow]
[GET_CONVERSATION]
[EXTRACT]
```

Useful signals include:

- whether the platform was detected correctly;
- whether messages were found;
- whether a direct conversation-data path failed and fallback extraction started;
- whether injection or extension messaging returned an error.

Do not publish API keys or other secrets in an issue. Remove sensitive content from logs before sharing them.

## When to report a bug

Open an issue when the failure remains reproducible after refreshing the page and reloading the extension:

https://github.com/lumihelia/lumiflow/issues

Include:

1. AI platform and conversation URL domain (do not share private conversation URLs if they contain sensitive identifiers).
2. Browser and version.
3. LumiFlow version.
4. Exact action: `DOWNLOAD TXT`, `DOWNLOAD MD`, `COMPRESS`, `ABSORB`, or `INJECT`.
5. Reproduction steps.
6. Expected result and actual result.
7. Relevant console logs with secrets and private content removed.
8. Screenshot when it helps explain the UI state.
