# LumiFlow v2.5.0

## New: DeepSeek support

LumiFlow now runs on `chat.deepseek.com`.

- **Full conversation export (TXT / MD)** with `User` / `DeepSeek` speaker labels.
- **Extraction path**: first reads the conversation from the endpoint the DeepSeek web app itself uses (`/api/v0/chat/history_messages`), with the login session already present in the tab. If a conversation has regenerated or edited branches, the branch currently on screen is exported. "DeepThink" reasoning is left out; only final answers are exported.
- **Fallback**: if that endpoint is unavailable, LumiFlow extracts from the page (`.ds-markdown` answer blocks plus the surrounding user turns), after scrolling to load the full history.
- **INJECT / COMPRESS / ABSORB** also work on DeepSeek's input box.

## Fixes

- **Auto Mode checkpoint no longer gets lost when the popup closes.** Chrome closes the popup as soon as you click the page, so the popup was usually gone by the time the AI finished the checkpoint. The checkpoint was saved to `lastCheckpoint` but nothing ever moved it into segments, so INJECT reported "No segments found". The popup now picks up a pending checkpoint when it opens (and immediately, if it is still open), and the keyboard INJECT shortcut includes it too. A small on-page notice shows when the checkpoint is saved.
- **Auto Mode no longer captures the prompt template as the checkpoint.** The compression prompt itself contains `<<<CHECKPOINT_START>>>` / `<<<CHECKPOINT_END>>>`. When the platform's AI-message selector did not match (for example Claude's renamed `.font-claude-response` class), the user's own prompt could be read back as the "checkpoint". Echoed prompts are now skipped, and Claude's current class is recognised.
- **Auto Mode no longer grabs an older checkpoint.** If the conversation already contained a checkpoint from an earlier COMPRESS, the old one was picked up immediately instead of waiting for the new one. Checkpoints present before sending are now ignored.
- **API compression keeps running after the popup closes.** Reading the conversation, calling the API and saving the result now all happen in `background.js`; the result is waiting in the popup when you reopen it. The multilingual compression prompts moved to a shared `prompts.js`.
- **Manual Mode**: ABSORB strips `<<<CHECKPOINT_START>>>` / `<<<CHECKPOINT_END>>>` from the selection; editing a segment keeps its line breaks.
- **INJECT**: when the input box cannot be found, the checkpoint is copied to the clipboard from the popup (the page cannot write to the clipboard while the popup has focus); no more silent failure.
- **Settings**: re-saving API settings no longer overwrites the stored key with its masked form (`AIzaSyAb...wxyz`).
- DeepSeek gets the longer 90 s wait (DeepThink), and checkpoint extraction uses the last marker pair in the answer.
- **Message count in the popup matches the export.** The stats badge now uses the same source as DOWNLOAD TXT/MD (platform data first, page extraction as fallback) instead of counting only the messages currently rendered on the page.

## Permissions

- Added host access `https://chat.deepseek.com/*` (content script + host permission). Chrome will ask existing users to approve this new site access when the extension updates.

## Files changed

- `manifest.json`: version 2.5.0, DeepSeek host access.
- `content.js`: `PLATFORMS.DEEPSEEK`, `fetchDeepSeekConversationAPI()`, `extractDeepSeekConversation()`, DeepSeek input/answer selectors.
- `popup.js`: DeepSeek speaker label and platform badge; checkpoint handoff, Manual/Inject/Settings fixes.
- `background.js`: API compression flow.
- `prompts.js` (new): shared compression prompts.
- Docs: README, user guides, privacy policy.
