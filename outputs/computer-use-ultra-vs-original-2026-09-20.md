# Computer Use Ultra vs. Original Baseline

Date: 2026-09-20  
Environment: macOS, Node v24.12.0, current Chrome through Codex `node_repl`

This document keeps the original measurements and the new fast-path measurements together. It is intentionally explicit about which numbers are paired and which are not.

## Executive summary

- The original same-scenario comparison measured a 1.563 s median for the Jev Overlay path and a 0.964 s median for a direct Computer Use executor baseline.
- Computer Use Ultra's new combined Jev protocol produced a 393 ms median decision-only latency across three live Gateway calls.
- The 393 ms number excludes Chrome action execution and completion verification, so it is not an end-to-end replacement for the 1.563 s or 0.964 s numbers.
- A later real-Chrome smoke test used a different target (`播放/暂停`) and measured 1.717 s median end-to-end. It is a functional smoke test, not an apples-to-apples speed claim.

## Real Chrome comparison

| Path | Scenario | Samples | Median | Comparable? |
|---|---|---:|---:|---|
| Original Jev Overlay | Click Bilibili `换一换` | 3 | 1.563 s | Yes, original paired scenario |
| Direct Computer Use executor | Click Bilibili `换一换` using a freshly observed label | 3 | 0.964 s | Yes, original paired scenario |
| Computer Use Ultra smoke test | Click Bilibili `播放/暂停` | 3 | 1.717 s | No, different target and page state |
| Computer Use Ultra combined Jev protocol | Choose `CLICK:<element_index>` without executing it | 3 | 393 ms | Decision-only |

The original report explains that the direct executor row intentionally bypasses semantic model selection, so it is an executor lower-bound rather than a full pure-Codex baseline. The current implementation uses the same current Chrome surface and does not launch a second browser or use Playwright.

## Local overhead comparison

| Measurement | Original | Computer Use Ultra | Change |
|---|---:|---:|---:|
| Accessibility Tree normalization + action space, p50 | 0.577 ms | 0.533 ms | -7.6% |
| Jev response mapping, p50 | 0.050 ms | 0.050 ms | 0.0% |

The local planner remains negligible compared with Chrome observation and live Jev network/model latency. The practical optimization is the request/action protocol and the hot-path behavior: one combined Jev action choice per cycle, bounded targets, cached identical AX states, recent-action memory, and deferred full verification until completion signals or repeated no-progress.

## Reproduce

```bash
npm run typecheck
npm test
npm run build
npm run benchmark -- --samples=100
```

Source reports:

- [Original benchmark report](benchmark-report-2026-09-19.md)
- [Current benchmark report](benchmark-report-2026-09-20.md)

## Interpretation

These measurements support the claim that Computer Use Ultra makes the action-planning path compact and fast. They do not support a claim that this release is already faster end-to-end than the original direct executor in every task. A same-target, paired, repeated end-to-end benchmark is the next measurement needed for that claim.
