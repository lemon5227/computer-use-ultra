import { describe, expect, it } from 'vitest';
import { verifyCompletion } from '../../src/runtime/completion.js';
import type { PageSnapshot } from '../../src/core/types.js';

const base: PageSnapshot = {
  snapshotId: 'snap-1', fingerprint: 'fp-1', url: 'https://example.test/result', title: 'Result',
  text: 'Order submitted successfully', elements: [],
};

describe('verifyCompletion', () => {
  it('matches a normalized goal phrase in bounded page text', () => {
    expect(verifyCompletion('order submitted', base)).toEqual({ complete: true, reason: 'goal text found in page state' });
  });

  it('does not treat an absent goal as complete', () => {
    expect(verifyCompletion('download report', base).complete).toBe(false);
  });
});
