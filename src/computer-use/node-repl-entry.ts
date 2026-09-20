import { createSkyAdapter, type SkyApi } from './sky-adapter.js';
import { runSkyTask, type SkyRunMetrics, type SkyRunResult, type SkyTaskOptions } from './sky-runner.js';

export type NodeReplSkyTaskOptions = Omit<SkyTaskOptions, 'adapter'> & {
  app?: string;
};

export type PublicSkyRunResult = Pick<SkyRunResult, 'status' | 'steps' | 'reason'> & {
  metrics: SkyRunMetrics;
  lastSnapshot?: {
    snapshotId: string;
    title: string;
    url: string;
    textLength: number;
    elementCount: number;
  };
};

export function publicSkyRunResult(result: SkyRunResult): PublicSkyRunResult {
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

export async function runJevComputerUse(sky: SkyApi, options: NodeReplSkyTaskOptions): Promise<PublicSkyRunResult> {
  const result = await runSkyTask({
    ...options,
    adapter: createSkyAdapter(sky, options.app ?? 'Google Chrome'),
  });
  return publicSkyRunResult(result);
}
