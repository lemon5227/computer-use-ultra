import type { SkyAdapter } from './sky-adapter.js';
import type { ClassificationResult, PageSnapshot } from '../core/types.js';
import type { ActionClassifier } from '../providers/classifier.js';
import { type CompletionResult } from '../runtime/completion.js';
export type SkyTaskOptions = {
    goal: string;
    adapter: SkyAdapter;
    classifier?: ActionClassifier;
    maxSteps?: number;
    approved?: boolean;
    textValue?: string | Record<string, string>;
    verifier?: (goal: string, snapshot: PageSnapshot) => CompletionResult | Promise<CompletionResult>;
};
export type SkyRunStatus = 'completed' | 'needs_confirmation' | 'blocked' | 'failed' | 'max_steps';
export type SkyRunResult = {
    status: SkyRunStatus;
    steps: number;
    metrics: SkyRunMetrics;
    reason?: string;
    lastSnapshot?: PageSnapshot;
    lastDecision?: ClassificationResult;
};
export type SkyRunMetrics = {
    observeCount: number;
    classifierCalls: number;
    cacheHits: number;
    executedActions: number;
    elapsedMs: number;
};
export declare function runSkyTask(options: SkyTaskOptions): Promise<SkyRunResult>;
export type { SkyAdapter } from './sky-adapter.js';
//# sourceMappingURL=sky-runner.d.ts.map