# LumiFlow 故障排查

[中文](TROUBLESHOOTING.zh-CN.md) · [English](TROUBLESHOOTING.md)

适用于 **LumiFlow v2.9.2**。

遇到问题时，先从成本最低的一步开始：刷新当前 AI 对话页，等页面完全加载，再重新执行一次 LumiFlow 操作。

## 先确认当前页面受支持

LumiFlow 当前支持这些对话页面：

- `chatgpt.com` / `chat.openai.com`
- `claude.ai`
- `gemini.google.com`
- `chat.deepseek.com`

主页、设置页、登录页或其他没有实际对话的页面，可能没有可以提取的消息，也可能没有可以注入内容的输入框。

## “No response from page” / 点击后没有反应

扩展的 content script 可能还没有挂载到当前页面。

按这个顺序尝试：

1. 刷新对话页。
2. 等页面完成加载。
3. 打开 LumiFlow，重新执行操作。
4. 仍然失败时，到 `chrome://extensions/`（Chrome）或 `about:addons`（Firefox）重新加载 LumiFlow。
5. Firefox 用户请在页面上打开 LumiFlow：如果 popup 显示 **Allow access**，点击后刷新页面。
6. 扩展重新加载后，再刷新一次 AI 页面。

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

Gemini 导出从页面读取对话（`user-query` / `model-response` 元素），会先滚动加载更早的消息。Gemini 修改网页结构后，提取逻辑可能需要跟着更新。

先刷新重试。刷新后仍然可以稳定复现时，提交截图和相关 console logs。

### DeepSeek

LumiFlow 会优先读取 DeepSeek 网页当前使用的会话数据（只导出正文，不含深度思考过程），失败时回退到页面提取。先确认已登录、打开的是正确的对话，再刷新重试。

## DOWNLOAD ZIP 缺少图片或文件

打开 ZIP 里的 `conversation.md`，拉到最底部。没能放进来的文件会列在 **Not included** 下面，每个都写明原因；最后一行是导出这个 ZIP 的 LumiFlow 版本。

- **“LumiFlow does not have access to … yet”**：ChatGPT 的部分文件放在 `oaiusercontent.com`。LumiFlow 会打开一个带 **Allow access** 按钮的页面，允许后再点一次 `DOWNLOAD ZIP`。
- **“file no longer available”** 或 **HTTP 404 / 410**：平台已经不再提供这个文件，过期的上传无法找回。
- **Gemini 的图片**：LumiFlow 读取 Gemini 已经在网页里载入的图片。制作 ZIP 期间请保持 Gemini 分页在前台，页面会自动滚动。读不到的图片会存成 `…(screen capture).png`，大小等于屏幕上显示的尺寸。
- Gemini 的 PDF 附件和 DeepSeek 的图片暂时还不会被收集，ZIP 里只有它们的文字。

## COMPRESS 失败

先确认正在使用哪条 Auto 路径：只有 **Enable API Compression** 已开启、并且保存了 key 时才会调用 API；否则 checkpoint 会在当前网页对话里生成。

### Auto in-chat（不需要 API key）

- 确认已登录 AI 网站、可以发送消息，平台额度也还够用。
- 检查压缩 prompt 是否已经发出。如果 LumiFlow 提示 “Prompt injected. Click Send”，请手动发送，等回复完成后用 Manual `ABSORB` 保存。
- AI 生成期间请保持对话页面打开。LumiFlow 最多等待 60 秒（Gemini 和 DeepSeek 为 90 秒）；popup 的倒计时不代表平台已经生成完毕。
- 点击页面时 popup 可能会关闭。重新打开即可接回已保存的 checkpoint；请在 30 分钟内打开，超过时间的待接回记录会过期。
- 如果 AI 已经回复、却没有出现 segment，选中回复里的 checkpoint，用 Manual `ABSORB` 保存即可，不需要配置 API。

### Auto API（可选）

检查：

- **Enable API Compression** 已开启；
- 选择的 provider 与填入的 API key 相匹配；
- API key 仍然有效；
- provider 账号仍有可用额度或计费能力；
- 当前网络能够访问相应 API；
- provider 本身没有处于 outage。

LumiFlow 当前支持 Gemini、OpenAI 和 Anthropic API compression。

API compression 在后台执行，关闭 popup 不会中止；完成后重新打开即可看到结果。API 请求失败时不会自动改走网页对话：可以关闭 API Compression 后重新点 `COMPRESS`，改用当前对话生成；或切到 Manual Mode，用 `ABSORB` 保存需要的文字。

## INJECT 没有把文字放进输入框

1. 打开目标 ChatGPT / Claude / Gemini / DeepSeek 对话。
2. 点击消息输入框，让输入框获得焦点。
3. 打开 LumiFlow，再点击一次 `INJECT`。
4. 页面刚刷新时，等编辑器和 extension content script 初始化完成再试。
5. 输入框本身出现异常或平台刚更新 UI 时，刷新页面后重试。

找不到输入框时，LumiFlow 会改为把 checkpoint 复制到剪贴板。请在输入框里手动粘贴，检查后再决定是否发送。

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
