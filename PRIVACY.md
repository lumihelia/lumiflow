# LumiFlow Privacy Policy

[中文](PRIVACY.zh-CN.md) · [English](PRIVACY.md) · [Plain text](PRIVACY.txt)

**Last updated: October 21, 2026**

This policy describes how the current LumiFlow browser extension for Chrome and Firefox handles data.

## Summary

LumiFlow currently has no hosted backend, account system, analytics, advertising SDK, or usage tracking.

Most LumiFlow data stays in your browser. If you enable API compression, the conversation content needed for that compression is sent directly from the extension to the API provider you selected. That request does not pass through a LumiFlow-operated server.

## Data stored locally

LumiFlow uses the browser's local extension storage to keep:

- checkpoint segments;
- API settings;
- your API key, if you save one;
- preferences such as Auto / Manual mode.

These items are stored in the extension's `storage.local` area in your browser.

## Data sent to third parties

### API compression

If you enable API compression and configure Gemini, OpenAI, or Anthropic:

- the extension sends the material required for compression directly to the selected provider;
- your API key is used to authenticate that request;
- LumiFlow does not proxy the request through its own backend because it currently has no hosted backend;
- the selected provider's privacy policy, retention rules, pricing, and service terms apply to that request.

Provider policies:

- Google: https://policies.google.com/privacy
- OpenAI: https://openai.com/policies/privacy-policy
- Anthropic: https://www.anthropic.com/privacy

### Conversation extraction

LumiFlow reads conversations from supported AI services so it can export them or create checkpoints.

For ChatGPT and Claude, the extension may read the current conversation from platform data used by the web application and can fall back to page-based extraction. Gemini uses page-based extraction. For DeepSeek, the extension may read the current conversation from the web application's own conversation endpoint, using the login session already present in that browser tab, and can fall back to page-based extraction.

This access happens in the browser session where you are already using the AI service. LumiFlow does not send those extracted conversations to a LumiFlow server.

### Images and files (DOWNLOAD ZIP)

When you click `DOWNLOAD ZIP` on ChatGPT, Claude or Gemini, LumiFlow downloads the images and files in that conversation (uploaded pictures, PDFs, AI-generated images and so on) from the AI service and saves them with the conversation as a ZIP file on your computer. These files are not sent anywhere else. On Gemini, LumiFlow reads images the page has already loaded; if an image cannot be read, it captures it from the visible tab (cropped to the image) and saves the capture into the same ZIP. Screen captures are not kept or sent anywhere else.

ChatGPT and Gemini store files on separate hosts, `oaiusercontent.com` and `googleusercontent.com`. Access to them is an optional permission: when `DOWNLOAD ZIP` first needs a file from one of these hosts, LumiFlow opens a page where you can allow it. If you decline, the ZIP contains the conversation without those files.

If API compression is enabled, the subset of conversation content needed for compression is then sent to the provider you selected, as described above.

## Data LumiFlow does not currently collect

The current extension does not include:

- LumiFlow analytics;
- usage tracking;
- advertising trackers;
- crash-reporting SDKs;
- a LumiFlow account database;
- a LumiFlow-hosted conversation store.

## Permissions

The current Manifest V3 extension requests:

| Permission / host access | Purpose |
| --- | --- |
| `storage` | Save segments, API settings, and preferences locally |
| `activeTab` | Interact with the supported AI page you are actively using |
| `chatgpt.com`, `chat.openai.com` | Read and inject context on ChatGPT |
| `claude.ai` | Read and inject context on Claude |
| `gemini.google.com` | Read and inject context on Gemini |
| `chat.deepseek.com` | Read and inject context on DeepSeek |
| `api.openai.com` | Send user-authorized OpenAI compression requests |
| `api.anthropic.com` | Send user-authorized Anthropic compression requests |
| `generativelanguage.googleapis.com` | Send user-authorized Gemini compression requests |
| `*.oaiusercontent.com` (optional) | Download ChatGPT images and files into a ZIP you requested |
| `*.googleusercontent.com` (optional) | Download Gemini images into a ZIP you requested |

The source of truth for current permissions is [`manifest.json`](manifest.json).

## API keys

If you save an API key in LumiFlow, it is stored in the extension's local storage in your browser.

The key is used only when the extension makes a request to the API provider you selected. LumiFlow currently has no server that receives or stores your API key.

As with any locally stored credential, anyone or any software with sufficient access to your browser profile or device may potentially access local extension data. Use API keys with appropriate provider-side spending limits and rotation practices.

## Deleting local data

You can remove checkpoint segments from the extension interface.

To remove all LumiFlow local extension data, uninstall LumiFlow from your browser. Chrome and Firefox remove the extension's local storage as part of uninstalling it.

You can also remove or replace a saved API key from LumiFlow settings.

## Open source

LumiFlow is open source under the MIT License. You can inspect the current implementation here:

https://github.com/lumihelia/lumiflow

## Changes to this policy

If LumiFlow's data flow changes — for example, if a hosted service, analytics system, account layer, or new third-party integration is added — this policy should be updated together with the relevant code and store disclosure.

## Contact

Privacy questions and issues can be filed at:

https://github.com/lumihelia/lumiflow/issues
