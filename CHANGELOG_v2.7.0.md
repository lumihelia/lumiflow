# LumiFlow v2.7.0

## New: Firefox support

The same code and the same ZIP now work in Chrome and Firefox (140 or later).

- `manifest.json` declares both background forms: a service worker for Chrome and `background.scripts` for Firefox. Each browser uses its own and ignores the other.
- Firefox add-on ID `lumiflow@lumihelia`, and `data_collection_permissions: none` (LumiFlow collects no data).
- Requests that read ChatGPT / Claude / DeepSeek conversation data use `content.fetch` in Firefox so they carry your login on that site; Chrome keeps using `fetch`.
- `background.js` only calls `importScripts` where it exists (Chrome); Firefox loads `prompts.js` through the manifest.
- Firefox lets you withdraw an extension's access to a site at any time. If LumiFlow lacks access to the current AI site, the popup now shows an **Allow access** button.
- Extension stores (Chrome Web Store, addons.mozilla.org) are added to the pages LumiFlow refuses to run on.

## Keyboard shortcuts

New defaults that do not collide with developer-tools shortcuts in either browser:

| Action | Before | Now |
| --- | --- | --- |
| COMPRESS | `Ctrl+Shift+C` | `Alt+Shift+C` |
| INJECT | `Ctrl+Shift+I` | `Alt+Shift+V` |
| Open LumiFlow | `Ctrl+Shift+L` | `Alt+Shift+L` |

Existing Chrome installs keep their current shortcuts; change them at `chrome://extensions/shortcuts`.

## Checks

- Mozilla `web-ext lint`: 0 errors; the one remaining warning is the Chrome-only `service_worker` key, which Firefox ignores by design.
- Chrome end-to-end regression with the unpacked extension: all pass.
