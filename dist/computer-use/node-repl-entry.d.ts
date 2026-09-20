import { type SkyApi } from './sky-adapter.js';
import { type SkyRunMetrics, type SkyRunResult, type SkyTaskOptions } from './sky-runner.js';
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
export declare function publicSkyRunResult(result: SkyRunResult): PublicSkyRunResult;
export declare function runJevComputerUse(sky: SkyApi, options: NodeReplSkyTaskOptions): Promise<PublicSkyRunResult>;
export declare function runComputerUse(sky: SkyApi, options: NodeReplSkyTaskOptions): Promise<PublicSkyRunResult>;
//# sourceMappingURL=node-repl-entry.d.ts.map