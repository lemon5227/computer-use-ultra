import { type ChildProcess, type SpawnOptions } from 'node:child_process';
import type { ActionClassifier, ClassificationInput, EvaluationRequest, ProviderHealth, EvaluateFunction } from './classifier.js';
import type { ClassificationResult } from '../core/types.js';
type LayaSpawn = (command: string, args: string[], options: SpawnOptions) => ChildProcess;
export type LayaLocalOptions = {
    python?: string;
    workerPath?: string;
    model?: string;
    spawn?: LayaSpawn;
};
declare function compactLayaRequest(input: ClassificationInput): EvaluationRequest;
export declare class LayaLocalClassifier implements ActionClassifier {
    private readonly evaluateFn;
    private readonly python;
    constructor(evaluateFn?: EvaluateFunction, options?: LayaLocalOptions);
    classify(input: ClassificationInput): Promise<ClassificationResult>;
    health(): Promise<ProviderHealth>;
}
export { compactLayaRequest };
//# sourceMappingURL=laya-local.d.ts.map