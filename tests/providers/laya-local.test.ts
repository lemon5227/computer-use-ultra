import { describe, expect, it } from 'vitest';
import { buildActionSpace } from '../../src/core/action-space.js';
import { LayaLocalClassifier } from '../../src/providers/laya-local.js';
import type { EvaluationRequest, EvaluationResponse } from '../../src/providers/classifier.js';
import type { PageSnapshot } from '../../src/core/types.js';

const snapshot: PageSnapshot = {
  snapshotId: 'snap-1',
  fingerprint: 'fp-1',
  url: 'https://example.test',
  title: 'Fixture',
  text: 'Pricing Documentation',
  elements: [
    { nodeId: 'pricing', role: 'button', name: 'Pricing', visible: true, operations: ['CLICK'], risk: 'none' },
  ],
};

describe('LayaLocalClassifier', () => {
  it('converts the action space to Laya choice criteria and maps the selected action back', async () => {
    let request: EvaluationRequest | undefined;
    const evaluate = async (input: EvaluationRequest): Promise<EvaluationResponse> => {
      request = input;
      return {
        answers: {
          action: {
            type: 'choice',
            choice: 'CLICK:pricing',
            probabilities: { 'CLICK:pricing': 0.9, DONE: 0.1 },
            confidence: 0.8,
          },
        },
      };
    };
    const classifier = new LayaLocalClassifier(evaluate);

    await expect(classifier.classify({
      goal: 'Open pricing',
      snapshot,
      actionSpace: buildActionSpace(snapshot.elements),
    })).resolves.toMatchObject({ operation: 'CLICK', targetId: 'pricing', confidence: 0.8 });

    const criteria = request?.questions.action;
    if (!criteria || criteria.type !== 'choice') throw new Error('choice criteria missing');
    expect(criteria?.type).toBe('choice');
    expect(criteria.criteria).toHaveProperty('CLICK:pricing');
    expect(typeof criteria.criteria['CLICK:pricing']).toBe('string');
  });

  it('rejects a Laya action that is not in the current action space', async () => {
    const classifier = new LayaLocalClassifier(async () => ({
      answers: { action: { type: 'choice', choice: 'CLICK:missing', probabilities: { 'CLICK:missing': 1 } } },
    }));

    await expect(classifier.classify({
      goal: 'Open pricing',
      snapshot,
      actionSpace: buildActionSpace(snapshot.elements),
    })).rejects.toMatchObject({ code: 'INVALID_JEV_ANSWER' });
  });
});
