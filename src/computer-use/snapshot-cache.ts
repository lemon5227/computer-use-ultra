import { buildComputerUseActionSpace, normalizeAccessibilityState, type SkyAppState } from './accessibility.js';
import type { ActionSpace } from '../core/action-space.js';
import type { PageSnapshot } from '../core/types.js';

export type PreparedComputerUseState = {
  rawKey: string;
  snapshot: PageSnapshot;
  actionSpace: ActionSpace;
};

export class AccessibilitySnapshotCache {
  private entry: PreparedComputerUseState | undefined;

  prepare(state: SkyAppState): PreparedComputerUseState {
    const rawKey = `${state.app}\u0000${state.text}`;
    if (this.entry?.rawKey === rawKey) return this.entry;

    const snapshot = normalizeAccessibilityState(state);
    const actionSpace = buildComputerUseActionSpace(snapshot);
    this.entry = { rawKey, snapshot, actionSpace };
    return this.entry;
  }

  clear(): void {
    this.entry = undefined;
  }
}
