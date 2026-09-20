import type { ElementNode, Operation } from './types.js';
export type ActionSpace = {
    elements: ElementNode[];
    operations: Record<string, string>;
    targets: {
        CLICK: Record<string, ElementNode>;
        TYPE_TEXT: Record<string, ElementNode>;
        SELECT: Record<string, ElementNode>;
    };
};
export type ActionSpaceOptions = {
    includeWait?: boolean;
    canScrollUp?: boolean;
    canScrollDown?: boolean;
};
export declare function buildActionSpace(elements: ElementNode[], options?: ActionSpaceOptions): ActionSpace;
export declare function operationHasTarget(space: ActionSpace, operation: Operation): boolean;
//# sourceMappingURL=action-space.d.ts.map