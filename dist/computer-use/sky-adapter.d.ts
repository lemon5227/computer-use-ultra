import type { SkyAppState } from './accessibility.js';
export type SkyWindow = {
    app: string;
    id: number;
    title?: string;
};
export type LegacySkyApi = {
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
export type Window2SkyApi = {
    list_apps(): Promise<Array<{
        id: string;
        displayName?: string;
        windows: SkyWindow[];
    }>>;
    get_window?(window: SkyWindow): Promise<SkyWindow>;
    get_window_state(args: {
        window: SkyWindow;
        include_screenshot?: boolean;
        include_text?: boolean;
    }): Promise<{
        window: SkyWindow;
        accessibility: {
            tree: string;
        } | null;
    }>;
    click(args: {
        window: SkyWindow;
        element_index: number;
    }): Promise<void>;
    set_value(args: {
        window: SkyWindow;
        element_index: number;
        value: string;
    }): Promise<void>;
    type_text(args: {
        window: SkyWindow;
        text: string;
    }): Promise<void>;
    press_key(args: {
        window: SkyWindow;
        key: string;
    }): Promise<void>;
};
export type SkyApi = LegacySkyApi | Window2SkyApi;
export type SkyAdapter = {
    observe(): Promise<SkyAppState>;
    click(elementIndex: number): Promise<void>;
    setValue(elementIndex: number, value: string): Promise<void>;
    typeText(value: string): Promise<void>;
    pressKey(key: string): Promise<void>;
    scroll(direction: 'up' | 'down', pages?: number): Promise<void>;
};
export type SkyAdapterOptions = {
    window?: SkyWindow;
};
export declare function createSkyAdapter(sky: SkyApi, app?: string, options?: SkyAdapterOptions): SkyAdapter;
//# sourceMappingURL=sky-adapter.d.ts.map