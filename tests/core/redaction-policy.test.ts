import { describe, expect, it } from 'vitest';
import { canExecute, classifyRisk } from '../../src/core/policy.js';
import { redactElement } from '../../src/core/redaction.js';
import type { ElementNode } from '../../src/core/types.js';

describe('redaction and policy', () => {
  it('redacts sensitive values while preserving the control identity', () => {
    const element: ElementNode = {
      nodeId: 'card',
      role: 'textbox',
      name: 'Credit card number',
      value: '4111111111111111',
      visible: true,
      operations: ['TYPE_TEXT'],
      risk: 'sensitive',
    };

    const redacted = redactElement(element);

    expect(redacted.nodeId).toBe('card');
    expect(redacted.value).toBe('[REDACTED]');
    expect(JSON.stringify(redacted)).not.toContain('4111111111111111');
  });

  it('classifies destructive labels as irreversible', () => {
    expect(classifyRisk({ role: 'button', name: 'Delete account' })).toBe('irreversible');
    expect(classifyRisk({ role: 'button', name: 'Send message' })).toBe('sensitive');
    expect(classifyRisk({ role: 'button', name: 'Pricing' })).toBe('none');
    expect(classifyRisk({ role: 'textbox', name: 'Password' })).toBe('sensitive');
  });

  it('requires explicit approval for irreversible actions', () => {
    expect(canExecute('CLICK', 'irreversible')).toEqual({
      allowed: false,
      reason: 'EXPLICIT_APPROVAL_REQUIRED',
    });
    expect(canExecute('CLICK', 'irreversible', true)).toEqual({ allowed: true });
  });
});
