# Codex Chrome Fast benchmark

Date: 2026-09-19  
Environment: macOS, Node v24.12.0, current Chrome via Codex `node_repl`

## Results

| Path | Samples | P50 | P95 | Mean |
|---|---:|---:|---:|---:|
| Accessibility Tree normalization + action space | 100 | 0.577 ms | 0.986 ms | 0.616 ms |
| Jev response mapping with injected evaluator | 100 | 0.050 ms | 0.089 ms | 0.056 ms |
| Real Jev classification over AI Gateway | 5 | 378.831 ms | 1,183.596 ms | 521.150 ms |
| Direct `sky.get_app_state` | 10 | 286.126 ms | 380.093 ms | 300.179 ms |
| Overlay observe + normalize + safe return | 10 | 287.163 ms | 302.331 ms | 288.764 ms |

The Chrome benchmark was read-only: it did not click, type, navigate, or change the active page. The overlay sample used an injected `DONE` classifier so its local overhead could be isolated from Jev network latency.

## Real Chrome scenario

Scenario: click the visible Bilibili `换一换` button once.

| Path | Samples | Median |
|---|---:|---:|
| Jev Overlay: observe → Jev → Computer Use click → verify | 3 | 1.563 s |
| Direct Computer Use: observe → known-label index → click → observe | 3 | 0.964 s |

All three overlay samples executed a real click; two returned `completed` immediately and one returned after the page update lagged. The direct baseline intentionally bypasses semantic model selection by using a freshly observed label match, so it is an executor baseline, not a full pure-Codex model comparison.

The first real run before compaction failed with `max_tokens_exceeded` on 247 candidates and a roughly 71 KB Jev request. The fix removes duplicated element state, ranks candidates by goal relevance, caps each Jev target head at 50, and accepts sparse probability maps by assigning omitted non-selected choices probability zero.

## Interpretation

- Local parsing and action-space construction remain around sub-millisecond at a 401-line / 250-candidate stress fixture.
- The overlay adds about 1 ms at P50 over a direct Accessibility Tree read in this run.
- Jev network latency is the dominant variable; the measured P95 tail was about 1.39 s.
- A realistic full cycle is therefore dominated by `sky.get_app_state` plus one Jev request, with the local planner overhead effectively negligible.

## Reproduce

```bash
npm run benchmark -- --samples=1000
source ~/.zprofile
npm run benchmark:live -- --samples=100 --live-samples=10
```

The reproducible harness is [`scripts/benchmark.mjs`](../scripts/benchmark.mjs). Live runs use a synthetic no-action state and do not touch Chrome.
