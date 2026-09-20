# Laya 本地版 vs Jev：Chrome 决策层对比

日期：2026-09-20

## 结论

Laya 是一个本地、非自回归的 typed-decision 分类器，不是完整的 Computer Use，也不是截图/AX 树读取层。它可以作为 Jev 的候选本地决策层，但当前不能直接替换 Jev：

- 公开演示里的 Laya 数字很快，但主要是模型 forward/决策循环数字，不等于完整 Chrome Computer Use 的端到端速度。
- 官方仓库明确说明，基础模型的 zero-shot typed decision 接近随机基线；通用 Chrome 目标选择需要自己做数据和微调。
- 在本机按 Chrome 风格的候选目标实测，当前 Python + PyTorch MPS 路径为约 0.44–1.90 秒/次，50 个候选时比我们的 Jev 实测中位数约 0.405 秒还慢。
- 所以现在最合理的路线是：保留 Jev 作为准确性兜底，继续把 Laya 作为可选的本地实验通道；只有完成本地运行时优化和 Chrome 动作数据微调后，才考虑默认切换。

## 来源中的数字

帖子 [X 上的本地版 Laya 对比](https://x.com/NFT_Chen/status/2101675124747338229) 声称，在 Snake 游戏中：

| 指标 | Laya 本地版 | Jev 云端版 |
|---|---:|---:|
| 决策频率 | 86.5 decisions/s | 3.2 decisions/s |
| 中位延迟 | 约 9–15.3ms | 约 298.1–317ms |
| 推理方式 | 本地 | API 网络调用 |
| 内存 | 约 1GB | 本地几乎不承担模型内存 |

Laya 官方仓库给出的 T4 单问题数字约为 32.8ms（multilingual）和 39.5ms（English），并且支持批量问题一次 forward。[Laya README](https://github.com/NandhaKishorM/laya)

这些数字不能直接当作 Chrome 端到端数字，因为 Snake 的状态短、候选动作结构固定，而且没有包含 AX 状态获取、候选裁剪、动作执行和结果验证。

## 本机实测

环境：Apple Silicon，Python 3.13，PyTorch 2.9.1，MPS，Laya typed-decisions checkpoint 常驻内存；每次同时输出 operation、target、stop 三个 typed decision。以下是 warm-up 后的 3 次测量：

| 候选目标数 | 中位延迟 | 样本均值 |
|---:|---:|---:|
| 10 | 440.62ms | 436.42ms |
| 20 | 892.48ms | 889.99ms |
| 50 | 1,887.98ms | 1,896.51ms |

当前项目的 Jev live classifier 在同类合成状态上，5 次测量中位数约 404.632ms，最大值约 1,378.357ms。Jev 延迟会受网络和服务端负载影响；Laya 延迟则主要受本地推理实现、输入长度和候选数量影响。

另外，在 50 个候选中把第 37 项命名为 `Pricing`，目标明确要求“点击 Pricing”时，本地模型仍选择了第 0 项，而不是 `Pricing`。这不是正式准确率基准，但说明当前 checkpoint + Chrome-style schema 还不能被视为通用网页目标分类器。

## 为什么会这样

Laya 的优势是一次 forward 输出多个固定类型的决策，不生成自然语言，因此理论上可以绕过 Jev 的网络 RTT。官方实现也支持 `preload` 和多问题并行。[agent.py](https://raw.githubusercontent.com/NandhaKishorM/laya/main/laya/agent.py)

但它有几个直接影响 Chrome 的限制：

1. `laya-typed-decisions` 不是经过 Chrome AX 动作数据训练的通用网页策略模型。
2. 官方 README 明确提醒，超过约 20 个选项后，分类会因为 option token/head 长度而退化；当前 Chrome 路径最多会保留 50 个候选。
3. 需要按语言路由；English checkpoint 对中文状态不适合作为默认模型，multilingual checkpoint 也需要单独验证。
4. Python + PyTorch MPS 是方便验证的路径，不等于帖子里针对 Apple GPU 优化后的本地推理运行时。当前日志还显示 MPS FP16 autocast 不可用，退回 FP32。

## 对我们项目的决定

暂时不把 Laya 直接接到默认 Chrome 路径。建议的商业级架构是：

```text
Chrome AX state
      |
candidate reducer（先把 50 个压到 10–20 个）
      |
local classifier（Laya，低延迟尝试）
      | 低置信度 / 不支持语言 / 失败
      v
Jev classifier（准确性兜底）
      |
Sky action executor + completion check
```

后续若继续推进，优先级应该是：

1. 用真实 Chrome AX 状态构建 operation/target/stop 标注集。
2. 先验证 English 和中文两套模型的目标选择准确率，不只测 forward 速度。
3. 把 Laya 从 Python 子进程改成常驻本地服务，并测试 Metal/MLX 或其他 FP16/量化运行时。
4. 以“端到端完成任务时间”和“每一步成功率”作为切换指标，而不是只看单次模型延迟。

当前判断：Laya 值得吸收，但应该作为本地 fast lane 的候选组件；目前 Jev 仍然是更可靠的通用决策器。
