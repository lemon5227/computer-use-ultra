import type { Operation, Risk } from './types.js';
export declare function classifyRisk(input: {
    role?: string;
    name?: string;
}): Risk;
export declare function canExecute(operation: Operation, risk: Risk, approved?: boolean): {
    allowed: true;
} | {
    allowed: false;
    reason: string;
};
//# sourceMappingURL=policy.d.ts.map