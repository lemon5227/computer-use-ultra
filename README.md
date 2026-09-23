# Computer Use Ultra

Computer Use Ultra is an independent fast action-planning layer for Codex's bundled Computer Use runtime on macOS and Windows.

It does not launch or control a browser itself. Codex Computer Use remains the executor through `node_repl` and `@oai/sky`; this package turns the current Chrome Accessibility Tree into a bounded action space, asks a fast planner for the next action and `element_index`, then invokes the existing Computer Use action. Jev requests currently go through Vercel AI Gateway. A Vercel AI Gateway key selects Jev; without one, local Laya is used.

This is not an official OpenAI or Codex product.

## Boundary

- Jev or Laya: chooses one bounded action such as `CLICK:<element_index>`, `TYPE_TEXT:<element_index>`, `SCROLL_DOWN`, `WAIT`, `DONE`, or `BLOCKED`.
- Computer Use: reads the current Chrome accessibility state and executes the UI action.
- This package: normalizes state, validates choices, remembers recent actions, enforces explicit text and risk approval, and verifies progress.
- No Playwright, standalone browser, search provider, TinyFish, Monid, or MCP server is included. Chrome is still operated by Codex Computer Use.

## Install in one command

```bash
npm install -g computer-use-ultra && computer-use-ultra setup
```

`setup` installs the Codex Skill automatically. This release supports Jev through Vercel AI Gateway; it does not accept a direct TypeSafe AI Jev API key. If no Gateway credential is already configured, setup offers Vercel sign-in and automatic Jev configuration as the default. It checks your Vercel CLI session, opens Vercel's browser sign-in if needed, creates a dedicated AI Gateway key, and saves it locally. You can instead paste an existing Gateway key or choose local Laya.

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

The package requires a Codex environment with the bundled Computer Use `node_repl` and `@oai/sky` package. On Windows, initialize Sky through the bundled Computer Use client's Window2 bootstrap. Chrome is the first supported surface.

## Requirements

- Node.js 22+ for building the planner.
- Codex with the bundled Computer Use `node_repl` and `@oai/sky` package.
- Either a Vercel AI Gateway credential for Jev, or Python 3.8+ with the local Laya package.

## Verify

```bash
computer-use-ultra doctor
```

The report shows the selected planner, Skill installation, Jev credential presence, and Laya availability without printing the key. The key is read from the environment when available. In Codex `node_repl`, where the shell environment is isolated, the runtime also accepts an explicit `AI_GATEWAY_API_KEY=...` or `VERCEL_OIDC_TOKEN=...` assignment in `.env`, `~/.config/computer-use-ultra/credentials`, the legacy `~/.config/codex-chrome-fast/credentials`, `~/.zprofile`, or `~/.zshrc`. It parses the assignment without executing the shell file. Do not commit `.env`, print the key, or put it in a prompt.

## 给 Codex：把这段直接发给它

使用者不需要理解 Jev、Laya 或配置文件。把本 README 的链接和下面这段话一起发给 Codex；默认通过 Vercel 浏览器登录自动创建并保存 Gateway key，不需要手动复制 key：

```text
请阅读并安装 Computer Use Ultra：
https://github.com/lemon5227/computer-use-ultra/blob/main/README.md

请执行：
1. 安装 npm 包 computer-use-ultra。
2. 运行 computer-use-ultra setup。
3. setup 默认选择 Vercel 登录自动配置 Jev；如果浏览器要求登录，让我完成登录并继续，自动创建并保存 Vercel AI Gateway key。
4. 如果自动登录失败，再让我选择粘贴现有的 Vercel AI Gateway key；不要接受 TypeSafe 官网的直连 Jev key，也不要让我手动编辑环境变量或配置文件。
5. 运行 computer-use-ultra doctor，确认 planner 是 jev。
6. 安装并使用 Computer Use Ultra Skill，操作我当前的 Chrome 标签页。

要求：
- 使用 Codex Computer Use 和 @oai/sky 执行浏览器动作。
- 不要启动第二个浏览器，不要使用 Playwright。
- 默认使用 Jev；只有我明确要求时才使用本地 Laya。
```

## Computer Use entrypoint

Build the package, then initialize the official Computer Use runtime in Codex `node_repl`.

On macOS, the bundled Sky API can be imported directly:

```js
globalThis.sky = (await import("@oai/sky")).sky;
const { runComputerUse } = await import("computer-use-ultra");
const result = await runComputerUse(globalThis.sky, {
  app: "Google Chrome",
  goal: "Open the pricing page",
});
nodeRepl.write(JSON.stringify(result));
```

On Windows, follow the bundled Computer Use Skill and import its `scripts/computer-use-client.mjs` by absolute path. The client loads `@oai/sky` with the required approvals and interruption handling. Select a window returned by the Window2 API instead of constructing one:

```js
if (!globalThis.sky) {
  const { setupComputerUseRuntime } = await import(
    "<absolute path to the bundled computer-use/scripts/computer-use-client.mjs>"
  );
  await setupComputerUseRuntime({ globals: globalThis });
}
globalThis.apps = await sky.list_apps();
globalThis.chromeWindows = apps
  .filter((candidate) => /chrome/i.test(`${candidate.id} ${candidate.displayName ?? ""}`))
  .flatMap((candidate) => candidate.windows);
if (chromeWindows.length !== 1) {
  throw new Error("Select exactly one current Chrome window");
}
globalThis.targetWindow = await sky.get_window(chromeWindows[0]);
const { runComputerUse } = await import("computer-use-ultra");
const result = await runComputerUse(globalThis.sky, {
  app: "Google Chrome",
  window: targetWindow,
  goal: "Open the pricing page",
});
nodeRepl.write(JSON.stringify(result));
```

When exactly one matching Chrome window is open, the Windows adapter can discover it automatically. Passing `window` is required when multiple matching windows are open so the runner never guesses which browser window to control. Windows observations use `get_window_state({ include_text: true, include_screenshot: false })`; scrolling uses bounded Page Up/Page Down input and still does not capture screenshots in the hot path.

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

## Codex Skill

The public skill is `skills/computer-use-ultra/SKILL.md`. It teaches Codex to use the bundled Computer Use executor with automatic Jev-or-Laya planning. The legacy `skills/codex-chrome-fast/SKILL.md` remains as a compatibility alias. The bundled Computer Use plugin itself is proprietary and is not modified by this package.

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
