# 📖 LumiFlow 使用说明

欢迎使用 LumiFlow！这份文档将帮你在 5 分钟内上手。

---

## 🚀 快速开始

### 第一步：安装扩展

1. **下载 LumiFlow**
   - 从 [GitHub Releases](https://github.com/lumihelia/lumiflow/releases) 下载最新版 `LumiFlow.zip`
   - 解压到任意文件夹

2. **加载到 Chrome**
   - 打开 Chrome 浏览器
   - 访问 `chrome://extensions/`
   - 打开右上角的「开发者模式」
   - 点击「加载已解压的扩展程序」
   - 选择刚才解压的 `LumiFlow` 文件夹

3. **固定扩展图标（推荐）**
   - 点击浏览器右上角的拼图图标 🧩
   - 找到 LumiFlow，点击📌图标
   - 现在可以随时点击 LumiFlow 图标了

✅ **安装完成！**

---

## 🎯 核心概念

### LumiFlow 解决什么问题？

**场景 A**：你在 ChatGPT 里聊了 100 条消息，对话太长了，AI 开始"忘事儿"
→ LumiFlow 帮你压缩成精华，开新对话继续

**场景 B**：你在 Claude 里卡住了，想换 ChatGPT 试试，但不想重新解释背景
→ LumiFlow 帮你把上下文搬过去

**场景 C**：你在多个 AI 平台间切换工作，每次都要重复说明项目背景
→ LumiFlow 让 AI 无缝接力

---

## 🎮 两种模式

LumiFlow 有两种工作模式，根据需求选择：

### 模式 1：Auto Mode（自动模式）- 推荐新手

**适合场景**：快速压缩整个对话

**工作流程**：
```
1. 在 ChatGPT/Claude/Gemini 的对话页面
2. 点击 LumiFlow 图标
3. 点击「COMPRESS」按钮
4. 等待 5-10 秒（AI 正在压缩）
5. 完成！压缩后的内容已保存
```

**优点**：
- ✅ 一键完成，超快
- ✅ AI 自动提取重点
- ✅ 适合长对话（100+ 条消息）

**缺点**：
- ⚠️ 需要配置 API（见下方）
- ⚠️ 压缩需要几秒钟

---

### 模式 2：Manual Mode（手动模式）- 推荐高级用户

**适合场景**：精确控制保留哪些内容

**工作流程**：
```
1. 点击 LumiFlow 图标
2. 切换到「Manual Mode」
3. 在对话页面选中重要内容（用鼠标拖选）
4. 点击「ABSORB」按钮
5. 重复 3-4，选择更多内容
6. 完成！所有选中的内容变成卡片
```

**优点**：
- ✅ 精确控制（只保留你选的）
- ✅ 不需要 API
- ✅ 即时完成（无延迟）

**缺点**：
- ⚠️ 需要手动选择多次
- ⚠️ 适合较短的对话

---

## 📦 管理 Segments（内容卡片）

无论哪种模式，压缩/吸收的内容都会变成「Segments」（卡片）。

### Segments 是什么？

每个 Segment 就是一张卡片，代表一段重要内容。

**你可以**：
- 📝 **编辑**：点击卡片右边的 ✎ 按钮
- 🗑️ **删除**：点击卡片右边的 × 按钮
- 🔄 **排序**：拖动 ⋮⋮ 按钮重新排列
- 👁️ **展开/折叠**：点击卡片任意位置

### Segments 预览区域

```
┌─────────────────────────────────┐
│ Checkpoint Segments          × │ ← 清空所有
├─────────────────────────────────┤
│ ┌───────────────────────┐       │
│ │ Segment 1  ⋮⋮ ✎ ×   │       │
│ ├───────────────────────┤       │
│ │ 关于项目目标的讨论... │       │
│ └───────────────────────┘       │
│                                 │
│ ┌───────────────────────┐       │
│ │ Segment 2  ⋮⋮ ✎ ×   │       │
│ ├───────────────────────┤       │
│ │ 当前进度和遇到的问题...│       │
│ └───────────────────────┘       │
│                                 │
│ 2 segments, 1500 characters     │
└─────────────────────────────────┘
```

---

## 🚀 注入到新对话（INJECT）

当你准备好切换对话时：

### 步骤：

1. **打开新的对话**
   - 可以是同一个 AI 平台的新对话
   - 也可以是不同的 AI 平台（ChatGPT → Claude）

2. **点击 INJECT 按钮**
   - 压缩后的内容会自动出现在输入框

3. **点击发送**
   - AI 会读取上下文，无缝继续

### 智能压缩

如果你的 Segments 总长度超过 800 字符，LumiFlow 会：
- 检测是否配置了 API
- **有 API**：自动再压缩一次（10:1 压缩比）
- **无 API**：弹窗提醒（可以选择继续或取消）

---

## ⚙️ 配置 API（可选）

配置 API 后，可以使用 Auto Mode 和智能压缩。

### 支持的 API 提供商

- **Google Gemini** (推荐：免费额度大)
- **OpenAI** (ChatGPT 的 API)
- **Anthropic** (Claude 的 API)

### 配置步骤

1. **点击设置图标** ⚙️（右上角）

2. **打开「Enable API Compression」**

3. **选择 API 提供商**
   - 推荐新手：Gemini（免费额度最多）

4. **输入 API Key**
   - Gemini: 访问 [Google AI Studio](https://aistudio.google.com/app/apikey) 获取
   - OpenAI: 访问 [OpenAI Platform](https://platform.openai.com/api-keys)
   - Anthropic: 访问 [Anthropic Console](https://console.anthropic.com/)

5. **点击「Save API Settings」**

✅ **配置完成！现在可以使用 Auto Mode 了**

### 隐私说明

- ✅ API Key 只存储在你的浏览器本地
- ✅ 不会发送到我们的服务器（我们根本没有服务器）
- ✅ 只在压缩时直接调用对应的 API

---

## 📋 完整使用流程示例

### 示例 1：同平台，新对话（对话太长）

```
场景：在 ChatGPT 聊了 200 条消息，AI 开始答非所问

1. 点击 LumiFlow 图标
2. 模式：Auto Mode
3. 点击「COMPRESS」
4. 等待 5 秒（压缩中）
5. ChatGPT 右上角点「New chat」
6. 点击 LumiFlow 图标
7. 点击「INJECT」
8. 点「Send」
9. ✅ AI 继续之前的话题，不再答非所问
```

---

### 示例 2：跨平台迁移（ChatGPT → Claude）

```
场景：在 ChatGPT 卡住了，想试试 Claude

1. 在 ChatGPT 对话页面
2. 点击 LumiFlow 图标
3. 切换到「Manual Mode」
4. 选中项目背景描述的部分
5. 点击「ABSORB」
6. 选中当前问题的部分
7. 点击「ABSORB」
8. 选中已经尝试的解决方案
9. 点击「ABSORB」
10. 打开 Claude.ai，开新对话
11. 点击 LumiFlow 图标
12. 点击「INJECT」
13. 点「Send」
14. ✅ Claude 接收到完整背景，直接开始帮忙
```

---

### 示例 3：多次选择性吸收（Manual Mode）

```
场景：长对话中只想保留特定几段

1. 切换到 Manual Mode
2. 浏览对话，找到第一段重要内容
3. 鼠标拖选 → 点「ABSORB」
4. 继续往下翻，找到第二段
5. 鼠标拖选 → 点「ABSORB」
6. 重复，直到选完所有重要部分
7. 预览区域会显示多个 Segment 卡片
8. 点击卡片可以编辑、删除、重排序
9. 满意后，去新对话点「INJECT」
```

---

## 🎨 高级技巧

### 技巧 1：编辑 Segments

压缩后发现某段不够精确？
- 点击 ✎ 按钮
- 直接在卡片里修改
- 点击 ✓ 保存

### 技巧 2：重排 Segments

想改变内容顺序？
- 按住 ⋮⋮ 按钮
- 拖动到新位置
- 松开鼠标

### 技巧 3：清空 Segments

想重新开始？
- 点击右上角的 × (Clear All)
- 确认
- 所有 Segments 被清空

### 技巧 4：Copy All（完整复制）

想复制整个对话的原文？
- 点击「COPY ALL」按钮
- 整个对话会被抓取并复制到剪贴板
- 可以粘贴到其他地方（如 Notion）

---

## ⚠️ 常见问题

### Q1: 点击按钮没反应？

**解决方法**：
1. 刷新页面（F5）
2. 重新点击按钮
3. 如果还不行，检查是否在支持的平台（ChatGPT/Claude/Gemini）

---

### Q2: Auto Mode 一直转圈圈？

**可能原因**：
- AI 平台响应慢
- API 配置错误

**解决方法**：
1. 等待 30 秒
2. 如果超时，切换到 Manual Mode
3. 手动发送压缩 Prompt，然后选中 AI 的回复，点 ABSORB

---

### Q3: INJECT 后内容没出现在输入框？

**解决方法**：
1. 先点击一下输入框（让它获得焦点）
2. 再点 INJECT
3. 如果还不行，内容已自动复制到剪贴板，手动粘贴即可（Ctrl+V / Cmd+V）

---

### Q4: API Key 安全吗？

**回答**：
- ✅ 完全安全
- API Key 只存储在你的浏览器本地（chrome.storage.local）
- 不会上传到任何服务器
- 只在压缩时直接调用官方 API

**验证方法**：
- 代码完全开源，可以审查
- 可以在浏览器 DevTools → Application → Storage → Local Storage 查看

---

### Q5: 为什么 Copy All 只复制了部分内容？

**已修复**！
- 在最新版本（v2.1+），Copy All 会复制完整对话
- 如果还有问题，请刷新页面后重试

---

### Q6: 支持哪些 AI 平台？

**当前支持**：
- ✅ ChatGPT (chat.openai.com, chatgpt.com)
- ✅ Claude (claude.ai)
- ✅ Gemini (gemini.google.com)

**未来计划**：
- 🔜 Perplexity
- 🔜 You.com
- 🔜 其他平台（欢迎建议）

---

### Q7: 压缩质量不满意怎么办？

**方法 A**：编辑 Segments
- 点击 ✎ 按钮
- 手动调整内容

**方法 B**：切换到 Manual Mode
- 完全手动控制保留哪些内容

**方法 C**：自定义 Prompt（高级）
- 修改 `content.js` 中的 `DEFAULT_COMPRESSION_PROMPT`
- 重新加载扩展

---

### Q8: 有使用次数限制吗？

**没有！**
- ✅ 无限次 ABSORB
- ✅ 无限次 COMPRESS
- ✅ 无限次 INJECT
- ✅ 完全免费

---

## 🎯 最佳实践

### 1. 何时使用 Auto Mode？

✅ **推荐场景**：
- 对话超长（100+ 条消息）
- 想快速压缩
- 信任 AI 的判断

❌ **不推荐场景**：
- 对话中有很多无关内容
- 需要精确控制保留哪些

---

### 2. 何时使用 Manual Mode？

✅ **推荐场景**：
- 只想保留特定几段
- 对话包含敏感信息（不想通过 API）
- 想完全掌控

❌ **不推荐场景**：
- 对话太长，手动选择太累

---

### 3. 压缩比例建议

**目标**：
- 原始对话：10,000 字
- 压缩后：1,000 字左右（10:1 压缩比）

**经验**：
- 如果压缩后 > 2,000 字，可能还不够精炼
- 如果压缩后 < 500 字，可能丢失了重要信息

---

### 4. 跨平台迁移策略

**ChatGPT → Claude**：
- 适合：需要更深入的分析、长文本推理
- 压缩重点：保留事实、数据、已有结论

**Claude → ChatGPT**：
- 适合：需要生成代码、快速迭代
- 压缩重点：保留需求、技术栈、约束条件

**Claude/ChatGPT → Gemini**：
- 适合：需要搜索、多模态（图片）
- 压缩重点：保留问题、已尝试的方案

---

## 🆘 需要帮助？

### 报告问题

遇到 Bug？
1. 访问 [GitHub Issues](https://github.com/lumihelia/lumiflow/issues)
2. 点击「New Issue」
3. 描述问题（附上截图更好）

### 功能建议

有好点子？
1. 同样访问 [GitHub Issues](https://github.com/lumihelia/lumiflow/issues)
2. 标题写「Feature Request: xxx」
3. 描述你的想法

### 联系作者

- **Twitter/X**: [@LumiHelia](https://x.com/LumiHelia)
- **Email**: （通过 GitHub profile 查看）

---

## 📚 延伸阅读

### 技术细节

想了解 LumiFlow 的工作原理？
- 阅读 [README_OPENSOURCE.md](README_OPENSOURCE.md)
- 查看源代码（完全开源）

### 压缩 Prompt 设计

想了解我们的压缩算法？
- 阅读 [COMPRESSION_PROMPT_V2.md](COMPRESSION_PROMPT_V2.md)
- 了解「选择性记忆」的哲学

### 贡献代码

想帮助改进 LumiFlow？
- Fork 代码仓库
- 提交 Pull Request
- 加入开源社区

---

## 🎉 开始使用吧！

现在你已经掌握了 LumiFlow 的所有功能。

**快速回顾**：
1. ✅ 安装扩展
2. ✅ 选择模式（Auto / Manual）
3. ✅ 压缩/吸收内容
4. ✅ 注入到新对话
5. ✅ 无缝继续工作

**记住**：
- 💜 完全免费，无限制
- 🔒 隐私优先，本地存储
- 🌟 开源透明，社区驱动

---

<p align="center">
  <strong>享受跨 AI 平台的无缝体验！</strong><br>
  Made with 💜 by <a href="https://x.com/LumiHelia">Helia</a>
</p>

---

**版本**: v2.1  
**最后更新**: 2026-01-04  
**许可证**: AGPLv3
