# LumiFlow v2.5.0

## New: DeepSeek support

LumiFlow now runs on `chat.deepseek.com`.

- **Full conversation export (TXT / MD)** with `User` / `DeepSeek` speaker labels.
- **Extraction path**: first reads the conversation from the endpoint the DeepSeek web app itself uses (`/api/v0/chat/history_messages`), with the login session already present in the tab. If a conversation has regenerated or edited branches, the branch currently on screen is exported. "DeepThink" reasoning is left out; only final answers are exported.
- **Fallback**: if that endpoint is unavailable, LumiFlow extracts from the page (`.ds-markdown` answer blocks plus the surrounding user turns), after scrolling to load the full history.
- **INJECT / COMPRESS / ABSORB** also work on DeepSeek's input box.

## Permissions

- Added host access `https://chat.deepseek.com/*` (content script + host permission). Chrome will ask existing users to approve this new site access when the extension updates.

## Files changed

- `manifest.json`: version 2.5.0, DeepSeek host access.
- `content.js`: `PLATFORMS.DEEPSEEK`, `fetchDeepSeekConversationAPI()`, `extractDeepSeekConversation()`, DeepSeek input/answer selectors.
- `popup.js`: DeepSeek speaker label and platform badge.
- Docs: README, user guides, privacy policy.
