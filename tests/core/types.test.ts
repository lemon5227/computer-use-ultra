import { describe, expect, it } from 'vitest';
import { serializeRuntimeState } from '../../src/core/types.js';
import type { ClassificationResult, PageSnapshot } from '../../src/core/types.js';

describe('core types', () => {
  it('serializes the bounded runtime state shape', () => {
    const snapshot: PageSnapshot = {
      snapshotId: 'snap-1',
      url: 'https://example.test/form',
      title: 'Fixture',
      text: 'Name Email Submit',
      elements: [],
      fingerprint: 'fp-1',
    };
    const decision: ClassificationResult = {
      operation: 'DONE',
      targetId: null,
      probabilities: { DONE: 1 },
      confidence: 1,
      shouldStop: true,
      shouldStopProbability: 1,
    };
    const serialized = serializeRuntimeState({ snapshot, decision });
    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('token');
    expect(JSON.parse(serialized)).toEqual({ snapshot, decision });
  });
});
