import { describe, expect, it } from 'vitest';
import { AccessibilitySnapshotCache } from '../../src/computer-use/snapshot-cache.js';

describe('AccessibilitySnapshotCache', () => {
  it('reuses the prepared snapshot and action space for identical app state', () => {
    const cache = new AccessibilitySnapshotCache();
    const state = { app: 'Google Chrome', text: '1 button Pricing' };

    const first = cache.prepare(state);
    const second = cache.prepare({ ...state });

    expect(second.rawKey).toBe(first.rawKey);
    expect(second.snapshot).toBe(first.snapshot);
    expect(second.actionSpace).toBe(first.actionSpace);
  });

  it('invalidates prepared state when app or accessibility text changes', () => {
    const cache = new AccessibilitySnapshotCache();
    const first = cache.prepare({ app: 'Google Chrome', text: '1 button Pricing' });
    const changed = cache.prepare({ app: 'Google Chrome', text: '1 button Checkout' });

    expect(changed.snapshot).not.toBe(first.snapshot);
    expect(changed.actionSpace).not.toBe(first.actionSpace);
  });
});
