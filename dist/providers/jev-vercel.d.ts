import type { ClassificationResult } from '../core/types.js';
import { type ActionClassifier, type ClassificationInput, type EvaluateFunction, type EvaluationRequest, type ProviderHealth } from './classifier.js';
export declare function buildJevComputerUseRequest(input: ClassificationInput): EvaluationRequest;
export declare class JevVercelClassifier implements ActionClassifier {
    private readonly evaluateFn;
    constructor(evaluateFn?: EvaluateFunction);
    classify(input: ClassificationInput): Promise<ClassificationResult>;
    health(): Promise<ProviderHealth>;
}
//# sourceMappingURL=jev-vercel.d.ts.map