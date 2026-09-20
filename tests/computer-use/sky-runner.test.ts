import { describe, expect, it, vi } from 'vitest';
import type { ClassificationInput, ActionClassifier } from '../../src/providers/classifier.js';
import type { SkyAppState } from '../../src/computer-use/accessibility.js';
import { runSkyTask, type SkyAdapter } from '../../src/computer-use/sky-runner.js';

function classifierFor(...decisions: Array<Awaited<ReturnType<ActionClassifier['classify']>>>): ActionClassifier {
  let index = 0;
  return {
    health: async () => ({ ok: true, provider: 'test' }),
    classify: async (_input: ClassificationInput) => decisions[index++] ?? decisions.at(-1)!,
  };
}

function adapterFor(states: SkyAppState[]): SkyAdapter & { calls: Array<{ operation: string; elementIndex?: number }> } {
  let index = 0;
  const calls: Array<{ operation: string; elementIndex?: number }> = [];
  return {
    calls,
    observe: vi.fn(async () => states[Math.min(index++, states.length - 1)]!),
    click: vi.fn(async (elementIndex) => { calls.push({ operation: 'click', elementIndex }); }),
    setValue: vi.fn(async (elementIndex) => { calls.push({ operation: 'setValue', elementIndex }); }),
    typeText: vi.fn(async () => { calls.push({ operation: 'typeText' }); }),
    pressKey: vi.fn(async () => { calls.push({ operation: 'pressKey' }); }),
    scroll: vi.fn(async () => { calls.push({ operation: 'scroll' }); }),
  };
}

describe('runSkyTask', () => {
  it('passes recent action history into the next Jev decision', async () => {
    const adapter = adapterFor([
      { app: 'Google Chrome', text: '1 button Pricing' },
      { app: 'Google Chrome', text: '1 button Pricing\n2 text Pricing loaded' },
    ]);
    const inputs: ClassificationInput[] = [];
    const classifier: ActionClassifier = {
      health: async () => ({ ok: true, provider: 'test' }),
      classify: async (input) => {
        inputs.push(input);
        return inputs.length === 1
          ? { operation: 'CLICK', targetId: '1', probabilities: { CLICK: 1 }, shouldStop: false, shouldStopProbability: 0 }
          : { operation: 'DONE', targetId: null, probabilities: { DONE: 1 }, shouldStop: true, shouldStopProbability: 1 };
      },
    };

    await runSkyTask({
      goal: 'Open pricing',
      adapter,
      classifier,
      verifier: async () => ({ complete: true, reason: 'verified' }),
    });

    expect(inputs[0]?.history).toEqual([]);
    expect(inputs[1]?.history).toEqual([{ operation: 'CLICK', targetId: '1', pageChanged: true }]);
  });

  it('defers full completion verification until DONE', async () => {
    const verify = vi.fn(async (_goal: string, snapshot: { text: string }) => ({
      complete: snapshot.text.includes('Pricing loaded'),
      reason: snapshot.text.includes('Pricing loaded') ? 'verified' : 'not yet',
    }));
    const adapter = adapterFor([
      { app: 'Google Chrome', text: '1 button Pricing' },
      { app: 'Google Chrome', text: '1 button Pricing\n2 text Loading' },
      { app: 'Google Chrome', text: '1 button Pricing\n2 text Pricing loaded' },
    ]);

    const result = await runSkyTask({
      goal: 'Open pricing',
      adapter,
      verifier: verify,
      classifier: classifierFor(
        { operation: 'CLICK', targetId: '1', probabilities: { CLICK: 1 }, shouldStop: false, shouldStopProbability: 0 },
        { operation: 'DONE', targetId: null, probabilities: { DONE: 1 }, shouldStop: true, shouldStopProbability: 1 },
      ),
    });

    expect(result.status).toBe('completed');
    expect(verify).toHaveBeenCalledTimes(1);
    expect(result.metrics.classifierCalls).toBe(2);
  });

  it('reports cache hits when the observed accessibility state is unchanged', async () => {
    const adapter = adapterFor([
      { app: 'Google Chrome', text: '1 button Pricing' },
      { app: 'Google Chrome', text: '1 button Pricing' },
    ]);
    const result = await runSkyTask({
      goal: 'Open pricing',
      adapter,
      verifier: async () => ({ complete: false, reason: 'not yet' }),
      classifier: classifierFor(
        { operation: 'WAIT', targetId: null, probabilities: { WAIT: 1 }, shouldStop: false, shouldStopProbability: 0 },
        { operation: 'DONE', targetId: null, probabilities: { DONE: 1 }, shouldStop: true, shouldStopProbability: 1 },
      ),
    });

    expect(result.status).toBe('blocked');
    expect(result.metrics.classifierCalls).toBe(2);
    expect(result.metrics.cacheHits).toBeGreaterThanOrEqual(1);
  });

  it('executes a Jev-selected current accessibility element and verifies completion', async () => {
    const adapter = adapterFor([
      { app: 'Google Chrome', text: '1 button Pricing' },
      { app: 'Google Chrome', text: '1 button Pricing\n2 text Pricing loaded' },
    ]);
    const result = await runSkyTask({
      goal: 'Pricing loaded',
      adapter,
      classifier: classifierFor(
        { operation: 'CLICK', targetId: '1', probabilities: { CLICK: 1 }, shouldStop: false, shouldStopProbability: 0 },
        { operation: 'DONE', targetId: null, probabilities: { DONE: 1 }, shouldStop: true, shouldStopProbability: 1 },
      ),
    });

    expect(result.status).toBe('completed');
    expect(result.steps).toBe(1);
    expect(adapter.calls).toEqual([{ operation: 'click', elementIndex: 1 }]);
  });

  it('does not type when the caller has not supplied an explicit value', async () => {
    const adapter = adapterFor([{ app: 'Google Chrome', text: '5 textbox Search' }]);
    const result = await runSkyTask({
      goal: 'Search for laptops',
      adapter,
      classifier: classifierFor({ operation: 'TYPE_TEXT', targetId: '5', probabilities: { TYPE_TEXT: 1 }, shouldStop: false, shouldStopProbability: 0 }),
    });

    expect(result.status).toBe('blocked');
    expect(result.reason).toContain('TEXT_VALUE_REQUIRED');
    expect(adapter.calls).toEqual([]);
  });

  it('stops before sensitive actions unless explicitly approved', async () => {
    const adapter = adapterFor([{ app: 'Google Chrome', text: '7 button Delete account' }]);
    const result = await runSkyTask({
      goal: 'Delete account',
      adapter,
      classifier: classifierFor({ operation: 'CLICK', targetId: '7', probabilities: { CLICK: 1 }, shouldStop: false, shouldStopProbability: 0 }),
    });

    expect(result.status).toBe('needs_confirmation');
    expect(adapter.calls).toEqual([]);
  });
});
