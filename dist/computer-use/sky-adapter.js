function isLegacySkyApi(sky) {
    return typeof sky.get_app_state === 'function';
}
function normalizeIdentifier(value) {
    return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '');
}
function matchesApp(candidate, requestedApp) {
    const requested = normalizeIdentifier(requestedApp);
    const candidateText = normalizeIdentifier(`${candidate.id} ${candidate.displayName ?? ''}`);
    if (candidateText.includes(requested))
        return true;
    return requested === 'googlechrome' && candidateText.includes('chrome');
}
function normalizedPageCount(pages) {
    return Number.isFinite(pages) ? Math.max(1, Math.trunc(pages)) : 1;
}
function createLegacySkyAdapter(sky, app) {
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
function createWindow2SkyAdapter(sky, app, initialWindow) {
    let currentWindow = initialWindow;
    let needsHydration = Boolean(initialWindow && sky.get_window);
    const resolveWindow = async () => {
        if (currentWindow) {
            if (needsHydration && sky.get_window) {
                currentWindow = await sky.get_window(currentWindow);
                needsHydration = false;
            }
            return currentWindow;
        }
        const apps = await sky.list_apps();
        const windows = apps
            .filter((candidate) => matchesApp(candidate, app))
            .flatMap((candidate) => candidate.windows);
        if (!windows.length) {
            throw new Error(`No open ${app} window was returned by Windows Computer Use`);
        }
        if (windows.length > 1) {
            throw new Error(`Multiple open ${app} windows were returned; pass the intended window to runComputerUse`);
        }
        const matchedWindow = windows[0];
        if (!matchedWindow)
            throw new Error(`No open ${app} window was returned by Windows Computer Use`);
        currentWindow = sky.get_window ? await sky.get_window(matchedWindow) : matchedWindow;
        needsHydration = false;
        return currentWindow;
    };
    return {
        observe: async () => {
            const state = await sky.get_window_state({
                window: await resolveWindow(),
                include_screenshot: false,
                include_text: true,
            });
            currentWindow = state.window;
            needsHydration = false;
            if (!state.accessibility?.tree) {
                throw new Error('Windows Computer Use returned no accessibility tree');
            }
            return { app, text: state.accessibility.tree };
        },
        click: async (elementIndex) => sky.click({ window: await resolveWindow(), element_index: elementIndex }),
        setValue: async (elementIndex, value) => sky.set_value({
            window: await resolveWindow(),
            element_index: elementIndex,
            value,
        }),
        typeText: async (value) => sky.type_text({ window: await resolveWindow(), text: value }),
        pressKey: async (key) => sky.press_key({ window: await resolveWindow(), key }),
        scroll: async (direction, pages = 1) => {
            const window = await resolveWindow();
            const key = direction === 'up' ? 'Page_Up' : 'Page_Down';
            for (let page = 0; page < normalizedPageCount(pages); page += 1) {
                await sky.press_key({ window, key });
            }
        },
    };
}
export function createSkyAdapter(sky, app = 'Google Chrome', options = {}) {
    if (isLegacySkyApi(sky))
        return createLegacySkyAdapter(sky, app);
    return createWindow2SkyAdapter(sky, app, options.window);
}
//# sourceMappingURL=sky-adapter.js.map