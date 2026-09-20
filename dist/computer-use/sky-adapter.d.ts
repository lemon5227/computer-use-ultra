import type { SkyAppState } from './accessibility.js';
export type SkyApi = {
    get_app_state(args: {
        app: string;
        disableDiff?: boolean;
    }): Promise<{
        app: string;
        text: string;
    }>;
    click(args: {
        app: string;
        element_index: number;
    }): Promise<void>;
    set_value(args: {
        app: string;
        element_index: number;
        value: string;
    }): Promise<void>;
    type_text(args: {
        app: string;
        text: string;
    }): Promise<void>;
    press_key(args: {
        app: string;
        key: string;
    }): Promise<void>;
    scroll(args: {
        app: string;
        element_index?: number;
        direction: 'up' | 'down';
        pages?: number;
    }): Promise<void>;
};
export type SkyAdapter = {
    observe(): Promise<SkyAppState>;
    click(elementIndex: number): Promise<void>;
    setValue(elementIndex: number, value: string): Promise<void>;
    typeText(value: string): Promise<void>;
    pressKey(key: string): Promise<void>;
    scroll(direction: 'up' | 'down', pages?: number): Promise<void>;
};
export declare function createSkyAdapter(sky: SkyApi, app?: string): SkyAdapter;
//# sourceMappingURL=sky-adapter.d.ts.map