# LumiFlow

Carry an AI conversation into the next one.

[中文](README.md) · [English](README.en.md)

[![Version](https://img.shields.io/badge/version-2.5.0-blue.svg)](manifest.json)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-brightgreen.svg)](https://chromewebstore.google.com/detail/lumiflow/onekhnkogijnmpddmceomhibhenhffaf)
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)

LumiFlow is a Chrome extension for ChatGPT, Claude, Gemini, and DeepSeek. It treats conversations as context that can be organized, saved, and moved forward when a chat gets too long, you switch models, or you start a new session.

It currently supports two main workflows:

- **Full conversation export**: download the current conversation as TXT or Markdown with speaker labels for archiving, reading, or further processing.
- **Checkpoint migration**: distill the goals, decisions, constraints, examples, and progress that still matter into editable segments, then inject them into a new AI conversation.

Current version: **v2.5.0**.

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

The export keeps speaker labels such as User / ChatGPT / Claude / Gemini / DeepSeek.

For ChatGPT and Claude, LumiFlow first tries to read the current conversation from the platform data used by the web app. If that path is unavailable, it falls back to loading and extracting the page. Gemini is exported through page extraction. DeepSeek first reads the conversation data used by the web app (final answers only, without the "DeepThink" reasoning) and falls back to page extraction.

This workflow does not create checkpoint segments and does not require a model API key.

### 2. Checkpoint migration

A checkpoint keeps the information the next conversation still needs.

#### Auto Mode

Click `COMPRESS`. Auto Mode has two routes:

- **Auto in-chat (no extension API key)**: when API Compression is off or no key is saved, LumiFlow inserts a compression prompt into the current AI conversation and attempts to send it, then waits for that platform's checkpoint. If prompted to send it yourself, do so and follow the Manual `ABSORB` instruction.
- **Auto API (optional)**: when API Compression is enabled and a valid key is saved, LumiFlow compresses through your configured Gemini, OpenAI, or Anthropic API in the background without sending a compression prompt into the current chat.

Saved results from either route can be picked up as segments when you reopen the popup; the API route keeps running after the popup closes.

Use it for long conversations when you want a fast summary of goals, state, decisions, examples, and next steps.

#### Manual Mode

Switch to Manual Mode, select the material you want to preserve on the page, then click `ABSORB`.

Use it when you want precise control over context. `ABSORB` saves selected text without calling a model to compress it.

Segments can be edited, deleted, and reordered. When the checkpoint is ready, open a new ChatGPT / Claude / Gemini / DeepSeek conversation and click `INJECT`. LumiFlow places the checkpoint into the input field; you remain in control of whether to send it.

## Current capabilities

| Capability | Status |
| --- | --- |
| ChatGPT | Supported |
| Claude | Supported |
| Gemini | Supported |
| DeepSeek (`chat.deepseek.com`) | Full export and inject supported; added in v2.5.0 |
| Full TXT / Markdown conversation export | Supported |
| Auto in-chat compression | Supported; uses the current AI web conversation, no extension API key |
| Auto API compression | Optional; enable API Compression and save your own Gemini / OpenAI / Anthropic API key |
| Manual ABSORB | Supported; no API key required |
| Edit / delete / reorder segments | Supported |
| Checkpoint Markdown / JSON export | Supported |
| Keyboard shortcuts | Supported |
| Dark mode | Follows system preference |
| Analytics / usage tracking | None |
| LumiFlow-hosted backend | None |

## Installation

### Chrome Web Store

Install the published version from the [Chrome Web Store](https://chromewebstore.google.com/detail/lumiflow/onekhnkogijnmpddmceomhibhenhffaf).

### Load from source

```bash
git clone https://github.com/lumihelia/lumiflow.git
cd lumiflow
```

Then:

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the repository folder.

## API usage and cost

LumiFlow itself has no subscription and does not impose a usage-count limit.

Auto in-chat uses your current AI website account. Its login requirements, subscription, quota, and terms still apply; this does not mean platform usage is necessarily free.

Auto API sends compression requests directly to the API provider you choose. You use your own API key, so the provider's quota, pricing, and terms still apply.

Manual Mode, full conversation export, and local segment management do not require a model API.

## Privacy

LumiFlow currently has no hosted backend, account system, analytics, or usage tracking.

Segments, settings, and saved API keys are stored locally in the browser. Auto in-chat adds the compression prompt to the current AI web conversation for that platform to process. When API compression is enabled, the conversation content needed for compression is sent directly from the extension to the selected Google / OpenAI / Anthropic API. It does not pass through a LumiFlow server.

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

LumiFlow is a Manifest V3 Chrome extension. The main pieces are:

- `content.js`: platform detection, conversation extraction, text selection, and input-field injection.
- `popup.js` / `popup.html`: extension UI, segment management, export, and compression workflows.
- `background.js`: user-authorized requests to Gemini / OpenAI / Anthropic APIs; runs the API compression flow.
- `prompts.js`: multilingual prompt templates for API compression.
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
