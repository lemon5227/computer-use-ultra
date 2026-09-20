import { createSkyAdapter } from './sky-adapter.js';
import { runSkyTask } from './sky-runner.js';
export function publicSkyRunResult(result) {
    return {
        status: result.status,
        steps: result.steps,
        metrics: result.metrics,
        ...(result.reason ? { reason: result.reason } : {}),
        ...(result.lastSnapshot ? {
            lastSnapshot: {
                snapshotId: result.lastSnapshot.snapshotId,
                title: result.lastSnapshot.title,
                url: result.lastSnapshot.url,
                textLength: result.lastSnapshot.text.length,
                elementCount: result.lastSnapshot.elements.length,
            },
        } : {}),
    };
}
export async function runJevComputerUse(sky, options) {
    const result = await runSkyTask({
        ...options,
        adapter: createSkyAdapter(sky, options.app ?? 'Google Chrome'),
    });
    return publicSkyRunResult(result);
}
//# sourceMappingURL=node-repl-entry.js.map