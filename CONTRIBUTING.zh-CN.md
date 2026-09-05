# 参与 LumiFlow

[中文](CONTRIBUTING.zh-CN.md) · [English](CONTRIBUTING.md)

只要能让 LumiFlow 更可靠、更容易理解，或者更适应真实的 AI 使用流程，都欢迎贡献。

## 适合参与的方向

- Bug 修复
- ChatGPT / Claude / Gemini 兼容性修复
- 对话提取与注入可靠性
- Checkpoint 质量与 segments 工作流
- Accessibility 与 UI 改进
- 文档修正
- 隐私与权限说明修正
- 新 AI 平台支持

## 提交 PR 之前

小型修复可以直接提交 PR。

如果准备增加较大的功能、新平台 integration、浏览器权限，或者改变数据流，建议先开 issue，把范围和影响讲清楚，再进入实现。

Issues: https://github.com/lumihelia/lumiflow/issues

## 开发环境

Fork 仓库后 clone 自己的 fork：

```bash
git clone https://github.com/YOUR_USERNAME/lumiflow.git
cd lumiflow
```

本地加载扩展：

1. 打开 `chrome://extensions/`。
2. 开启 **Developer mode**。
3. 点击 **Load unpacked / 加载已解压的扩展程序**。
4. 选择仓库目录。
5. 修改代码后，在 `chrome://extensions/` 重新加载 LumiFlow，再进行下一轮测试。

LumiFlow 是 Manifest V3 浏览器扩展，目前主扩展文件不需要额外 build step。

## 需要测试什么

先测试这次改动直接影响的行为。改动涉及共享的提取、注入、UI 或 storage 逻辑时，应扩大到更多平台进行验证。

平台相关改动需要覆盖对应的受支持服务：

- ChatGPT
- Claude
- Gemini

数据流或权限发生变化时，还需要一起检查：

- `manifest.json`
- `PRIVACY.md` / `PRIVACY.zh-CN.md`
- 如适用，Chrome Web Store 的 disclosure

用户能直接看到或依赖的功能发生变化时，检查这些文档是否需要同步：

- `README.md` / `README.en.md`
- `USER_GUIDE_CN.md` / `USER_GUIDE_EN.md`
- `TROUBLESHOOTING.zh-CN.md` / `TROUBLESHOOTING.md`

历史 changelog 和 release notes 负责描述它们对应版本当时发生了什么。功能后来换了名字，也无需回头改写历史。

## 代码原则

- 让改动围绕一个清楚的问题展开。
- 沿用现有代码风格，除非这次任务本身就是重构。
- 优先选择容易读懂的命名与明确的控制流。
- 平台 workaround、fallback 或特殊分支如果只看代码很难恢复原因，用注释把原因留下来。
- 功能没有实际需要时，不增加新的浏览器权限。
- 如果要增加 analytics、tracking、remote storage 或新的第三方数据流，需要同时说明它改变了什么，以及用户会因此暴露哪些数据。

## 平台 integration

增加或修改 AI 平台支持时，可能涉及：

- `content.js`：平台识别、对话提取、文字选择或输入框注入；
- `manifest.json`：host access；
- `popup.js`：工作流或错误处理；
- README、使用说明、故障排查和隐私文档：当用户能看到的行为或数据流发生变化时一起更新。

AI 平台网页经常变化。提取逻辑应尽量保持可解释、可测试，并在平台变化时拥有安全的 fallback。

## Compression 改动

Compression 决定了下一段会话最终能继承什么上下文。修改 compression prompt 或相关逻辑时：

- 说明这次修改解决了什么失败模式或限制；
- 条件允许时提供 before / after 示例；
- 检查目标、决定、约束、例子、失败尝试和下一步是否仍然能够被恢复；
- 如果发送给第三方 API 的用户内容范围发生变化，需要明确记录。

## PR 应该让人看见什么

一个可读的 PR 至少应该让维护者快速知道：

- 改了什么；
- 为什么改；
- 怎么测试；
- 测了哪些平台；
- 权限、隐私、文档或版本信息是否也需要更新。

版本号不需要随着每一个 PR 单独变化。真正准备相应 release 时再同步 release / version metadata。

## Commit message

Commit message 尽量把改动原因留下来。

例如：

```text
Fix ChatGPT export fallback after conversation API failure
Update privacy docs for direct provider API requests
Add Gemini selector fallback for changed message markup
```

## License

提交贡献即表示该贡献按照仓库的 [MIT License](LICENSE) 提供。
