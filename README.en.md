# LumiFlow

Carry an AI conversation into the next one.

[中文](README.md) · [English](README.en.md)

[![Version](https://img.shields.io/badge/version-2.9.2-blue.svg)](manifest.json)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-brightgreen.svg)](https://chromewebstore.google.com/detail/lumiflow/onekhnkogijnmpddmceomhibhenhffaf)
[![Firefox Add-ons](https://img.shields.io/badge/Firefox-Add--ons-orange.svg)](https://addons.mozilla.org/firefox/addon/lumiflow/)
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)

LumiFlow is a browser extension for Chrome and Firefox, built for ChatGPT, Claude, Gemini, and DeepSeek. It treats conversations as context that can be organized, saved, and moved forward when a chat gets too long, you switch models, or you start a new session.

It currently supports two main workflows:

- **Full conversation export**: download the current conversation as TXT or Markdown with speaker labels for archiving, reading, or further processing.
- **Checkpoint migration**: distill the goals, decisions, constraints, examples, and progress that still matter into editable segments, then inject them into a new AI conversation.

Current version: **v2.9.2**.

## When it is useful

- A conversation has become long and you want to continue in a fresh chat.
- The same project moves between ChatGPT, Claude, Gemini, and DeepSeek.
- You want a complete archive without pasting the entire history into the next model.
- You want to choose, edit, and reorder exactly which context moves forward.

## Two workflows

### 1. Full conversation export

Open LumiFlow on a supported conversation page and click:

- `DOWNLOAD TXT`
- `DOWNLOAD MD`
- `DOWNLOAD ZIP`: conversation + images + files

`DOWNLOAD ZIP` packs the conversation together with its images and files: in `conversation.md`, images appear where they were in the chat and point to files in the ZIP's `media/` folder. It currently supports ChatGPT, Claude and Gemini, including images and files you uploaded (PDF, Word, spreadsheets and so on) and AI-generated images; files for which Claude kept only the extracted text are saved as `.txt`. Files that have expired or cannot be downloaded are listed at the end of `conversation.md`. Gemini is supported from v2.9.0 for images you uploaded and images Gemini generated: LumiFlow reads the image already loaded in the page, or saves a screen capture when it cannot. When images live on another host (Gemini's `googleusercontent.com`, some ChatGPT files on `oaiusercontent.com`), the first ZIP is saved without them and a LumiFlow page opens where you can allow access; then click `DOWNLOAD ZIP` again. DeepSeek exports text only for now.

The export keeps speaker labels such as User / ChatGPT / Claude / Gemini / DeepSeek.

For ChatGPT and Claude, LumiFlow first tries to read the current conversation from the platform data used by the web app. If that path is unavailable, it falls back to loading and extracting the page. Gemini is exported through page extraction. DeepSeek first reads the conversation data used by the web app (final answers only, without the "DeepThink" reasoning) and falls back to page extraction.

This workflow does not create checkpoint segments and does not require a model API key.

### 2. Checkpoint migration

A checkpoint keeps the information the next conversation still needs.

#### Auto Mode

Click `COMPRESS`. Auto Mode has two routes:

- **Auto in-chat (no API key)**: when API Compression is off or no key is saved, LumiFlow inserts a compression prompt into the current AI conversation, tries to send it, and waits for that platform to write the checkpoint. If it asks you to send the prompt yourself, do so, then use Manual `ABSORB` once the reply is complete.
- **Auto API (optional)**: when API Compression is on and a valid key is saved, LumiFlow compresses the conversation in the background through your Gemini, OpenAI, or Anthropic API, without sending a prompt into the current chat.

Results from either route are picked up as segments when you reopen the popup; the API route keeps running after the popup closes.

Use it for long conversations when you want a fast summary of goals, state, decisions, examples, and next steps.

#### Manual Mode

Switch to Manual Mode, select the material you want to preserve on the page, then click `ABSORB`.

Use it when you want precise control over context. `ABSORB` keeps the exact text you selected, without calling a model to compress it.

Segments can be edited, deleted, and reordered. When the checkpoint is ready, open a new ChatGPT / Claude / Gemini / DeepSeek conversation and click `INJECT`. LumiFlow places the checkpoint into the input field; you remain in control of whether to send it.

## Current capabilities

| Capability | Status |
| --- | --- |
| ChatGPT | Supported |
| Claude | Supported |
| Gemini | Supported |
| DeepSeek (`chat.deepseek.com`) | Full export and inject supported; added in v2.5.0 |
| Full TXT / Markdown conversation export | Supported |
| ZIP export (conversation + images + files) | ChatGPT and Claude (v2.8.0), Gemini images (v2.9.0) |
| Auto in-chat compression | Supported; uses the current AI web conversation, no API key |
| Auto API compression | Optional; enable API Compression and save your own Gemini / OpenAI / Anthropic API key |
| Manual ABSORB | Supported; no API key required |
| Edit / delete / reorder segments | Supported |
| Checkpoint Markdown / JSON export | Supported |
| Keyboard shortcuts | Supported (`Alt+Shift+C` compress / `Alt+Shift+V` inject / `Alt+Shift+L` open) |
| Firefox | Supported from v2.7.0 (Firefox 140 or later) |
| Dark mode | Follows system preference |
| Analytics / usage tracking | None |
| LumiFlow-hosted backend | None |

## Installation

### Chrome Web Store

Install the published version from the [Chrome Web Store](https://chromewebstore.google.com/detail/lumiflow/onekhnkogijnmpddmceomhibhenhffaf).

### Firefox Add-ons

Install from [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/lumiflow/) (Firefox 140 or later).

### Load from source

```bash
git clone https://github.com/lumihelia/lumiflow.git
cd lumiflow
```

Chrome:

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the repository folder.

Firefox (temporary; reload after restarting the browser):

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Select `manifest.json` in the repository folder.
4. If LumiFlow says it needs access to the site, click **Allow access** in the popup.

## API usage and cost

LumiFlow itself has no subscription and does not impose a usage-count limit.

Auto in-chat uses the AI website account you are signed in to; that platform's subscription, quota, and terms still apply.

Auto API sends compression requests directly to the API provider you choose. You use your own API key, so the provider's quota, pricing, and terms still apply.

Current models: Gemini `gemini-flash-latest` (Google's official alias for the current Flash model), OpenAI `gpt-6.1-sol`, Anthropic `claude-opus-5-5`. They are defined in one place, `MODELS` at the top of `background.js`.

Manual Mode, full conversation export, and local segment management do not require a model API.

## Privacy

LumiFlow currently has no hosted backend, account system, analytics, or usage tracking.

Segments, settings, and saved API keys are stored locally in the browser. Auto in-chat sends the compression prompt into the current AI web conversation, where that platform processes it. When API compression is enabled, the conversation content needed for compression is sent directly from the extension to the selected Google / OpenAI / Anthropic API. It does not pass through a LumiFlow server.

Read the full policy:

- [隐私说明（中文）](PRIVACY.zh-CN.md)
- [Privacy Policy (English)](PRIVACY.md)

## Documentation

- [使用说明（中文）](USER_GUIDE_CN.md)
- [User Guide (English)](USER_GUIDE_EN.md)
- [故障排查（中文）](TROUBLESHOOTING.zh-CN.md)
- [Troubleshooting (English)](TROUBLESHOOTING.md)
- [参与贡献（中文）](CONTRIBUTING.zh-CN.md)
- [Contributing (English)](CONTRIBUTING.md)

Files such as `CHANGELOG_*`, `RELEASE_NOTES_*`, and `UPDATE_SUMMARY_*` are historical records for earlier versions. They may intentionally mention feature names that later releases replaced.

## Project structure

LumiFlow is a Manifest V3 browser extension; the same code ships to Chrome and Firefox. The main pieces are:

- `content.js`: platform detection, conversation extraction, text selection, and input-field injection.
- `popup.js` / `popup.html`: extension UI, segment management, export, and compression workflows.
- `background.js`: user-authorized requests to Gemini / OpenAI / Anthropic APIs; runs the API compression flow.
- `prompts.js`: the checkpoint prompt, shared by in-chat and API compression.
- `manifest.json`: permissions, supported domains, and keyboard shortcuts.

## Development and contribution

Bug reports, compatibility fixes, documentation corrections, and feature improvements are welcome. Start here:

- [参与贡献（中文）](CONTRIBUTING.zh-CN.md)
- [Contributing (English)](CONTRIBUTING.md)

## License

[MIT License](LICENSE).

You may use, modify, and redistribute the code, including in commercial or closed-source projects, subject to the license notice requirements.

## Contact

- GitHub Issues: https://github.com/lumihelia/lumiflow/issues
- X: [@LumiHelia](https://x.com/LumiHelia)
