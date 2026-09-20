# Jev Fast Path Benchmark Report

Date: 2026-09-20

## Verification

```text
npm run typecheck  PASS
npm test          PASS: 14 files, 34 tests
npm run build     PASS
npm run test:jev  Shell environment did not contain a key; Node REPL credential check PASS
```

The shell does not receive the Codex Node REPL credential. A live classifier call from Node REPL returned a valid typed Jev response, so the configured credential path works in the intended runtime.

## Offline measurements

Command:

```bash
npm run benchmark -- --samples=100
npm run benchmark:live -- --samples=100 --live-samples=5
```

Fixture: 401 accessibility lines, 250 normalized elements, 7 available operation controls.

| Measurement | p50 | p95 | Mean |
|---|---:|---:|---:|
| Normalize + action space | 0.533 ms | 0.607 ms | 0.549 ms |
| Cache prepare, uncached | 0.521 ms | 0.627 ms | 0.539 ms |
| Cache prepare, cached | 0.001 ms | 0.002 ms | 0.001 ms |
| Jev request construction, combined action choice | 0.044 ms | 0.091 ms | 0.053 ms |
| Injected response mapping, combined action choice | 0.050 ms | 0.082 ms | 0.055 ms |
| Live Jev classification, 5 samples | 404.632 ms | 1378.357 ms | 572.778 ms |

The local processing cost is now negligible compared with the live Jev network/model latency. The cache removes repeated parsing/action-space work for byte-identical AX states.

## Real current-Chrome test

Task: click the visible Bilibili `播放/暂停` control. The run was capped at one action, so `max_steps` is expected after the click; it does not mean the click failed.

| Sample | Wall time | Status | Steps | Observations | Jev calls | Cache hits | Executed actions |
|---:|---:|---|---:|---:|---:|---:|---:|
| 1 | 2.402 s | max_steps | 1 | 2 | 1 | 0 | 1 |
| 2 | 1.618 s | max_steps | 1 | 2 | 1 | 0 | 1 |
| 3 | 1.717 s | max_steps | 1 | 2 | 1 | 0 | 1 |

Three-sample median: 1.717 s. The action executed on the current foreground Chrome tab; no second browser or Playwright runtime was used.

## Post-change Jev contract smoke test

The Cline-inspired combined action protocol was then tested against the current Chrome AX state without executing an action. The page contained 128 normalized elements and 128 offered targets. Three Jev calls returned `CLICK:140` consistently:

| Sample | Jev decision latency | Decision |
|---:|---:|---|
| 1 | 665 ms | `CLICK:140` |
| 2 | 375 ms | `CLICK:140` |
| 3 | 393 ms | `CLICK:140` |

Decision-only median: 393 ms. This is not a paired before/after benchmark on the same live state, but it confirms the new request shape works through the real Gateway and does not require a second browser or Playwright.

This is a functional fast-path validation, not an apples-to-apples speed claim against the earlier `换一换` scenario: that target was not present in the current page state. The previous report measured the older Jev Overlay at 1.563 s median on a different target and run set. The new measurements show the optimized local path is fast, while end-to-end time remains dominated by the live Jev call and Chrome state observation.

## Result

- The `jev-ultrafast` request shape is now extracted and reusable in our current-tab implementation.
- The Cline `jev-browser` combined action protocol is now used: one Jev choice selects both operation and target, while `DONE` is the local completion signal.
- The last ten action outcomes are carried into the next decision to reduce repeated/no-progress loops.
- Repeated AX normalization/action-space construction is cached.
- One real decision cycle uses one Jev request and one direct Sky action.
- Aggregate runner metrics are available for future comparisons.
- No claim is made that this small real sample is faster end-to-end than the earlier scenario; a same-target paired benchmark is required for that claim.
