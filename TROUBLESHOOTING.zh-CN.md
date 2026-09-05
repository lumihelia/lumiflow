# LumiFlow 故障排查

[中文](TROUBLESHOOTING.zh-CN.md) · [English](TROUBLESHOOTING.md)

适用于 **LumiFlow v2.4.0**。

遇到问题时，先从成本最低的一步开始：刷新当前 AI 对话页，等页面完全加载，再重新执行一次 LumiFlow 操作。

## 先确认当前页面受支持

LumiFlow 当前支持这些对话页面：

- `chatgpt.com` / `chat.openai.com`
- `claude.ai`
- `gemini.google.com`

主页、设置页、登录页或其他没有实际对话的页面，可能没有可以提取的消息，也可能没有可以注入内容的输入框。

## “No response from page” / 点击后没有反应

扩展的 content script 可能还没有挂载到当前页面。

按这个顺序尝试：

1. 刷新对话页。
2. 等页面完成加载。
3. 打开 LumiFlow，重新执行操作。
4. 仍然失败时，到 `chrome://extensions/` 重新加载 LumiFlow。
5. 扩展重新加载后，再刷新一次 AI 页面。

安装或更新扩展之前已经打开的页面，通常需要刷新一次，新的 content script 才能进入页面。

## 完整对话导出不完整

### ChatGPT / Claude

LumiFlow 会优先读取网页应用当前使用的会话数据；这条路径不可用时，会回退到页面加载与提取。

如果导出的 TXT / Markdown 明显缺少消息：

1. 刷新当前对话页。
2. 确认正确的会话已经完整打开。
3. 重新点击 `DOWNLOAD TXT` 或 `DOWNLOAD MD`。
4. 对话非常长时，给 fallback 路径足够时间加载更早的消息。
5. 问题持续出现时，打开浏览器 Console 查看 LumiFlow 的提取日志。

### Gemini

Gemini 导出依赖当前页面结构。Gemini 修改网页 markup 后，LumiFlow 的 extraction selectors 可能需要跟着更新。

先刷新重试。刷新后仍然可以稳定复现时，提交截图和相关 console logs。

## COMPRESS 失败

Auto Mode 需要已经配置好的第三方 API。

检查：

- **Enable API Compression** 已开启；
- 选择的 provider 与填入的 API key 相匹配；
- API key 仍然有效；
- provider 账号仍有可用额度或计费能力；
- 当前网络能够访问相应 API；
- provider 本身没有处于 outage。

LumiFlow 当前支持 Gemini、OpenAI 和 Anthropic API compression。

API compression 暂时不可用时，可以切到 Manual Mode，用 `ABSORB` 在不调用模型 API 的情况下创建 segments。

## INJECT 没有把文字放进输入框

1. 打开目标 ChatGPT / Claude / Gemini 对话。
2. 点击消息输入框，让输入框获得焦点。
3. 打开 LumiFlow，再点击一次 `INJECT`。
4. 页面刚刷新时，等编辑器和 extension content script 初始化完成再试。
5. 输入框本身出现异常或平台刚更新 UI 时，刷新页面后重试。

AI 服务会持续修改编辑器实现。如果某次平台 UI 更新之后注入问题可以稳定复现，LumiFlow 可能需要新的兼容性修复。

## ABSORB 没有抓到选中的文字

Manual Mode 依赖 AI 页面上当前仍然存在的文字 selection。

检查：

1. LumiFlow 已经切到 Manual Mode。
2. 对话页上确实还有肉眼可见的选中文字。
3. 点击 `ABSORB` 前，没有因为点到页面其他位置而取消 selection。

如果同一个平台反复无法抓取 selection，提交平台名称与浏览器版本。

## API key / 隐私相关问题

API key 保存在 LumiFlow 的 Chrome extension local storage 中。运行 API compression 时，对应 key 与完成压缩所需的内容会直接发送给你选择的 provider。

当前 LumiFlow 没有自有托管后端，因此这次请求不会先经过 LumiFlow 服务器。

完整数据流与权限说明见 [PRIVACY.zh-CN.md](PRIVACY.zh-CN.md)。

## 查看 Console logs

在 AI 对话页打开 DevTools：

- Chrome / Edge：右键页面 → **Inspect / 检查** → **Console**。

搜索 LumiFlow 相关日志，例如：

```text
[LumiFlow]
[GET_CONVERSATION]
[EXTRACT]
```

这些日志可以帮助判断：

- 平台是否被正确识别；
- 是否成功找到消息；
- 直接读取会话数据失败后，是否进入 fallback extraction；
- injection 或 extension messaging 是否返回错误。

提交 issue 时不要公开 API key 或其他 secret。分享日志前先删掉敏感内容和私人对话信息。

## 什么时候提交 bug

刷新页面、重新加载扩展后，问题仍然可以稳定复现，就可以提交 issue：

https://github.com/lumihelia/lumiflow/issues

尽量提供：

1. AI 平台与对话所在域名。私人 conversation URL 如果包含敏感 identifier，不要直接公开。
2. 浏览器与版本。
3. LumiFlow 版本。
4. 具体操作：`DOWNLOAD TXT`、`DOWNLOAD MD`、`COMPRESS`、`ABSORB` 或 `INJECT`。
5. 复现步骤。
6. 预期结果与实际结果。
7. 删除 secret 和私人内容之后的相关 console logs。
8. 有助于理解页面状态的截图。
