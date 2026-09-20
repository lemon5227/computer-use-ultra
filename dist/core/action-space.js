const operationLabels = {
    CLICK: 'Click a visible compatible control.',
    TYPE_TEXT: 'Enter text into a visible editable field.',
    SELECT: 'Select an observed enabled option.',
};
export function buildActionSpace(elements, options = {}) {
    const targets = {
        CLICK: {},
        TYPE_TEXT: {},
        SELECT: {},
    };
    const visibleElements = elements.filter((element) => element.visible && !element.disabled);
    for (const element of visibleElements) {
        for (const operation of element.operations) {
            if (operation === 'CLICK' || operation === 'TYPE_TEXT') {
                targets[operation][element.nodeId] = element;
            }
            if (operation === 'SELECT') {
                for (const option of element.options ?? []) {
                    if (!option.disabled) {
                        targets.SELECT[option.id] = {
                            ...element,
                            nodeId: option.id,
                            name: `${element.name}: ${option.label}`,
                            value: option.value,
                            options: [option],
                        };
                    }
                }
            }
        }
    }
    const operations = {
        DONE: 'Every requirement is visibly satisfied.',
        BLOCKED: 'No supported operation can safely progress the task.',
    };
    for (const operation of ['CLICK', 'TYPE_TEXT', 'SELECT']) {
        if (Object.keys(targets[operation]).length > 0) {
            operations[operation] = operationLabels[operation];
        }
    }
    if (options.includeWait)
        operations.WAIT = 'Wait briefly for the page to update.';
    if (options.canScrollUp)
        operations.SCROLL_UP = 'Scroll the current view up.';
    if (options.canScrollDown)
        operations.SCROLL_DOWN = 'Scroll the current view down.';
    return { elements: visibleElements, operations, targets };
}
export function operationHasTarget(space, operation) {
    if (operation === 'CLICK' || operation === 'TYPE_TEXT' || operation === 'SELECT') {
        return Object.keys(space.targets[operation]).length > 0;
    }
    return operation === 'DONE' || operation === 'BLOCKED' || operation === 'WAIT' || operation === 'SCROLL_UP' || operation === 'SCROLL_DOWN';
}
//# sourceMappingURL=action-space.js.map