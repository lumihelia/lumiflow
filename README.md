# LumiFlow

把一段 AI 对话带到下一段对话里。

[中文](README.md) · [English](README.en.md)

[![Version](https://img.shields.io/badge/version-2.4.0-blue.svg)](manifest.json)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-brightgreen.svg)](https://chromewebstore.google.com/detail/lumiflow/onekhnkogijnmpddmceomhibhenhffaf)
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)

LumiFlow 是一个面向 ChatGPT、Claude 和 Gemini 的 Chrome 扩展。它把对话当作可以整理、保存和迁移的上下文，让长对话结束、模型切换或新会话开始时，重要信息仍然可以继续流动。

目前有两条主要工作流：

- **完整对话导出**：把当前对话直接下载为 TXT 或 Markdown，并保留说话者标签，适合归档、阅读和后续处理。
- **Checkpoint 上下文迁移**：把真正需要延续的目标、决定、约束、例子和进度整理成可编辑的 segments，再注入新的 AI 会话。

当前版本：**v2.4.0**。

## 适合什么场景

- 一个对话已经很长，准备开新会话继续工作。
- 同一个项目需要在 ChatGPT、Claude 和 Gemini 之间切换。
- 想保留完整聊天记录，同时又不想把整段历史重新塞给下一个模型。
- 想自己挑选、编辑和排序需要带走的上下文。

## 两种工作流

### 1. 完整对话导出

在支持的对话页面打开 LumiFlow，点击：

- `DOWNLOAD TXT`
- `DOWNLOAD MD`

LumiFlow 会导出完整对话，并给每条内容加上 User / ChatGPT / Claude / Gemini 等说话者标签。

ChatGPT 和 Claude 会优先从平台当前会话的数据接口读取完整对话；如果这条路径不可用，LumiFlow 会回退到页面加载与提取。Gemini 通过页面提取完成导出。

这个流程不会创建 checkpoint segment，也不需要配置模型 API。

### 2. Checkpoint 上下文迁移

Checkpoint 用来保存“下一段对话仍然需要知道什么”。

#### Auto Mode

点击 `COMPRESS`，LumiFlow 会使用你配置的 Gemini、OpenAI 或 Anthropic API，把当前对话压缩成结构化 checkpoint。

适合：长对话、希望快速提取目标 / 状态 / 决定 / 例子 / 下一步。

#### Manual Mode

切换到 Manual Mode，在页面中选中需要保留的内容，再点击 `ABSORB`。

适合：只想保留特定片段、希望自己控制上下文、不想使用第三方压缩 API。

生成的 segments 可以继续编辑、删除和排序。准备好之后，在新的 ChatGPT / Claude / Gemini 会话中点击 `INJECT`，把 checkpoint 放进输入框，再由你决定是否发送。

## 核心能力

| 能力 | 当前状态 |
| --- | --- |
| ChatGPT | 支持 |
| Claude | 支持 |
| Gemini | 支持 |
| TXT / Markdown 完整对话导出 | 支持 |
| Auto AI compression | 支持，需要用户自己的 Gemini / OpenAI / Anthropic API key |
| Manual ABSORB | 支持，不需要 API key |
| Segments 编辑 / 删除 / 拖动排序 | 支持 |
| Checkpoint Markdown / JSON 导出 | 支持 |
| 键盘快捷键 | 支持 |
| 深色模式 | 跟随系统 |
| Analytics / usage tracking | 无 |
| LumiFlow 自有后端 | 无 |

## 安装

### Chrome Web Store

直接从 [Chrome Web Store](https://chromewebstore.google.com/detail/lumiflow/onekhnkogijnmpddmceomhibhenhffaf) 安装当前发布版本。

### 从源码加载

```bash
git clone https://github.com/lumihelia/lumiflow.git
cd lumiflow
```

然后：

1. 打开 `chrome://extensions/`。
2. 开启 Developer mode。
3. 点击 **Load unpacked / 加载已解压的扩展程序**。
4. 选择仓库目录。

## API 与费用

LumiFlow 本身没有订阅，也没有人为设置使用次数限制。

Auto Mode 的压缩请求会直接发送给你选择的 API 提供商。你需要使用自己的 API key，因此 Google、OpenAI 或 Anthropic 自己的额度、计费和服务条款仍然适用。

Manual Mode、完整对话导出和本地 segments 管理不需要模型 API。

## 隐私

LumiFlow 当前没有自己的服务器、账号系统、analytics 或 usage tracking。

Segments、设置和你保存的 API key 存在浏览器本地。启用 API compression 时，用于压缩的对话内容会从扩展直接发送给你选择的 Google / OpenAI / Anthropic API；请求不会经过 LumiFlow 自有服务器。

更完整的说明见：

- [隐私说明（中文）](PRIVACY.zh-CN.md)
- [Privacy Policy (English)](PRIVACY.md)

## 文档

- [使用说明（中文）](USER_GUIDE_CN.md)
- [User Guide (English)](USER_GUIDE_EN.md)
- [故障排查（中文）](TROUBLESHOOTING.zh-CN.md)
- [Troubleshooting (English)](TROUBLESHOOTING.md)
- [参与贡献（中文）](CONTRIBUTING.zh-CN.md)
- [Contributing (English)](CONTRIBUTING.md)

仓库中的 `CHANGELOG_*`、`RELEASE_NOTES_*`、`UPDATE_SUMMARY_*` 等文件保留对应历史版本的记录，因此其中可能出现已经被后续版本替换的功能名称。

## 项目结构

LumiFlow 是一个 Manifest V3 Chrome extension，主要由以下部分组成：

- `content.js`：平台识别、对话提取、文本选择与输入框注入。
- `popup.js` / `popup.html`：扩展界面、segments 管理、导出与 compression 工作流。
- `background.js`：向 Gemini / OpenAI / Anthropic 发起用户授权的 API 请求。
- `manifest.json`：扩展权限、支持域名与快捷键配置。

## 开发与贡献

欢迎提交 bug、兼容性问题、文档修正和功能改进。开始前请阅读：

- [参与贡献（中文）](CONTRIBUTING.zh-CN.md)
- [Contributing (English)](CONTRIBUTING.md)

## License

[MIT License](LICENSE)。

可以使用、修改和重新分发代码，也可以用于商业或闭源项目；请保留许可证要求的版权与许可声明。

## 联系

- GitHub Issues: https://github.com/lumihelia/lumiflow/issues
- X: [@LumiHelia](https://x.com/LumiHelia)
