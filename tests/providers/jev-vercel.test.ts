import { describe, expect, it } from 'vitest';
import { buildActionSpace } from '../../src/core/action-space.js';
import { JevVercelClassifier } from '../../src/providers/jev-vercel.js';
import type { ElementNode, PageSnapshot } from '../../src/core/types.js';

const snapshot: PageSnapshot = {
  snapshotId: 'snap-1',
  fingerprint: 'fp-1',
  url: 'https://example.test',
  title: 'Fixture',
  text: 'Pricing Documentation',
  elements: [
    { nodeId: 'pricing', role: 'button', name: 'Pricing', visible: true, operations: ['CLICK'], risk: 'none' },
    { nodeId: 'docs', role: 'button', name: 'Documentation', visible: true, operations: ['CLICK'], risk: 'none' },
  ],
};

describe('JevVercelClassifier', () => {
  it('maps one typed action answer to a bounded action result', async () => {
    let request: Record<string, unknown> | undefined;
    const classifier = new JevVercelClassifier(async (input) => {
      request = input as Record<string, unknown>;
      return {
        answers: {
          action: {
            type: 'choice',
            choice: 'CLICK:pricing',
            probabilities: { 'CLICK:pricing': 0.97, 'CLICK:docs': 0.03, DONE: 0.01, BLOCKED: 0.01 },
          },
        },
        providerMetadata: { typesafe: { confidence: { action: 0.98 } } },
      };
    });

    const result = await classifier.classify({ goal: 'Open pricing', snapshot, actionSpace: buildActionSpace(snapshot.elements) });

    expect(result.operation).toBe('CLICK');
    expect(result.targetId).toBe('pricing');
    expect(result.shouldStop).toBe(false);
    expect(result.probabilities).toEqual({ pricing: 0.97, docs: 0.03 });
    expect((request?.questions as Record<string, unknown>)?.action).toBeTruthy();
  });

  it('rejects a selected target that is not in the current action space', async () => {
    const classifier = new JevVercelClassifier(async () => ({
        answers: {
          action: { type: 'choice', choice: 'CLICK:missing', probabilities: { 'CLICK:missing': 1 } },
        },
    }));

    await expect(classifier.classify({ goal: 'Open pricing', snapshot, actionSpace: buildActionSpace(snapshot.elements) }))
      .rejects.toMatchObject({ code: 'INVALID_JEV_ANSWER' });
  });

  it('offers only the available target operation', async () => {
    const typeOnlyElements: ElementNode[] = [
      { nodeId: 'search', role: 'textbox', name: 'Search', visible: true, operations: ['TYPE_TEXT'], risk: 'none' },
    ];
    let request: Record<string, unknown> | undefined;
    const classifier = new JevVercelClassifier(async (input) => {
      request = input as Record<string, unknown>;
      return {
        answers: {
          action: { type: 'choice', choice: 'TYPE_TEXT:search', probabilities: { 'TYPE_TEXT:search': 1 } },
        },
      };
    });

    await classifier.classify({
      goal: 'Search',
      snapshot: { ...snapshot, elements: typeOnlyElements },
      actionSpace: buildActionSpace(typeOnlyElements),
    });

    const action = (request?.questions as Record<string, { criteria?: Record<string, unknown> }>)?.action;
    expect(action?.criteria).toHaveProperty('TYPE_TEXT:search');
    expect(Object.keys(action?.criteria ?? {}).some((key) => key.startsWith('CLICK:'))).toBe(false);
  });

  it('treats omitted Jev probabilities as zero for non-selected choices', async () => {
    const classifier = new JevVercelClassifier(async () => ({
        answers: {
          action: { type: 'choice', choice: 'CLICK:pricing', probabilities: { 'CLICK:pricing': 1 } },
        },
    }));

    const result = await classifier.classify({ goal: 'Open pricing', snapshot, actionSpace: buildActionSpace(snapshot.elements) });

    expect(result.probabilities).toEqual({ pricing: 1, docs: 0 });
  });
});
