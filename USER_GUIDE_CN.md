# LumiFlow 使用说明

[中文](USER_GUIDE_CN.md) · [English](USER_GUIDE_EN.md)

适用于 **LumiFlow v2.4.0**。

LumiFlow 目前有两条主要路径：

1. 把完整对话导出成 TXT / Markdown。
2. 把需要继续带走的上下文整理成 checkpoint，再注入新会话。

## 安装

### Chrome Web Store

直接安装：[LumiFlow - Chrome Web Store](https://chromewebstore.google.com/detail/lumiflow/onekhnkogijnmpddmceomhibhenhffaf)

安装后可以把 LumiFlow 固定到浏览器工具栏，方便在 ChatGPT、Claude 和 Gemini 对话页随时打开。

### 从源码加载

```bash
git clone https://github.com/lumihelia/lumiflow.git
cd lumiflow
```

然后打开 `chrome://extensions/`，开启 Developer mode，点击 **Load unpacked / 加载已解压的扩展程序**，选择仓库目录。

## 支持的平台

- ChatGPT：`chatgpt.com` / `chat.openai.com`
- Claude：`claude.ai`
- Gemini：`gemini.google.com`

需要在实际对话页面中使用，主页、设置页或其他非对话页面可能无法提取内容。

## 工作流一：导出完整对话

需要完整保存一段聊天时，直接使用：

- `DOWNLOAD TXT`
- `DOWNLOAD MD`

导出文件会保留说话者标签，例如 User、ChatGPT、Claude、Gemini。

这个流程：

- 不会创建 segment；
- 不会压缩对话；
- 不需要模型 API key；
- 适合归档、阅读、备份或交给其他工具继续处理。

ChatGPT 和 Claude 会优先读取当前平台用于渲染会话的数据；如果这条路径不可用，LumiFlow 会回退到页面加载与提取。Gemini 通过页面提取完成导出。

如果导出内容明显不完整，先刷新当前对话页再重试；仍然存在问题时参考 [故障排查](TROUBLESHOOTING.zh-CN.md)。

## 工作流二：创建并迁移 Checkpoint

Checkpoint 保存的是“下一段对话仍然需要知道什么”。它由一个或多个 segments 组成。

### Auto Mode：自动压缩整段对话

适合：对话很长，希望快速提取目标、当前状态、重要决定、约束、例子、失败尝试和下一步。

使用步骤：

1. 在 ChatGPT / Claude / Gemini 的对话页面打开 LumiFlow。
2. 点击右上角设置按钮。
3. 开启 **Enable API Compression**。
4. 选择 Gemini、OpenAI 或 Anthropic。
5. 填入你自己的 API key 并保存。
6. 回到主界面，保持 Auto Mode。
7. 点击 `COMPRESS`。
8. 压缩完成后，结果会进入 Checkpoint Segments 区域。

Auto Mode 会把需要压缩的内容直接发送给你选择的 API 提供商。API key 与 LumiFlow 设置保存在浏览器本地；Google / OpenAI / Anthropic 自己的额度、计费和隐私政策仍然适用。

### Manual Mode：手动选择需要带走的内容

适合：只想保留少量关键片段，或者希望自己决定上下文，不使用第三方压缩 API。

使用步骤：

1. 打开 LumiFlow。
2. 切换到 Manual Mode。
3. 在当前对话页面中选中需要保存的文字。
4. 点击 `ABSORB`。
5. 继续选择其他片段并重复 `ABSORB`。

每次吸收的内容都会成为一个 segment。

## 管理 Checkpoint Segments

Checkpoint 区域允许你继续整理准备带走的上下文：

- 编辑 segment；
- 删除 segment；
- 拖动排序；
- 展开 / 折叠；
- 清空全部 segments；
- 导出 checkpoint 为 Markdown；
- 导出 checkpoint 为 JSON。

这里最重要的动作是编辑。Auto Mode 给出的压缩结果仍然可以由你重新措辞、删去噪音、补充约束，再决定哪些内容进入下一段会话。

## 把 Checkpoint 注入新会话

1. 打开一个新的 ChatGPT / Claude / Gemini 对话。
2. 打开 LumiFlow。
3. 确认 segments 已经整理好。
4. 点击 `INJECT`。
5. Checkpoint 会进入当前对话的输入框。
6. 检查内容后，由你决定是否发送。

当 checkpoint 很长时，LumiFlow 可能提示是否进一步压缩。配置了 API 时可以再次压缩；没有配置 API 时，可以选择继续注入现有内容或取消。

## API 设置

LumiFlow 支持：

- Google Gemini API
- OpenAI API
- Anthropic API

API compression 是可选能力。Manual Mode、完整对话导出和本地 segment 管理不依赖模型 API。

### 关于费用

LumiFlow 本身没有订阅，也没有人为设置操作次数限制。

API compression 使用的是你自己的第三方 API key，因此实际费用、免费额度和限速由相应提供商决定。

### 关于 API key

API key 保存在 `chrome.storage.local`。LumiFlow 当前没有自己的后端服务器，API 请求由扩展直接发给你选择的提供商。

完整隐私边界见 [隐私说明](PRIVACY.zh-CN.md)。

## 快捷键

默认快捷键：

| 操作 | Windows / Linux | macOS |
| --- | --- | --- |
| COMPRESS | `Ctrl+Shift+C` | `Command+Shift+C` |
| INJECT | `Ctrl+Shift+I` | `Command+Shift+I` |
| 打开扩展 | `Ctrl+Shift+L` | `Command+Shift+L` |

浏览器或其他扩展可能占用同一组快捷键；如果快捷键没有响应，可以在 Chrome 的扩展快捷键设置中检查冲突。

## 常见问题

### COMPRESS 没有工作

先确认：

- 当前页面是受支持的 AI 对话页；
- API compression 已开启；
- API provider 与 key 已保存；
- 第三方 API 仍有可用额度；
- 网络可以访问相应 API。

如果只想继续工作，可以切到 Manual Mode，用 `ABSORB` 手动整理 checkpoint。

### INJECT 后输入框没有内容

先点击目标 AI 的输入框让它获得焦点，再重新点击 `INJECT`。如果页面刚刷新，等页面和扩展脚本加载完成后再试。

### 完整导出只有部分消息

刷新对话页后重试。长对话的回退提取路径可能需要先加载历史内容；如果问题持续出现，请记录平台、浏览器版本和控制台日志，再提交 issue。

更多排查步骤见 [TROUBLESHOOTING.zh-CN.md](TROUBLESHOOTING.zh-CN.md)。

## 本地数据与删除

LumiFlow 会在浏览器本地保存：

- Checkpoint segments；
- API 设置与 API key；
- Auto / Manual 等偏好设置。

清空 Checkpoint Segments 可以删除当前保存的 segments。卸载扩展会删除该扩展对应的本地存储数据。

## 获取帮助

Bug、平台兼容性问题或功能建议：

https://github.com/lumihelia/lumiflow/issues

提交问题时，尽量包含：

- 使用的平台；
- 浏览器与版本；
- 能够复现问题的步骤；
- 实际结果与预期结果；
- 必要的控制台日志或截图。
