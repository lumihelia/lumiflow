# LumiFlow v2.9.0

## Gemini: images in DOWNLOAD ZIP, and correct text exports

Built and tested against a real Gemini conversation page.

### DOWNLOAD ZIP on Gemini
- Images you uploaded (`img[data-test-id="uploaded-img"]`) and images Gemini generated are saved into `media/`.
- Full resolution when available: Google image addresses ending in a size such as `=s512` or `=w300-h200` are requested as `=s0` first, falling back to the size shown on the page.
- Generated images appear where they were in the answer, including images wrapped in "click to enlarge" buttons.
- Avatars, icons and source favicons are excluded.

### Gemini text exports were wrong before
The previous Gemini extraction guessed at class names. On a real conversation it produced every turn as a **user** message, merged Gemini's answers into the questions, started each with "You said", repeated each question twice, and kept source labels such as "PNG + 4" in the text.

Now each turn is read from Gemini's own `user-query` / `model-response` elements:
- the question from its `.query-text-line` paragraphs (the hidden screen-reader heading that repeats the whole question is skipped);
- the answer from `message-content .markdown`, with source chips, footnotes and buttons removed;
- the thinking panel is not exported.

This also fixes DOWNLOAD TXT / MD, message counts and API compression on Gemini.

## Other
- When reading text from a copy of the answer, images inside the copy are removed first, so the browser does not download them again.
- New optional host permission `https://*.googleusercontent.com/*`, asked the first time you use DOWNLOAD ZIP on Gemini.
- `[ZIP]` progress lines in the page console for troubleshooting.
- README, user guides, privacy policy (md / zh / txt).
