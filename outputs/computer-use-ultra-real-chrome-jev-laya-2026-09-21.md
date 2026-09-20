# Real Chrome: Jev vs. Local Laya

Date: 2026-09-21  
Environment: macOS, Node v24.12.0, Chrome controlled through Codex `node_repl` and `@oai/sky`

## Scenario

- Public page: `https://github.com/browser-use/jev-ultrafast`
- Goal: open the repository's Issues page
- Independent verifier: the resulting page must expose the `New issue` control
- Same Chrome tab, same goal, same Computer Use executor
- No forms, posts, likes, repository changes, or account actions were performed

## Results

| Planner | Result | Wall time | Steps | Classifier calls | Executed actions |
|---|---|---:|---:|---:|---:|
| Jev | completed | 2.777 s | 1 | 2 | 1 |
| Local Laya, cold real-Chrome run | failed freshness guard | 113.2 s | 0 | 1 | 0 |
| Local Laya, full-tree warm-up | no result within 120 s | >120 s | — | — | 0 |

Jev selected the repository Issues navigation and the verifier found `New issue` on the resulting page.

The Laya cold run selected accessibility target `7`, which was a Chrome toolbar element rather than the repository Issues link. While the local model was loading/inferencing, the observed Chrome state became stale, so the executor correctly rejected the action. A second attempt to warm Laya against the real Chrome tree did not return within 120 seconds and was stopped.

## Interpretation

The previous synthetic benchmark showed that Laya can make a decision in roughly 190–198 ms after its model is resident on a tiny eight-element fixture. That is not representative of the current real Chrome surface: the live AX tree includes browser chrome, extension notifications, tab controls, and hundreds of page/app nodes.

For the current implementation, pure Jev is the faster and more reliable real-world path. Laya is not ready to replace Jev for the full Chrome accessibility tree. The hybrid design should remain opt-in until Laya receives a browser-specific input reduction/routing layer and a bounded timeout with Jev fallback.

## Reproduction boundary

This is a single controlled public-page task, not a general reliability benchmark. The result measures the current project integration on this Mac; it does not invalidate Laya's small-fixture or GPU latency claims.
