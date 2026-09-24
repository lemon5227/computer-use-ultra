# Computer Use Ultra

Computer Use Ultra is an independent fast action-planning layer for Codex's bundled macOS Computer Use runtime.

It does not launch or control a browser itself. Codex Computer Use remains the executor through `node_repl` and `@oai/sky`; this package turns the current Chrome Accessibility Tree into a bounded action space, asks a fast planner for the next action and `element_index`, then invokes the existing Computer Use action. Jev requests currently go through Vercel AI Gateway. A Vercel AI Gateway key selects Jev; without one, local Laya is used.

This is not an official OpenAI or Codex product.

## Boundary

- Jev or Laya: chooses one bounded action such as `CLICK:<element_index>`, `TYPE_TEXT:<element_index>`, `SCROLL_DOWN`, `WAIT`, `DONE`, or `BLOCKED`.
- Computer Use: reads the current Chrome accessibility state and executes the UI action.
- This package: normalizes state, validates choices, remembers recent actions, enforces explicit text and risk approval, and verifies progress.
- No Playwright, standalone browser, search provider, TinyFish, Monid, or MCP server is included. Chrome is still operated by Codex Computer Use.

## Install and toggle in Codex

Install the runtime and configure the planner:

```bash
npm install -g computer-use-ultra && computer-use-ultra setup
```

The npm package installs the runtime and CLI. `setup` configures only the planner and credentials; it does not install a global Skill or change the plugin's enabled state. It safely removes only exact packaged copies of old global Skills; customized copies are preserved and reported by `setup`/`doctor`.

The repository includes a local Codex plugin at `plugins/computer-use-ultra` and its marketplace entry at `.agents/plugins/marketplace.json`. When working in this repository, open/trust it in Codex and find **Computer Use Ultra** in the Plugins browser. From another repository, add the GitHub marketplace once:

```bash
codex plugin marketplace add lemon5227/computer-use-ultra --ref main
```

Then install/enable it in Codex Plugins. Toggle it on or off from Codex Plugins settings at any time; when it is off, use Codex's built-in Computer Use normally. Adding the marketplace registers its source in the user's Codex configuration but does not enable the plugin. The npm runtime is still required for the Skill's `computer-use-ultra` import. If `setup` reports a customized standalone Skill as preserved, that copy can still invoke Ultra independently of the plugin toggle; inspect and move/disable it yourself if you want the toggle to be authoritative.

This release supports Jev through Vercel AI Gateway; it does not accept a direct TypeSafe AI Jev API key. If no Gateway credential is already configured, setup offers Vercel sign-in and automatic Jev configuration as the default. It checks your Vercel CLI session, opens Vercel's browser sign-in if needed, creates a dedicated AI Gateway key, and saves it locally. You can instead paste an existing Gateway key or choose local Laya.

- Jev when `AI_GATEWAY_API_KEY`/`VERCEL_OIDC_TOKEN` already exists, you finish Vercel sign-in, paste a Vercel AI Gateway key, or `--api-key` is supplied.
- Local Laya only when you explicitly choose it or continue without a Vercel credential. Laya needs Python and its local model; setup reports the exact install command if it is missing.

### Get a Vercel AI Gateway key

1. Sign in to your [Vercel dashboard](https://vercel.com/dashboard).
2. Open **AI Gateway → API Keys** and choose **Create key**.
3. Copy the new key, run `computer-use-ultra setup`, and paste it when prompted.

See Vercel's [AI Gateway authentication guide](https://vercel.com/docs/ai-gateway/authentication-and-byok) for the current dashboard steps and authentication options. A TypeSafe AI key created for direct Jev access is a different credential and is not supported by this integration.

中文：首次运行 setup 时选择默认的 Vercel 登录选项，并在浏览器完成登录；工具会自动创建并保存 Gateway key。也可以先在 Vercel Dashboard 的 **AI Gateway → API Keys → Create key** 手动创建 key，再在 setup 里选择粘贴已有 key。需要的是 Vercel AI Gateway key，不是 TypeSafe AI 官网的直连 Jev key。

To pass a Vercel AI Gateway key directly to setup:

```bash
npm install -g computer-use-ultra && computer-use-ultra setup --api-key "YOUR_VERCEL_AI_GATEWAY_KEY"
```

To explicitly force local Laya:

```bash
computer-use-ultra setup --planner laya
python3 -m pip install laya
```

The package requires a Codex environment with the bundled Computer Use `node_repl` and `@oai/sky` package. Chrome is the first supported surface.

## Requirements

- Node.js 22+ for building the planner.
- Codex with the bundled Computer Use `node_repl` and `@oai/sky` package.
- Either a Vercel AI Gateway credential for Jev, or Python 3.8+ with the local Laya package.

## Verify

```bash
computer-use-ultra doctor
```

The report shows the selected planner, remaining standalone legacy Skill copies, Jev credential presence, and Laya availability without printing the key. It cannot inspect whether Codex has the plugin enabled; use Codex Plugins settings for that. A customized standalone Skill may continue to invoke Ultra while the plugin is off. The key is read from the environment when available. In Codex `node_repl`, where the shell environment is isolated, the runtime also accepts an explicit `AI_GATEWAY_API_KEY=...` or `VERCEL_OIDC_TOKEN=...` assignment in `.env`, `~/.config/computer-use-ultra/credentials`, the legacy `~/.config/codex-chrome-fast/credentials`, `~/.zprofile`, or `~/.zshrc`. It parses the assignment without executing the shell file. Do not commit `.env`, print the key, or put it in a prompt.

## 给 Codex：把这段直接发给它

使用者不需要理解 Jev、Laya 或配置文件。把本 README 的链接和下面这段话一起发给 Codex；默认通过 Vercel 浏览器登录自动创建并保存 Gateway key，不需要手动复制 key。插件开关仍由用户在 Codex Plugins 设置中控制：

```text
请阅读并安装 Computer Use Ultra：
https://github.com/lemon5227/computer-use-ultra/blob/main/README.md

请执行：
1. 在当前仓库安装 npm 包 computer-use-ultra，并运行 computer-use-ultra setup。
2. setup 默认选择 Vercel 登录自动配置 Jev；如果浏览器要求登录，让我完成登录并继续，自动创建并保存 Vercel AI Gateway key。
3. 如果自动登录失败，再让我选择粘贴现有的 Vercel AI Gateway key；不要接受 TypeSafe 官网的直连 Jev key，也不要让我手动编辑环境变量或配置文件。
4. 运行 computer-use-ultra doctor，确认 planner 是 jev。
5. 如果 Computer Use Ultra marketplace 尚未添加，运行 `codex plugin marketplace add lemon5227/computer-use-ultra --ref main`；随后告诉我去 Codex Plugins 设置中自行安装/启用。不要安装全局 Skill，也不要替我改变插件开关。
6. 插件启用后才使用它操作当前 Chrome 标签页；插件关闭时使用 Codex 内置 Computer Use。

要求：
- 使用 Codex Computer Use 和 @oai/sky 执行浏览器动作。
- 不要启动第二个浏览器，不要使用 Playwright。
- 默认使用 Jev；只有我明确要求时才使用本地 Laya。
```

## Computer Use entrypoint

Build the package, then run the following in Codex `node_repl`:

```js
globalThis.sky = (await import("@oai/sky")).sky;
const { runComputerUse } = await import("computer-use-ultra");
const result = await runComputerUse(globalThis.sky, {
  app: "Google Chrome",
  goal: "Open the pricing page",
});
nodeRepl.write(JSON.stringify(result));
```

For text entry, provide an explicit approved value:

```js
const result = await runComputerUse(globalThis.sky, {
  app: "Google Chrome",
  goal: "Search for laptops",
  textValue: "laptops",
});
```

The runner observes the current Chrome Accessibility Tree before each planner decision and after each action. Identical raw states reuse their normalized action space; the hot path makes one decision per cycle and does not capture screenshots. The last ten action outcomes are provided to the next decision to reduce repeated actions and no-progress loops. Full completion verification is deferred until `DONE` or repeated no-progress. It never sends selectors, coordinates, JavaScript, passwords, cookies, or unrestricted page dumps to Jev or Laya. Sensitive or irreversible actions return `needs_confirmation` unless `approved: true` is supplied.

The public result includes aggregate metrics: `observeCount`, `classifierCalls`, `cacheHits`, `executedActions`, and `elapsedMs`.

## Codex Plugin and Skill

The distributable plugin is `plugins/computer-use-ultra`; the repository-local marketplace is `.agents/plugins/marketplace.json`. The canonical Skill is `skills/computer-use-ultra/SKILL.md` and is copied into the plugin package. Tests enforce byte-for-byte equality so plugin behavior does not drift. The legacy `skills/codex-chrome-fast/SKILL.md` remains in the npm package only so setup can safely identify old exact copies; setup no longer installs it globally. The bundled Computer Use plugin itself is proprietary and is not modified by this package.

Laya is a local open-source decision model. It removes the network round trip and does not require a Jev key, but its first model load downloads weights and its accuracy depends on the number/language of choices. Jev remains the preferred fallback for large action spaces when a key is configured.

## Development

```bash
npm run typecheck
npm test
npm run build
npm run benchmark
npm run benchmark:live
```

The live Jev smoke test can consume provider credits. Browser interaction tests use injected fake Sky adapters; a controlled real Chrome smoke test is performed through Codex Computer Use, not through a project browser driver.

`benchmark` measures local Accessibility Tree/action-space overhead, uncached versus cached preparation, compact Jev request construction, and response mapping. `benchmark:live` adds real Jev request latency using a synthetic no-action state; it does not touch Chrome. Use `-- --samples=2000 --live-samples=5` to change sample counts.

## Benchmark comparison

The measured comparison with the original Jev Overlay path and the direct Computer Use executor is in [`outputs/computer-use-ultra-vs-original-2026-09-20.md`](outputs/computer-use-ultra-vs-original-2026-09-20.md). It includes the paired original scenario, the current combined-protocol decision latency, and the non-paired Chrome smoke-test caveat.

The real Chrome Jev/Laya comparison is recorded in [`outputs/computer-use-ultra-real-chrome-jev-laya-2026-09-21.md`](outputs/computer-use-ultra-real-chrome-jev-laya-2026-09-21.md). It shows why local Laya remains opt-in for the full Chrome accessibility tree.

## Legacy name

Older local checkouts may still use `codex-chrome-fast`. The runtime keeps that CLI alias and credential path while migrating to `computer-use-ultra`.
