# LumiFlow v2.9.2

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
- New optional host permission `https://*.googleusercontent.com/*` for Gemini images.

### Asking for access, reliably
In v2.8.0 the access request was made from the popup. The popup closes as soon as it loses focus, so the request could be cancelled before you saw it, and images on another host (Gemini's, and some of ChatGPT's) were silently left out ("no access to the file host").

Now LumiFlow asks only when it is actually needed:
1. DOWNLOAD ZIP starts right away. Files on the AI site itself (Claude, many ChatGPT files) need no extra access.
2. If some files could not be downloaded for lack of access, the ZIP is still saved, and a small LumiFlow page (`permissions.html`) opens with an **Allow access** button.
3. After allowing, click DOWNLOAD ZIP again to get the complete ZIP.
- `[ZIP]` progress lines in the page console for troubleshooting.
- README, user guides, privacy policy (md / zh / txt).

### Clearer reasons when a file cannot be downloaded
- "Not included" now says what actually happened: network error, HTTP status, a redirect to another site, or a sign-in page returned instead of the file.
- If the background download fails, LumiFlow tries once more from the page itself.
- `conversation.md` ends with the LumiFlow version that exported it.

### Gemini images: read them from the page
Testing on a real conversation showed that Gemini's image addresses (`lh3.googleusercontent.com`) redirect to another site, so downloading them from the extension fails even with access allowed. Gemini itself fetches each image with your sign-in and shows it from a page-local `blob:` address.

- LumiFlow now scrolls each image into view and, if Gemini has switched it to a `blob:` address, reads the image from the page directly. No extra permission is needed.
- If an image still cannot be read, LumiFlow saves a **screen capture** of it at the size shown on the page (`… (screen capture).png`), and says so at the end of `conversation.md`.
- Gemini images no longer wait on a page-side retry that cannot succeed, and background downloads time out after 30 seconds, so a conversation with many images does not stall.
