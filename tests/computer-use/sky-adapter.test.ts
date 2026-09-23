import { describe, expect, it, vi } from 'vitest';
import {
  createSkyAdapter,
  type SkyApi,
  type SkyWindow,
  type Window2SkyApi,
} from '../../src/computer-use/sky-adapter.js';

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

  it('maps the Windows Window2 API to the runner without capturing screenshots', async () => {
    const discoveredWindow: SkyWindow = { app: 'chrome.exe', id: 41, title: 'Initial title' };
    const canonicalWindow: SkyWindow = { app: 'chrome.exe', id: 41, title: 'Current tab' };
    const sky: Window2SkyApi = {
      list_apps: vi.fn(async () => [{
        id: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        displayName: 'Google Chrome',
        windows: [discoveredWindow],
      }]),
      get_window: vi.fn(async () => canonicalWindow),
      get_window_state: vi.fn(async () => ({
        window: canonicalWindow,
        accessibility: { tree: 'Window: "Current tab", App: chrome.exe\n1 button Home' },
      })),
      click: vi.fn(async () => {}),
      set_value: vi.fn(async () => {}),
      type_text: vi.fn(async () => {}),
      press_key: vi.fn(async () => {}),
    };
    const adapter = createSkyAdapter(sky, 'Google Chrome');

    await expect(adapter.observe()).resolves.toEqual({
      app: 'Google Chrome',
      text: 'Window: "Current tab", App: chrome.exe\n1 button Home',
    });
    await adapter.click(1);
    await adapter.setValue(2, 'laptops');
    await adapter.typeText('search');
    await adapter.pressKey('Return');
    await adapter.scroll('down', 2);

    expect(sky.get_window).toHaveBeenCalledWith(discoveredWindow);
    expect(sky.get_window_state).toHaveBeenCalledWith({
      window: canonicalWindow,
      include_screenshot: false,
      include_text: true,
    });
    expect(sky.click).toHaveBeenCalledWith({ window: canonicalWindow, element_index: 1 });
    expect(sky.set_value).toHaveBeenCalledWith({ window: canonicalWindow, element_index: 2, value: 'laptops' });
    expect(sky.type_text).toHaveBeenCalledWith({ window: canonicalWindow, text: 'search' });
    expect(sky.press_key).toHaveBeenNthCalledWith(1, { window: canonicalWindow, key: 'Return' });
    expect(sky.press_key).toHaveBeenNthCalledWith(2, { window: canonicalWindow, key: 'Page_Down' });
    expect(sky.press_key).toHaveBeenNthCalledWith(3, { window: canonicalWindow, key: 'Page_Down' });
  });

  it('requires an explicit Window2 target when Chrome has multiple open windows', async () => {
    const windows: SkyWindow[] = [
      { app: 'chrome.exe', id: 10, title: 'First' },
      { app: 'chrome.exe', id: 11, title: 'Second' },
    ];
    const sky: Window2SkyApi = {
      list_apps: vi.fn(async () => [{ id: 'chrome.exe', displayName: 'Google Chrome', windows }]),
      get_window_state: vi.fn(async () => ({ window: windows[0]!, accessibility: { tree: '1 button Home' } })),
      click: vi.fn(async () => {}),
      set_value: vi.fn(async () => {}),
      type_text: vi.fn(async () => {}),
      press_key: vi.fn(async () => {}),
    };

    await expect(createSkyAdapter(sky).observe()).rejects.toThrow(/Multiple open Google Chrome windows/);
    expect(sky.get_window_state).not.toHaveBeenCalled();
  });

  it('uses an explicitly selected Window2 target without guessing from open windows', async () => {
    const selectedWindow: SkyWindow = { app: 'chrome.exe', id: 12, title: 'Selected' };
    const sky: Window2SkyApi = {
      list_apps: vi.fn(async () => []),
      get_window: vi.fn(async () => selectedWindow),
      get_window_state: vi.fn(async () => ({
        window: selectedWindow,
        accessibility: { tree: '1 button Continue' },
      })),
      click: vi.fn(async () => {}),
      set_value: vi.fn(async () => {}),
      type_text: vi.fn(async () => {}),
      press_key: vi.fn(async () => {}),
    };

    await expect(createSkyAdapter(sky, 'Google Chrome', { window: selectedWindow }).observe())
      .resolves.toEqual({ app: 'Google Chrome', text: '1 button Continue' });
    expect(sky.list_apps).not.toHaveBeenCalled();
    expect(sky.get_window).toHaveBeenCalledWith(selectedWindow);
  });
});
