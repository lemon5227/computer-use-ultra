import type { SkyAppState } from './accessibility.js';

export type SkyApi = {
  get_app_state(args: { app: string; disableDiff?: boolean }): Promise<{ app: string; text: string }>;
  click(args: { app: string; element_index: number }): Promise<void>;
  set_value(args: { app: string; element_index: number; value: string }): Promise<void>;
  type_text(args: { app: string; text: string }): Promise<void>;
  press_key(args: { app: string; key: string }): Promise<void>;
  scroll(args: { app: string; element_index?: number; direction: 'up' | 'down'; pages?: number }): Promise<void>;
};

export type SkyAdapter = {
  observe(): Promise<SkyAppState>;
  click(elementIndex: number): Promise<void>;
  setValue(elementIndex: number, value: string): Promise<void>;
  typeText(value: string): Promise<void>;
  pressKey(key: string): Promise<void>;
  scroll(direction: 'up' | 'down', pages?: number): Promise<void>;
};

export function createSkyAdapter(sky: SkyApi, app = 'Google Chrome'): SkyAdapter {
  return {
    observe: async () => {
      const state = await sky.get_app_state({ app, disableDiff: true });
      return { app: state.app || app, text: state.text };
    },
    click: (elementIndex) => sky.click({ app, element_index: elementIndex }),
    setValue: (elementIndex, value) => sky.set_value({ app, element_index: elementIndex, value }),
    typeText: (value) => sky.type_text({ app, text: value }),
    pressKey: (key) => sky.press_key({ app, key }),
    scroll: (direction, pages = 1) => sky.scroll({ app, direction, pages }),
  };
}
