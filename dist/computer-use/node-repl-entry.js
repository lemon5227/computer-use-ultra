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
    return runComputerUse(sky, options);
}
export async function runComputerUse(sky, options) {
    const { app = 'Google Chrome', window, ...taskOptions } = options;
    const result = await runSkyTask({
        ...taskOptions,
        adapter: createSkyAdapter(sky, app, window ? { window } : {}),
    });
    return publicSkyRunResult(result);
}
//# sourceMappingURL=node-repl-entry.js.map