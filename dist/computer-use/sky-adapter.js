export function createSkyAdapter(sky, app = 'Google Chrome') {
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
//# sourceMappingURL=sky-adapter.js.map