# Contributing to LumiFlow

[中文](CONTRIBUTING.zh-CN.md) · [English](CONTRIBUTING.md)

Contributions are welcome when they make LumiFlow more reliable, easier to understand, or compatible with more real-world AI workflows.

## Good contribution areas

- Bug fixes
- ChatGPT / Claude / Gemini compatibility fixes
- Conversation extraction and injection reliability
- Checkpoint quality and segment workflow improvements
- Accessibility and UI improvements
- Documentation corrections
- Privacy and permission corrections
- Support for additional AI platforms

## Before opening a pull request

For a small fix, you can open a PR directly.

For a large feature, new platform integration, permission change, or data-flow change, open an issue first so the scope and implications can be discussed before implementation.

Issues: https://github.com/lumihelia/lumiflow/issues

## Development setup

Fork the repository, then clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/lumiflow.git
cd lumiflow
```

Load the extension locally:

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the repository directory.
5. After code changes, reload LumiFlow from `chrome://extensions/` before testing again.

LumiFlow is a Manifest V3 browser extension. There is currently no build step required for the main extension files.

## What to test

Test the behavior affected by your change, and include more platforms when the change touches shared extraction, injection, UI, or storage logic.

For platform-related changes, test the relevant supported services:

- ChatGPT
- Claude
- Gemini

For data-flow or permission changes, also check:

- `manifest.json`
- `PRIVACY.md` / `PRIVACY.zh-CN.md`
- Chrome Web Store disclosure requirements, when applicable

For user-facing changes, check whether these documents need to stay in sync:

- `README.md` / `README.en.md`
- `USER_GUIDE_CN.md` / `USER_GUIDE_EN.md`
- `TROUBLESHOOTING.zh-CN.md` / `TROUBLESHOOTING.md`

Historical changelogs and release notes should describe the version they were written for; do not rewrite history merely to match current feature names.

## Code guidelines

- Keep changes focused on the problem being solved.
- Preserve the existing code style unless the change is intentionally refactoring it.
- Prefer clear names and explicit control flow over clever abstractions.
- Add comments where the reason for a workaround or platform-specific branch would otherwise be difficult to recover later.
- Do not add browser permissions unless the feature actually requires them.
- Do not add analytics, tracking, remote storage, or new third-party data flows without documenting the change and its user impact.

## Platform integrations

Adding or changing a supported AI platform may involve:

- `content.js` for detection, extraction, selection, or injection;
- `manifest.json` for host access;
- `popup.js` if the workflow or error handling changes;
- README, user guide, troubleshooting, and privacy documentation when user-visible behavior or data flow changes.

Platform UIs change frequently. Prefer extraction paths that can be explained, tested, and safely fall back when a platform changes.

## Compression changes

Compression behavior is part of the context-migration contract. If you change the compression prompt or logic:

- explain what failure or limitation the change addresses;
- include before / after examples when practical;
- check whether important goals, decisions, constraints, examples, failures, and next steps remain recoverable;
- avoid making undocumented changes to what user content is sent to third-party APIs.

## Pull request checklist

A useful PR should make it easy to understand:

- what changed;
- why it changed;
- how it was tested;
- which platforms were tested;
- whether permissions, privacy, documentation, or version metadata also need updates.

Version numbers do not need to change for every individual PR. Update release/version metadata when the project is actually preparing the corresponding release.

## Commit messages

Use messages that preserve the reason for the change.

Examples:

```text
Fix ChatGPT export fallback after conversation API failure
Update privacy docs for direct provider API requests
Add Gemini selector fallback for changed message markup
```

## License

By contributing, you agree that your contribution is provided under the repository's [MIT License](LICENSE).
