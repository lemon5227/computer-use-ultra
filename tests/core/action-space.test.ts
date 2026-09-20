import { describe, expect, it } from 'vitest';
import { buildActionSpace } from '../../src/core/action-space.js';
import type { ElementNode } from '../../src/core/types.js';

const elements: ElementNode[] = [
  {
    nodeId: 'pricing',
    role: 'button',
    name: 'Pricing',
    visible: true,
    operations: ['CLICK'],
    risk: 'none',
  },
  {
    nodeId: 'search',
    role: 'textbox',
    name: 'Search',
    value: '',
    visible: true,
    operations: ['TYPE_TEXT'],
    risk: 'none',
  },
  {
    nodeId: 'sort',
    role: 'combobox',
    name: 'Sort by',
    visible: true,
    operations: ['SELECT'],
    risk: 'none',
    options: [
      { id: 'sort:relevance', label: 'Relevance', value: 'relevance' },
      { id: 'sort:recent', label: 'Recent', value: 'recent', disabled: true },
    ],
  },
  {
    nodeId: 'disabled',
    role: 'button',
    name: 'Disabled',
    visible: true,
    disabled: true,
    operations: ['CLICK'],
    risk: 'none',
  },
  {
    nodeId: 'hidden',
    role: 'button',
    name: 'Hidden',
    visible: false,
    operations: ['CLICK'],
    risk: 'none',
  },
];

describe('buildActionSpace', () => {
  it('groups only compatible visible targets and keeps enabled select options', () => {
    const space = buildActionSpace(elements);

    expect(space.targets.CLICK).toHaveProperty('pricing');
    expect(space.targets.TYPE_TEXT).toHaveProperty('search');
    expect(space.targets.SELECT).toHaveProperty('sort:relevance');
    expect(space.targets.SELECT).not.toHaveProperty('sort:recent');
    expect(space.targets.CLICK).not.toHaveProperty('disabled');
    expect(space.targets.CLICK).not.toHaveProperty('hidden');
    expect(space.operations.DONE).toContain('satisfied');
    expect(space.operations.BLOCKED).toContain('supported');
  });

  it('adds bounded computer-use controls only when requested', () => {
    const space = buildActionSpace(elements, { includeWait: true, canScrollUp: true, canScrollDown: false });

    expect(space.operations.WAIT).toContain('page');
    expect(space.operations.SCROLL_UP).toContain('up');
    expect(space.operations).not.toHaveProperty('SCROLL_DOWN');
  });
});
