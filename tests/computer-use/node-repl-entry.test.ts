import { describe, expect, it } from 'vitest';
import { publicSkyRunResult } from '../../src/computer-use/node-repl-entry.js';

describe('publicSkyRunResult', () => {
  it('returns safe metadata without exposing the accessibility tree', () => {
    const result = publicSkyRunResult({
      status: 'completed',
      steps: 2,
      metrics: {
        observeCount: 3,
        classifierCalls: 2,
        cacheHits: 1,
        executedActions: 2,
        elapsedMs: 12,
      },
      reason: 'goal text found in page state',
      lastSnapshot: {
        snapshotId: 'ax-123',
        fingerprint: 'fingerprint',
        url: 'computer-use://Google%20Chrome',
        title: 'Google Chrome',
        text: 'secret page text',
        elements: [{
          nodeId: '1',
          role: 'button',
          name: 'Secret button',
          visible: true,
          operations: ['CLICK'],
          risk: 'none',
        }],
      },
    });

    expect(result).toEqual({
      status: 'completed',
      steps: 2,
      metrics: {
        observeCount: 3,
        classifierCalls: 2,
        cacheHits: 1,
        executedActions: 2,
        elapsedMs: 12,
      },
      reason: 'goal text found in page state',
      lastSnapshot: {
        snapshotId: 'ax-123',
        title: 'Google Chrome',
        url: 'computer-use://Google%20Chrome',
        textLength: 'secret page text'.length,
        elementCount: 1,
      },
    });
    expect(JSON.stringify(result)).not.toContain('Secret button');
  });
});
