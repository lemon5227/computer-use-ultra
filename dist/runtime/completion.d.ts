import type { PageSnapshot } from '../core/types.js';
export type CompletionResult = {
    complete: boolean;
    reason: string;
};
export declare function verifyCompletion(goal: string, snapshot: PageSnapshot): CompletionResult;
//# sourceMappingURL=completion.d.ts.map