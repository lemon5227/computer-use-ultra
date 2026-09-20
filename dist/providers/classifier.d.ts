import type { ActionSpace } from '../core/action-space.js';
import type { ClassificationResult, Operation, PageSnapshot } from '../core/types.js';
export type RecentAction = {
    operation: Operation;
    targetId: string | null;
    pageChanged?: boolean;
};
export type ClassificationInput = {
    goal: string;
    snapshot: PageSnapshot;
    actionSpace: ActionSpace;
    history?: RecentAction[];
};
export type ProviderHealth = {
    ok: boolean;
    provider: string;
    reason?: string;
};
export type ActionClassifier = {
    classify(input: ClassificationInput): Promise<ClassificationResult>;
    health(): Promise<ProviderHealth>;
};
export type ChoiceQuestion = {
    type: 'choice';
    instructions: string | Record<string, unknown>;
    criteria: Record<string, string | Record<string, unknown>>;
};
export type BooleanQuestion = {
    type: 'boolean';
    instructions: string | Record<string, unknown>;
    criteria?: {
        true?: string;
        false?: string;
    };
};
export type EvaluationRequest = {
    model: string;
    state: string | Record<string, unknown>;
    questions: Record<string, ChoiceQuestion | BooleanQuestion>;
};
export type EvaluationResponse = {
    answers: Record<string, unknown>;
    providerMetadata?: Record<string, unknown>;
};
export type EvaluateFunction = (request: EvaluationRequest) => Promise<EvaluationResponse>;
export declare class InvalidJevAnswerError extends Error {
    readonly code = "INVALID_JEV_ANSWER";
    constructor(message: string);
}
//# sourceMappingURL=classifier.d.ts.map