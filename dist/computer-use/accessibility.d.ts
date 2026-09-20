import { type ActionSpace } from '../core/action-space.js';
import type { PageSnapshot } from '../core/types.js';
export type SkyAppState = {
    app: string;
    text: string;
};
export declare function normalizeAccessibilityState(state: SkyAppState): PageSnapshot;
export declare function buildComputerUseActionSpace(snapshot: PageSnapshot): ActionSpace;
//# sourceMappingURL=accessibility.d.ts.map