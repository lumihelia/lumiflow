# LumiFlow Troubleshooting

[中文](TROUBLESHOOTING.zh-CN.md) · [English](TROUBLESHOOTING.md)

For **LumiFlow v2.9.2**.

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
4. If it still fails, reload LumiFlow from `chrome://extensions/` (Chrome) or `about:addons` (Firefox).
5. In Firefox, open the LumiFlow popup on the page: if it shows **Allow access**, click it and refresh.
6. Refresh the AI page once more after reloading the extension.

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

Gemini export reads the conversation from the page (`user-query` / `model-response` elements), after scrolling to load older messages. If Gemini changes its markup, extraction may need to be updated.

Refresh first. If the problem is reproducible after a refresh, report it with a screenshot and relevant console logs.

### DeepSeek

LumiFlow first reads the current conversation data used by the DeepSeek web app (final answers only, without DeepThink reasoning), then falls back to page extraction. Confirm that you are signed in and the right conversation is open, then refresh and retry.

## DOWNLOAD ZIP is missing images or files

Open `conversation.md` in the ZIP and scroll to the end. Files that could not be included are listed under **Not included**, each with the reason. The last line shows the LumiFlow version that made the ZIP.

- **"LumiFlow does not have access to … yet"**: ChatGPT stores some files on `oaiusercontent.com`. LumiFlow opens a page with **Allow access**; allow it, then click `DOWNLOAD ZIP` again.
- **"file no longer available"** or **HTTP 404 / 410**: the platform no longer serves that file. Expired uploads cannot be recovered.
- **Gemini images**: LumiFlow reads the images Gemini has already loaded in the page. Keep the Gemini tab in front while the ZIP is being made; the page scrolls by itself. Images it cannot read are saved as `… (screen capture).png` at the size shown on screen.
- Gemini PDF attachments and DeepSeek images are not collected yet; the ZIP contains their text only.

## COMPRESS fails

First identify which Auto route is in use. LumiFlow uses an API only when **Enable API Compression** is on and a key is saved; otherwise it generates the checkpoint in the current web conversation.

### Auto in-chat (no API key)

- Confirm that you are signed in to the AI website, can send messages, and have quota left on that platform.
- Check whether the compression prompt was sent. If LumiFlow says "Prompt injected. Click Send", send it yourself, then use Manual `ABSORB` once the reply is complete.
- Keep the conversation page open while the AI writes. LumiFlow waits up to 60 seconds (90 seconds on Gemini and DeepSeek); the popup countdown does not mean the platform has finished.
- The popup may close when you click the page. Reopen it to pick up the saved checkpoint, within 30 minutes; older pending checkpoints expire.
- If the AI replied but no segment appeared, select the checkpoint in the reply and use Manual `ABSORB`. No API is needed.

### Auto API (optional)

Check:

- **Enable API Compression** is turned on;
- the selected provider matches the API key you entered;
- the API key is still valid;
- the provider account has available quota / billing capacity;
- your network can reach the provider API;
- the provider is not experiencing an outage.

LumiFlow supports Gemini, OpenAI, and Anthropic API compression.

API compression runs in the background and continues if the popup closes; reopen it after it finishes to see the result. A failed API request does not switch to the in-chat route by itself: turn API Compression off and press `COMPRESS` again to use the current conversation, or switch to Manual Mode and `ABSORB` the text you need.

## INJECT does not place text in the input field

1. Open the target ChatGPT / Claude / Gemini / DeepSeek conversation.
2. Click the message input field so it has focus.
3. Open LumiFlow and click `INJECT` again.
4. If the page was just refreshed, wait briefly for its editor and the extension content script to initialize.
5. Refresh the page if the editor has changed or stopped responding.

If no input box is found, LumiFlow copies the checkpoint to the clipboard instead. Paste it into the input box yourself and review it before sending.

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
