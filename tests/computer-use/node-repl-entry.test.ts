import { describe, expect, it, vi } from 'vitest';
import { publicSkyRunResult, runComputerUse } from '../../src/computer-use/node-repl-entry.js';
import type { Window2SkyApi } from '../../src/computer-use/sky-adapter.js';
import type { ActionClassifier } from '../../src/providers/classifier.js';

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

  it('passes an explicit Windows Window2 target through the public entrypoint', async () => {
    const window = { app: 'chrome.exe', id: 77, title: 'Current tab' };
    const sky: Window2SkyApi = {
      list_apps: vi.fn(async () => []),
      get_window: vi.fn(async () => window),
      get_window_state: vi.fn(async () => ({
        window,
        accessibility: { tree: 'Window: "Current tab", App: chrome.exe\n1 button Home' },
      })),
      click: vi.fn(async () => {}),
      set_value: vi.fn(async () => {}),
      type_text: vi.fn(async () => {}),
      press_key: vi.fn(async () => {}),
    };
    const classifier: ActionClassifier = {
      health: async () => ({ ok: true, provider: 'test' }),
      classify: async () => ({
        operation: 'DONE',
        targetId: null,
        probabilities: { DONE: 1 },
        shouldStop: true,
        shouldStopProbability: 1,
      }),
    };

    const result = await runComputerUse(sky, {
      app: 'Google Chrome',
      window,
      goal: 'Observe the current tab',
      classifier,
      verifier: async () => ({ complete: true, reason: 'verified' }),
    });

    expect(result.status).toBe('completed');
    expect(result.metrics.observeCount).toBe(1);
    expect(sky.list_apps).not.toHaveBeenCalled();
    expect(sky.get_window).toHaveBeenCalledWith(window);
  });
});
