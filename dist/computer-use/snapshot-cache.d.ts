import { type SkyAppState } from './accessibility.js';
import type { ActionSpace } from '../core/action-space.js';
import type { PageSnapshot } from '../core/types.js';
export type PreparedComputerUseState = {
    rawKey: string;
    snapshot: PageSnapshot;
    actionSpace: ActionSpace;
};
export declare class AccessibilitySnapshotCache {
    private entry;
    prepare(state: SkyAppState): PreparedComputerUseState;
    clear(): void;
}
//# sourceMappingURL=snapshot-cache.d.ts.map