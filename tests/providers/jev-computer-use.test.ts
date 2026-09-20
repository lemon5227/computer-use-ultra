import { describe, expect, it } from 'vitest';
import { buildComputerUseActionSpace, normalizeAccessibilityState } from '../../src/computer-use/accessibility.js';
import { buildJevComputerUseRequest, JevVercelClassifier } from '../../src/providers/jev-vercel.js';
import type { ElementNode, PageSnapshot } from '../../src/core/types.js';

describe('Jev Computer Use action space', () => {
  it('uses one combined action choice for operation, target, and completion', async () => {
    const snapshot = normalizeAccessibilityState({ app: 'Google Chrome', text: '1 button Pricing\n2 textbox Search (settable)' });
    const actionSpace = buildComputerUseActionSpace(snapshot);
    let captured: Record<string, unknown> | undefined;
    const classifier = new JevVercelClassifier(async (request) => {
      captured = request.questions;
      return {
        answers: {
          action: {
            type: 'choice',
            choice: 'CLICK:1',
            probabilities: { 'CLICK:1': 1, DONE: 0, BLOCKED: 0 },
          },
        },
      };
    });

    const result = await classifier.classify({ goal: 'Open pricing', snapshot, actionSpace });
    const action = captured?.action as { criteria?: Record<string, unknown> } | undefined;

    expect(result).toMatchObject({ operation: 'CLICK', targetId: '1', shouldStop: false });
    expect(action?.criteria).toHaveProperty('CLICK:1');
    expect(action?.criteria).toHaveProperty('TYPE_TEXT:2');
    expect(action?.criteria).toHaveProperty('DONE');
    expect(action?.criteria).toHaveProperty('BLOCKED');
    expect(captured).not.toHaveProperty('operation');
    expect(captured).not.toHaveProperty('should_stop');
  });

  it('builds one compact operation and target request for large pages', () => {
    const elements: ElementNode[] = Array.from({ length: 80 }, (_, index) => ({
      nodeId: String(index + 1),
      role: 'button',
      name: index === 67 ? 'Pricing' : `Unrelated action ${index + 1}`,
      visible: true,
      operations: ['CLICK'],
      risk: 'none',
    }));
    const snapshot: PageSnapshot = {
      snapshotId: 'large-request',
      fingerprint: 'large-request',
      url: 'computer-use://large',
      title: 'Large page',
      text: 'Large page',
      elements,
    };
    const actionSpace = buildComputerUseActionSpace(snapshot);
    const request = buildJevComputerUseRequest({ goal: 'Open pricing', snapshot, actionSpace });
    const questions = request.questions;
    const actionQuestion = questions.action;

    if (!actionQuestion || actionQuestion.type !== 'choice') throw new Error('action question missing');
    expect(request.model).toBe('typesafe-ai/jev');
    expect(request.state).not.toHaveProperty('elements');
    expect(Object.keys(questions)).toEqual(['action']);
    expect(Object.keys(actionQuestion.criteria)).toHaveLength(55);
    expect(actionQuestion.criteria).toHaveProperty('CLICK:68');
    expect(JSON.stringify(request).length).toBeLessThan(20_000);
  });

  it('offers non-target controls in the same decision request', async () => {
    let captured: Record<string, unknown> | undefined;
    const classifier = new JevVercelClassifier(async (request) => {
      captured = request.questions;
      return {
        answers: {
          action: { type: 'choice', choice: 'WAIT', probabilities: { WAIT: 1 } },
        },
      };
    });
    const snapshot = normalizeAccessibilityState({ app: 'Google Chrome', text: '1 button Refresh' });
    const result = await classifier.classify({
      goal: 'Wait for the page',
      snapshot,
      actionSpace: buildComputerUseActionSpace(snapshot),
    });

    expect(result).toMatchObject({ operation: 'WAIT', targetId: null, shouldStop: false });
    expect(captured).toMatchObject({ action: { criteria: expect.objectContaining({ WAIT: expect.any(String), SCROLL_UP: expect.any(String), SCROLL_DOWN: expect.any(String) }) } });
  });

  it('asks for a target only for the operation selected by Jev', async () => {
    let captured: Record<string, unknown> | undefined;
    const classifier = new JevVercelClassifier(async (request) => {
      captured = request.questions;
      return {
        answers: {
          action: { type: 'choice', choice: 'CLICK:1', probabilities: { 'CLICK:1': 1 } },
        },
      };
    });
    const snapshot = normalizeAccessibilityState({ app: 'Google Chrome', text: '1 button Pricing\n2 textbox Search (settable)' });
    const result = await classifier.classify({
      goal: 'Open pricing',
      snapshot,
      actionSpace: buildComputerUseActionSpace(snapshot),
    });

    expect(result).toMatchObject({ operation: 'CLICK', targetId: '1' });
    expect(captured).toHaveProperty('action');
    expect(captured).not.toHaveProperty('click_target');
    expect(captured).not.toHaveProperty('type_text_target');
    expect(captured).not.toHaveProperty('select_target');
  });

  it('keeps large pages within the Jev context budget while preserving goal matches', async () => {
    const manyElements: ElementNode[] = Array.from({ length: 120 }, (_, index) => ({
      nodeId: String(index + 1),
      role: 'button',
      name: index === 98 ? 'Pricing' : `Unrelated action ${index + 1}`,
      visible: true,
      operations: ['CLICK'],
      risk: 'none',
    }));
    const largeSnapshot: PageSnapshot = {
      snapshotId: 'large',
      fingerprint: 'large',
      url: 'computer-use://large',
      title: 'Large page',
      text: 'Large page',
      elements: manyElements,
    };
    let captured: Record<string, unknown> | undefined;
    const classifier = new JevVercelClassifier(async (request) => {
      captured = request as Record<string, unknown>;
      return {
        answers: {
          action: {
            type: 'choice',
            choice: 'DONE',
            probabilities: { DONE: 1 },
          },
        },
      };
    });

    await classifier.classify({
      goal: 'Open pricing',
      snapshot: largeSnapshot,
      actionSpace: buildComputerUseActionSpace(largeSnapshot),
    });

    const questions = captured?.questions as Record<string, { criteria?: Record<string, unknown> }>;
    const actionQuestion = questions.action;
    if (!actionQuestion) throw new Error('action question missing');
    const targetKeys = Object.keys(actionQuestion.criteria ?? {}).filter((key) => key.startsWith('CLICK:'));
    expect(targetKeys).toHaveLength(50);
    expect(actionQuestion.criteria).toHaveProperty('CLICK:99');
    expect(captured?.state).not.toHaveProperty('elements');
    expect(JSON.stringify(captured).length).toBeLessThan(20000);
  });
});
