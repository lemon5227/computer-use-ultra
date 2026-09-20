# Computer Use Ultra X Posts

Repository: https://github.com/lemon5227/computer-use-ultra
Release: https://github.com/lemon5227/computer-use-ultra/releases/tag/v0.1.0

## 中文

开源了 Computer Use Ultra 🚀

一个给 Codex Computer Use 加速的独立 action-planning layer：

• Jev 一次选择动作 + 目标
• 使用当前 Chrome Accessibility Tree
• 缓存状态、检测进度、验证完成
• 不启动第二个浏览器，不使用 Playwright

基准数据也放进仓库：新协议单次 Jev 决策中位约 393ms；旧版 Jev Overlay 的真实 Chrome 场景中位 1.563s，原生 Computer Use 执行器基线 0.964s。完整对照和限制：
https://github.com/lemon5227/computer-use-ultra/blob/main/outputs/computer-use-ultra-vs-original-2026-09-20.md

Chrome 是首个支持面，欢迎试用和反馈：
https://github.com/lemon5227/computer-use-ultra

## English

Computer Use Ultra is now open source 🚀

An independent fast action-planning layer for Codex Computer Use:

• Jev selects one action + target per cycle
• Uses the current Chrome Accessibility Tree
• Caches state, detects progress, and verifies completion
• No second browser and no Playwright

The benchmark is in the repo too: the new combined Jev protocol measured about 393 ms median for a single decision; the original Jev Overlay measured 1.563 s median in its real-Chrome scenario, with a 0.964 s direct Computer Use executor baseline. Full comparison and caveats:
https://github.com/lemon5227/computer-use-ultra/blob/main/outputs/computer-use-ultra-vs-original-2026-09-20.md

Chrome is the first supported surface. Try it and share feedback:
https://github.com/lemon5227/computer-use-ultra
