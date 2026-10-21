# LumiFlow 隐私说明

[中文](PRIVACY.zh-CN.md) · [English](PRIVACY.md) · [纯文字版（英文）](PRIVACY.txt)

**最后更新：2026 年 10 月 21 日**

这份说明描述当前版本的 LumiFlow 浏览器扩展（Chrome 与 Firefox）如何处理数据。

## 概要

LumiFlow 当前没有自有后端、账号系统、analytics、广告 SDK 或 usage tracking。

大部分 LumiFlow 数据保存在你的浏览器中。启用 API compression 后，用于压缩的对话内容会从扩展直接发送给你选择的 API 提供商，请求不会经过 LumiFlow 自己运营的服务器。

## 保存在本地的数据

LumiFlow 通过浏览器的本地扩展存储保存：

- checkpoint segments；
- API 设置；
- 你选择保存的 API key；
- Auto / Manual mode 等偏好设置。

这些内容保存在浏览器中扩展自己的 `storage.local` 里。

## 会发送给第三方的数据

### API compression

如果你开启 API compression，并配置 Gemini、OpenAI 或 Anthropic：

- 扩展会把完成压缩所需的内容直接发送给你选择的提供商；
- API key 用于验证这次请求；
- LumiFlow 当前没有自有后端，因此请求不会先经过 LumiFlow 服务器再转发；
- 相应提供商自己的隐私政策、数据保留规则、价格与服务条款会适用于这次请求。

提供商政策：

- Google: https://policies.google.com/privacy
- OpenAI: https://openai.com/policies/privacy-policy
- Anthropic: https://www.anthropic.com/privacy

### 对话提取

为了导出完整对话或创建 checkpoint，LumiFlow 需要读取受支持 AI 平台上的当前会话。

ChatGPT 和 Claude 会优先读取网页应用当前使用的会话数据，并可以在这条路径不可用时回退到页面提取。Gemini 使用页面提取。DeepSeek 会借助当前标签页里已有的登录状态，读取网页应用自身的会话接口，并可以在这条路径不可用时回退到页面提取。

这些读取发生在你已经登录并使用相应 AI 服务的浏览器会话中。提取出的对话不会被发送到 LumiFlow 自有服务器。

### 图片与文件（DOWNLOAD ZIP）

在 ChatGPT、Claude 或 Gemini 上点击 `DOWNLOAD ZIP` 时，LumiFlow 会从 AI 平台下载这段对话里的图片和文件（你上传的图片、PDF、AI 生成的图片等），和对话一起保存成你电脑上的一个 ZIP 文件。这些文件不会被发送到其他任何地方。在 Gemini 上，LumiFlow 读取网页已经载入的图片；读不到时，会截取当前分页画面中的这张图片（只裁出图片本身）并存进同一个 ZIP。截图不会被保留或发送到其他任何地方。

ChatGPT 和 Gemini 把文件存放在另外的网站（`oaiusercontent.com`、`googleusercontent.com`）。访问它们是可选权限：`DOWNLOAD ZIP` 第一次需要从这些网站下载文件时，LumiFlow 会打开一个页面，由你决定是否允许；如果你拒绝，ZIP 里只包含对话文字，不含这些文件。

启用 API compression 后，其中完成压缩所需的内容会按照上一节所述发送给你选择的 API 提供商。

## LumiFlow 当前不会收集的数据

当前扩展没有：

- LumiFlow analytics；
- usage tracking；
- 广告追踪器；
- crash-reporting SDK；
- LumiFlow 账号数据库；
- LumiFlow 托管的对话存储服务。

## 权限

当前 Manifest V3 扩展使用：

| 权限 / 域名访问 | 用途 |
| --- | --- |
| `storage` | 在本地保存 segments、API 设置与偏好 |
| `activeTab` | 与你正在使用的受支持 AI 页面交互 |
| `chatgpt.com`, `chat.openai.com` | 在 ChatGPT 读取对话与注入上下文 |
| `claude.ai` | 在 Claude 读取对话与注入上下文 |
| `gemini.google.com` | 在 Gemini 读取对话与注入上下文 |
| `chat.deepseek.com` | 在 DeepSeek 读取对话与注入上下文 |
| `api.openai.com` | 发送由用户授权的 OpenAI compression 请求 |
| `api.anthropic.com` | 发送由用户授权的 Anthropic compression 请求 |
| `generativelanguage.googleapis.com` | 发送由用户授权的 Gemini compression 请求 |
| `*.oaiusercontent.com`（可选） | 把 ChatGPT 对话里的图片和文件下载进你请求的 ZIP |
| `*.googleusercontent.com`（可选） | 把 Gemini 对话里的图片下载进你请求的 ZIP |

当前权限的最终事实来源是 [`manifest.json`](manifest.json)。

## API key

如果你在 LumiFlow 中保存 API key，它会保存在浏览器中扩展的本地存储里。

扩展只会在向你选择的 API 提供商发起请求时使用对应 key。LumiFlow 当前没有接收或保存 API key 的自有服务器。

本地存储仍然依赖设备与浏览器环境本身的安全性。能够充分访问你的设备或浏览器 profile 的人或软件，理论上也可能接触本地扩展数据。建议同时使用提供商侧的额度限制、消费上限与 key rotation 等机制控制风险。

## 删除本地数据

你可以在 LumiFlow 界面中删除 checkpoint segments，也可以在设置中移除或替换保存的 API key。

如果需要删除 LumiFlow 的全部本地扩展数据，可以从浏览器中卸载 LumiFlow；Chrome 和 Firefox 都会在卸载扩展时删除它的本地存储。

## 开源

LumiFlow 使用 MIT License 开源。当前实现可以直接在仓库中检查：

https://github.com/lumihelia/lumiflow

## 这份说明何时需要更新

如果 LumiFlow 后续增加自有托管服务、analytics、账号层、新的第三方集成，或者数据流发生其他变化，这份隐私说明需要和相应代码及 Chrome Web Store、Firefox Add-ons 的商店披露一起更新。

## 联系

隐私相关问题可以提交到：

https://github.com/lumihelia/lumiflow/issues
