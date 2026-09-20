# Computer Use Ultra

Computer Use Ultra is an independent fast action-planning layer for Codex's bundled macOS Computer Use runtime.

It does not launch or control a browser itself. Codex Computer Use remains the executor through `node_repl` and `@oai/sky`; this package turns the current Chrome Accessibility Tree into a bounded action space, asks Vercel Jev for the next action and `element_index`, then invokes the existing Computer Use action.

This is not an official OpenAI or Codex product.

## Boundary

- Jev: chooses one bounded action such as `CLICK:<element_index>`, `TYPE_TEXT:<element_index>`, `SCROLL_DOWN`, `WAIT`, `DONE`, or `BLOCKED`.
- Computer Use: reads the current Chrome accessibility state and executes the UI action.
- This package: normalizes state, validates choices, remembers recent actions, enforces explicit text and risk approval, and verifies progress.
- No Playwright, standalone browser, Chrome extension, search provider, TinyFish, Monid, or MCP server is included.

## Install

```bash
npm install -g computer-use-ultra
computer-use-ultra doctor
```

The package requires a Codex environment with the bundled Computer Use `node_repl` and `@oai/sky` package. Chrome is the first supported surface.

## Requirements

- Node.js 22+ for building the planner.
- Codex with the bundled Computer Use `node_repl` and `@oai/sky` package.
- A Vercel AI Gateway credential in the environment for live Jev decisions.

## Install and verify

```bash
npm install
cp .env.example .env
export AI_GATEWAY_API_KEY="..."
npm run typecheck
npm test
npm run test:jev
```

The key is read from the environment when available. In Codex `node_repl`, where the shell environment is isolated, the runtime also accepts an explicit `AI_GATEWAY_API_KEY=...` or `VERCEL_OIDC_TOKEN=...` assignment in `.env`, `~/.config/computer-use-ultra/credentials`, the legacy `~/.config/codex-chrome-fast/credentials`, `~/.zprofile`, or `~/.zshrc`. It parses the assignment without executing the shell file. Do not commit `.env`, print the key, or put it in a prompt.

## Computer Use entrypoint

Build the package, then run the following in Codex `node_repl`:

```js
globalThis.sky = (await import("@oai/sky")).sky;
const { runJevComputerUse } = await import("computer-use-ultra");
const result = await runJevComputerUse(globalThis.sky, {
  app: "Google Chrome",
  goal: "Open the pricing page",
});
nodeRepl.write(JSON.stringify(result));
```

For text entry, provide an explicit approved value:

```js
const result = await runJevComputerUse(globalThis.sky, {
  app: "Google Chrome",
  goal: "Search for laptops",
  textValue: "laptops",
});
```

The runner observes the current Chrome Accessibility Tree before each Jev decision and after each action. Identical raw states reuse their normalized action space; the hot path makes one Jev decision per cycle and does not capture screenshots. The last ten action outcomes are provided to the next decision to reduce repeated actions and no-progress loops. Full completion verification is deferred until `DONE` or repeated no-progress. It never sends selectors, coordinates, JavaScript, passwords, cookies, or unrestricted page dumps to Jev. Sensitive or irreversible actions return `needs_confirmation` unless `approved: true` is supplied.

The public result includes aggregate metrics: `observeCount`, `classifierCalls`, `cacheHits`, `executedActions`, and `elapsedMs`.

## Codex Skill

The public skill is `skills/computer-use-ultra/SKILL.md`. It teaches Codex to use the bundled Computer Use executor with Jev as the planner. The legacy `skills/codex-chrome-fast/SKILL.md` remains as a compatibility alias. The bundled Computer Use plugin itself is proprietary and is not modified by this package.

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
