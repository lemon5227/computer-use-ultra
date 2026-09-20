# Computer Use Ultra

Computer Use Ultra is an independent fast action-planning layer for Codex's bundled macOS Computer Use runtime.

It does not launch or control a browser itself. Codex Computer Use remains the executor through `node_repl` and `@oai/sky`; this package turns the current Chrome Accessibility Tree into a bounded action space, asks a fast planner for the next action and `element_index`, then invokes the existing Computer Use action. If a Jev/Gateway key is configured, Jev is used. If no key is available, local Laya is used.

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

`setup` installs the Codex Skill automatically and chooses the planner:

- Jev when `AI_GATEWAY_API_KEY`/`VERCEL_OIDC_TOKEN` already exists or `--api-key` is supplied.
- Local Laya when no Jev key is available. Laya needs Python and its local model; setup reports the exact install command if it is missing.

To explicitly provide a Jev key:

```bash
npm install -g computer-use-ultra && computer-use-ultra setup --api-key "YOUR_JEV_OR_GATEWAY_KEY"
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

The report shows the selected planner, Skill installation, Jev credential presence, and Laya availability without printing the key. The key is read from the environment when available. In Codex `node_repl`, where the shell environment is isolated, the runtime also accepts an explicit `AI_GATEWAY_API_KEY=...` or `VERCEL_OIDC_TOKEN=...` assignment in `.env`, `~/.config/computer-use-ultra/credentials`, the legacy `~/.config/codex-chrome-fast/credentials`, `~/.zprofile`, or `~/.zshrc`. It parses the assignment without executing the shell file. Do not commit `.env`, print the key, or put it in a prompt.

## 给 Codex 的安装说明

不想解释项目用途时，把下面这段连同本 README 发给 Codex：

```text
请阅读 Computer Use Ultra README：
https://github.com/lemon5227/computer-use-ultra/blob/main/README.md

请帮我安装并启用它来操作当前 Chrome。
如果本机已经有 Jev/Gateway Key，就使用 Jev；如果没有，就检查并使用本地 Laya。
安装完成后，使用 Computer Use Ultra Skill，不要启动第二个浏览器，不要使用 Playwright。
先运行 computer-use-ultra doctor，并告诉我最终使用的是 Jev 还是 Laya。
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

## Legacy name

Older local checkouts may still use `codex-chrome-fast`. The runtime keeps that CLI alias and credential path while migrating to `computer-use-ultra`.
