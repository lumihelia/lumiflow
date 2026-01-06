# Privacy Policy for LumiFlow

**Last Updated**: January 4, 2026

## Overview

LumiFlow is committed to protecting your privacy. This policy explains how we handle data in our Chrome extension.

## Data Collection

**LumiFlow does not collect, store, or transmit any user data to external servers.**

All data remains on your local device.

## Local Storage

LumiFlow stores the following data locally in your browser (chrome.storage.local):

- **Conversation segments**: The compressed checkpoints you create
- **API keys** (if configured): Your personal API keys for Gemini/OpenAI/Anthropic
- **Settings**: Your preferences (Auto/Manual mode, API provider selection)

**This data never leaves your device.**

## API Usage

When you configure an API key (optional):

- Your API key is stored **locally** in your browser
- Compression requests are sent **directly** to the respective API provider (Google, OpenAI, or Anthropic)
- LumiFlow acts as a **client**, not an intermediary
- We never see or store your API requests

**Important**: Please refer to each API provider's privacy policy:
- Google Gemini: https://policies.google.com/privacy
- OpenAI: https://openai.com/policies/privacy-policy
- Anthropic: https://www.anthropic.com/privacy

## Permissions Explained

LumiFlow requests the following Chrome permissions:

| Permission | Why We Need It |
|------------|----------------|
| `storage` | To save your segments and settings locally |
| `activeTab` | To read conversations from AI platforms |
| `scripting` | To inject compressed context into input fields |
| `host_permissions` | To work on ChatGPT, Claude, and Gemini domains |

**None of these permissions allow us to access data outside the AI platforms you actively use.**

### Host Permissions Details

| Domain | Purpose |
|--------|---------|
| `chatgpt.com`, `chat.openai.com` | Extract conversations from ChatGPT |
| `claude.ai` | Extract conversations from Claude |
| `gemini.google.com` | Extract conversations from Gemini |
| `api.anthropic.com` | Send compression requests (user's API key) |
| `api.openai.com` | Send compression requests (user's API key) |
| `generativelanguage.googleapis.com` | Send compression requests (user's API key) |

## No Tracking

LumiFlow does **not** include:
- ❌ Analytics
- ❌ Crash reporting
- ❌ Usage tracking
- ❌ Cookies
- ❌ Third-party scripts

## Open Source Transparency

LumiFlow is fully open source under AGPLv3.

You can audit the entire codebase at:  
**https://github.com/lumihelia/lumiflow**

## Data Deletion

To delete all LumiFlow data:

1. Click the LumiFlow icon
2. Click Settings ⚙️
3. Click "Clear All" to remove segments
4. Uninstall the extension to remove all local storage

## Changes to This Policy

If we make any changes to our data practices, we will update this policy and the version number in our GitHub repository.

## Contact

For privacy concerns or questions:
- **GitHub Issues**: https://github.com/lumihelia/lumiflow/issues
- **Twitter/X**: [@LumiHelia](https://x.com/LumiHelia)

## Summary

**In plain English**:
- We don't have servers, so we literally can't access your data
- Everything stays on your computer
- Your API keys (if you add them) are stored locally, not sent to us
- We don't track you
- The code is open source, so you can verify all of this yourself

---

**LumiFlow Team**  
January 2026
