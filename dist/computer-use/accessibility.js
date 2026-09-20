import { createHash } from 'node:crypto';
import { buildActionSpace } from '../core/action-space.js';
import { classifyRisk } from '../core/policy.js';
import { redactElement } from '../core/redaction.js';
const MAX_ELEMENTS = 250;
const MAX_TEXT = 6000;
const ROLE_SPECS = [
    { role: 'button', markers: ['弹出式按钮', '按钮', 'button', 'popup button'], operations: ['CLICK'] },
    { role: 'link', markers: ['link', '链接'], operations: ['CLICK'] },
    { role: 'tab', markers: ['tab', '标签页', '标签'], operations: ['CLICK'] },
    { role: 'menuitem', markers: ['menuitem', '菜单项'], operations: ['CLICK'] },
    { role: 'checkbox', markers: ['checkbox', '复选框'], operations: ['CLICK'] },
    { role: 'radio', markers: ['radio', '单选框', '单选按钮'], operations: ['CLICK'] },
    { role: 'switch', markers: ['switch', '开关'], operations: ['CLICK'] },
    { role: 'option', markers: ['option', '选项'], operations: ['CLICK'] },
    { role: 'textbox', markers: ['textbox', 'text field', '文本栏', '文本框'], operations: ['TYPE_TEXT'] },
    { role: 'combobox', markers: ['combobox', '组合框'], operations: ['CLICK'] },
    { role: 'spinbutton', markers: ['spinbutton', '数字调节框'], operations: ['TYPE_TEXT'] },
];
function findRole(line) {
    const lowered = line.toLocaleLowerCase();
    let best;
    for (const spec of ROLE_SPECS) {
        for (const marker of spec.markers) {
            const index = lowered.indexOf(marker.toLocaleLowerCase());
            if (index < 0 || (best && index >= best.index))
                continue;
            best = { spec, marker, index };
        }
    }
    return best;
}
function valueFromLine(line) {
    const match = line.match(/(?:,\s*)?(?:Value|值):\s*(.+)$/i);
    return match?.[1]?.trim() || undefined;
}
function labelFromLine(line, role) {
    const withoutRole = line.slice(role.index + role.marker.length)
        .replace(/^\s+/, '')
        .replace(/\((?:disabled|settable|selected|boolean|可设置|已选择|禁用)[^)]*\)/gi, '')
        .replace(/,\s*(?:Value|值):\s*.+$/i, '')
        .trim();
    return withoutRole || role.marker;
}
function isDisabled(line) {
    return /\((?:disabled|禁用)\)|\bdisabled\b|已禁用/i.test(line);
}
function operationsFor(spec, line) {
    const settable = /\((?:[^)]*\bsettable\b|[^)]*(?:可设置|可编辑))\)/i.test(line);
    if (settable && (spec.role === 'combobox' || spec.role === 'textbox' || spec.role === 'spinbutton')) {
        return ['TYPE_TEXT'];
    }
    return spec.operations;
}
function nodeFromLine(index, line, role) {
    if (isDisabled(line))
        return undefined;
    const name = labelFromLine(line, role);
    const operations = operationsFor(role.spec, line);
    if (!operations.length)
        return undefined;
    const value = valueFromLine(line);
    return {
        nodeId: index,
        role: role.spec.role,
        name,
        ...(value ? { value } : {}),
        visible: true,
        operations,
        risk: classifyRisk({ role: role.spec.role, name }),
    };
}
export function normalizeAccessibilityState(state) {
    const rawText = state.text.trim();
    const elements = [];
    const seen = new Set();
    for (const line of rawText.split(/\r?\n/)) {
        const match = line.match(/^\s*(\d+)\s+(.+)$/);
        const index = match?.[1];
        const content = match?.[2];
        if (!index || !content || seen.has(index))
            continue;
        const role = findRole(content);
        if (!role)
            continue;
        const element = nodeFromLine(index, content, role);
        if (!element)
            continue;
        seen.add(index);
        elements.push(redactElement(element));
        if (elements.length >= MAX_ELEMENTS)
            break;
    }
    const text = rawText
        .split(/\r?\n/)
        .map((line) => line.replace(/,\s*(?:Value|值):\s*.+$/i, ''))
        .join('\n')
        .slice(0, MAX_TEXT);
    const fingerprint = createHash('sha256')
        .update(JSON.stringify({ app: state.app, text, elements }))
        .digest('hex');
    return {
        snapshotId: `ax-${fingerprint.slice(0, 12)}`,
        fingerprint,
        url: `computer-use://${encodeURIComponent(state.app)}`,
        title: state.app,
        text,
        elements,
    };
}
export function buildComputerUseActionSpace(snapshot) {
    return buildActionSpace(snapshot.elements, {
        includeWait: true,
        canScrollUp: true,
        canScrollDown: true,
    });
}
//# sourceMappingURL=accessibility.js.map