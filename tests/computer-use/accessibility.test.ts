import { describe, expect, it } from 'vitest';
import { normalizeAccessibilityState } from '../../src/computer-use/accessibility.js';

describe('normalizeAccessibilityState', () => {
  it('turns numbered Chinese and English accessibility controls into safe action candidates', () => {
    const snapshot = normalizeAccessibilityState({
      app: 'Google Chrome',
      text: [
        '0 Standard window GitHub - Google Chrome',
        '    4 按钮 (disabled) 返回',
        '    10 文本栏 (settable) 地址和搜索栏, Value: github.com',
        '    11 按钮 安装 GitHub',
        '    16 弹出式按钮 AdBlock',
        '    25 HTML 内容 GitHub',
        '        34 link Code, Value: github.com/repo',
        '        39 文本 Type',
        '        56 link Issues, Value: github.com/repo/issues',
        '    89 组合框 (settable) Go to file',
        '    90 标题 Add file',
        '    91 文本 Add file',
      ].join('\n'),
    });

    expect(snapshot.elements.map((element) => element.nodeId)).toEqual(['10', '11', '16', '34', '56', '89']);
    expect(snapshot.elements.find((element) => element.nodeId === '10')).toMatchObject({
      role: 'textbox',
      operations: ['TYPE_TEXT'],
    });
    expect(snapshot.elements.find((element) => element.nodeId === '89')).toMatchObject({
      role: 'combobox',
      operations: ['TYPE_TEXT'],
    });
    expect(snapshot.elements.find((element) => element.nodeId === '34')).toMatchObject({
      role: 'link',
      operations: ['CLICK'],
    });
    expect(snapshot.elements.some((element) => element.nodeId === '4')).toBe(false);
    expect(snapshot.elements.some((element) => element.nodeId === '25')).toBe(false);
    expect(snapshot.elements.some((element) => element.nodeId === '91')).toBe(false);
  });

  it('bounds context and candidate count before planner input', () => {
    const lines = Array.from({ length: 400 }, (_, index) => `${index + 1} button Action ${index + 1}`);
    const snapshot = normalizeAccessibilityState({ app: 'Google Chrome', text: lines.join('\n') });

    expect(snapshot.elements.length).toBeLessThanOrEqual(250);
    expect(snapshot.text.length).toBeLessThanOrEqual(6000);
  });

  it('does not expose accessibility values to the planner', () => {
    const snapshot = normalizeAccessibilityState({
      app: 'Google Chrome',
      text: '1 textbox Password (settable), Value: super-secret-token',
    });

    expect(snapshot.text).not.toContain('super-secret-token');
    expect(snapshot.elements[0]).toMatchObject({ value: '[REDACTED]', risk: 'sensitive' });
  });
});
