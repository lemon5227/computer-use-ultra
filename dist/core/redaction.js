const sensitivePattern = /(password|passcode|secret|token|api[ -]?key|credit[ -]?card|card[ -]?number|cvv|security code|verification code|one[ -]?time password|\botp\b|ssn)/i;
export function isSensitiveLabel(label) {
    return sensitivePattern.test(label);
}
export function redactElement(element) {
    if (!isSensitiveLabel(`${element.role} ${element.name}`)) {
        return { ...element };
    }
    return {
        ...element,
        ...(element.value === undefined ? {} : { value: '[REDACTED]' }),
        ...(element.options === undefined
            ? {}
            : { options: element.options.map((option) => ({ ...option, value: '[REDACTED]' })) }),
    };
}
export function redactElements(elements) {
    return elements.map(redactElement);
}
//# sourceMappingURL=redaction.js.map