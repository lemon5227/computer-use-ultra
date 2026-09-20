import { describe, expect, it, vi } from 'vitest';
import { createSkyAdapter, type SkyApi } from '../../src/computer-use/sky-adapter.js';

describe('createSkyAdapter', () => {
  it('maps the bundled Sky API to the runner contract and keeps the app scoped', async () => {
    const sky: SkyApi = {
      get_app_state: vi.fn(async () => ({ app: 'Google Chrome', text: '1 button Home' })),
      click: vi.fn(async () => {}),
      set_value: vi.fn(async () => {}),
      type_text: vi.fn(async () => {}),
      press_key: vi.fn(async () => {}),
      scroll: vi.fn(async () => {}),
    };
    const adapter = createSkyAdapter(sky, 'Google Chrome');

    await expect(adapter.observe()).resolves.toEqual({ app: 'Google Chrome', text: '1 button Home' });
    await adapter.click(1);
    await adapter.setValue(2, 'laptops');
    await adapter.typeText('search');
    await adapter.pressKey('ENTER');
    await adapter.scroll('down', 2);

    expect(sky.get_app_state).toHaveBeenCalledWith({ app: 'Google Chrome', disableDiff: true });
    expect(sky.click).toHaveBeenCalledWith({ app: 'Google Chrome', element_index: 1 });
    expect(sky.set_value).toHaveBeenCalledWith({ app: 'Google Chrome', element_index: 2, value: 'laptops' });
    expect(sky.type_text).toHaveBeenCalledWith({ app: 'Google Chrome', text: 'search' });
    expect(sky.press_key).toHaveBeenCalledWith({ app: 'Google Chrome', key: 'ENTER' });
    expect(sky.scroll).toHaveBeenCalledWith({ app: 'Google Chrome', direction: 'down', pages: 2 });
  });
});
