// prompts.js - LumiFlow
// =========================================
// Checkpoint 提示词：唯一来源。
// - content.js（页面内压缩，作为 content script 先于 content.js 加载）
// - popup.js（通过 <script>）和 background.js（通过 importScripts）的 API 压缩
// 三处共用同一份，改这里即可。
//
// 指令本身用英文写（各家模型对英文指令最稳），输出语言交给模型按对话的主要语言决定，
// 所以不再需要为每种语言维护一份模板。
// =========================================

const CHECKPOINT_START = '<<<CHECKPOINT_START>>>';
const CHECKPOINT_END = '<<<CHECKPOINT_END>>>';

// 页面内压缩时，用户消息里会带着这段提示词；content.js 用这个标题把它和 AI 的回答区分开
const CHECKPOINT_PROMPT_TITLE = 'CONTEXT COMPRESSION TASK';

function buildCheckpointGuidelines() {
    return `Write a handoff checkpoint. It will be pasted into a brand-new conversation, possibly with a different AI model, that has no memory of this one. The reader must be able to carry on as if they had been here all along, without asking me to repeat anything. I will read and may edit the checkpoint before sending it.

How to write it:
- Write in the language I (the user) mostly wrote in, including the section headings. Keep technical terms, names and quotes in their original language.
- Base everything on what was actually said. Do not invent goals, decisions or details. If something important is unclear, put it under Open questions.
- Later statements override earlier ones. Give the current version of anything that changed; add [changed: old → new] only when the change itself matters.
- Keep apart what I decided or believe and what the AI only suggested. An AI suggestion I did not accept is not a decision.
- Copy exactly anything painful to reconstruct: names, numbers, dates, links, file names, commands, code, error messages, definitions, and wording I chose deliberately.
- Fit the kind of conversation. A coding project needs files, errors and versions; research or learning needs concepts, sources and conclusions; writing needs the direction, voice and passages to keep; a personal decision needs the options, criteria and how my thinking has moved.
- Leave out greetings, repetition and abandoned tangents, unless a dead end is worth not repeating.
- Be as short as possible while complete: usually 300–800 words, up to about 1,500 for a very long or dense conversation. Skip any section that would be empty.

Structure:

[One sentence to the next AI: this is context carried over from an earlier conversation; continue from it instead of starting over.]

## Goal
What we are trying to achieve and why it matters to me, in one to three sentences.

## Where things stand
What is done or settled, what is in progress, what is blocking. Most recent first.

## Decisions and reasoning
Settled choices, each with its reason. Mark anything not final as (tentative). Include options we rejected and why, so they are not proposed again.

## Tried and didn't work
Approaches, ideas or fixes that failed, with the symptom or reason.

## Key material
The exact details to keep verbatim.

## Open questions
Unresolved questions, disagreements, or things I said I would think about.

## Next steps
Concrete actions in order. The first one is where the next conversation should start.

## How I like to work
Preferences I expressed or corrections I made about tone, format, depth, language or approach. Only what I actually showed.

Before you write, check: could someone who never saw this conversation continue from it? Is every listed decision really mine? Are names and numbers exact? Is anything made up?`;
}

// 页面内压缩：注入到当前对话的输入框，让正在对话的 AI 自己总结
function buildInChatCompressionPrompt() {
    return `${CHECKPOINT_PROMPT_TITLE}

Pause the current topic. ${buildCheckpointGuidelines()}

Output the checkpoint between these two marker lines, exactly as written, with nothing after the end marker:
${CHECKPOINT_START}
(checkpoint)
${CHECKPOINT_END}`;
}

// API 压缩：把整段对话交给用户配置的模型。对话放在前面、指令放在最后，长文本任务这样效果更好
function buildCompressionPrompt(text) {
    return `Below is a conversation between me (Human) and an AI assistant.

<conversation>
${text}
</conversation>

${buildCheckpointGuidelines()}

Output only the checkpoint itself, with no preamble or closing remarks.`;
}
