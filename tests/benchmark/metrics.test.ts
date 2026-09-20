import { describe, expect, it } from 'vitest';
import { summarize } from '../../src/benchmark/metrics.js';

describe('benchmark metrics', () => {
  it('summarizes sorted latency samples with p50 and p95', () => {
    expect(summarize([1, 2, 3, 4])).toMatchObject({
      samples: 4,
      p50Ms: 2,
      p95Ms: 4,
      minMs: 1,
      maxMs: 4,
    });
  });
});
