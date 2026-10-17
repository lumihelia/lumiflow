# LumiFlow v2.6.0

## Cleaner conversation exports

Fixes for duplicated or polluted content in DOWNLOAD TXT / MD (and in everything built on the same extraction: stats, API compression).

- **No more extra "You said:" / "ChatGPT said:".** ChatGPT's hidden screen-reader headings were read as message text, so exports showed the label twice. Speaker labels that leak into message text are now stripped on every platform.
- **No more duplicated user messages.** Nested message elements and repeated nodes were read twice; identical consecutive messages are now collapsed.
- **ChatGPT (platform data):** hidden context (custom instructions, memory), tool calls such as search queries and code, and reasoning are no longer exported as conversation; an answer split across several nodes is merged into one message.
- **Claude (platform data):** only the branch on screen is exported. Previously every edited question and regenerated answer was included.
- **Page extraction keeps formatting.** Text is read with its paragraph, list and code line breaks, and indentation in code blocks is preserved in exports.
- **Text is no longer altered.** UI words are removed only when they are a whole line; previously "Moreover" became "over" and Chinese sentences were split into separate paragraphs.

## New checkpoint prompt

One prompt in `prompts.js`, shared by in-chat COMPRESS and API compression (previously two separate prompts, one of them in ten language copies).

- Works for any kind of conversation (coding, research, writing, personal decisions), not only software projects.
- Separates the user's decisions from AI suggestions that were never accepted.
- Adds what tends to get lost in handoffs: rejected options and why, what didn't work, open questions, exact details to keep verbatim, and how the user likes to work.
- Opens with a sentence telling the next AI it is receiving carried-over context.
- Written in the language the user mostly used; length scales with the conversation instead of a fixed 10:1 ratio.

## API compression models

The previous models have been retired by their providers, so API compression was failing:

| Provider | Before | Now |
| --- | --- | --- |
| Gemini | `gemini-2.0-flash` (shut down 2026-06-01) | `gemini-flash-latest` |
| OpenAI | `gpt-4-turbo-preview` (shut down 2026-03-26) | `gpt-6.1-sol` (Responses API) |
| Anthropic | `claude-3-5-sonnet-20241022` (retired) | `claude-opus-5-5` |

- Output limit raised from 2,000 to 16,000 tokens so long checkpoints are not cut off.
- Answers are read correctly when the model returns reasoning before the text.
- Clearer error messages from the provider (e.g. invalid key).
- Anthropic requests opt into server-side fallback if a request is declined.
