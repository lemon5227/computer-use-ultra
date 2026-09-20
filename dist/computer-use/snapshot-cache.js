import { buildComputerUseActionSpace, normalizeAccessibilityState } from './accessibility.js';
export class AccessibilitySnapshotCache {
    entry;
    prepare(state) {
        const rawKey = `${state.app}\u0000${state.text}`;
        if (this.entry?.rawKey === rawKey)
            return this.entry;
        const snapshot = normalizeAccessibilityState(state);
        const actionSpace = buildComputerUseActionSpace(snapshot);
        this.entry = { rawKey, snapshot, actionSpace };
        return this.entry;
    }
    clear() {
        this.entry = undefined;
    }
}
//# sourceMappingURL=snapshot-cache.js.map