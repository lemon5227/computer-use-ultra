const irreversiblePattern = /(delete|remove|erase|destroy|purchase|buy|pay|checkout|cancel account|close account|empty trash)/i;
const sensitivePattern = /(send|post|publish|login|log in|authorize|grant access|upload|share|submit|password|passcode|secret|token|api[ -]?key|credit[ -]?card|card[ -]?number|cvv|security code|verification code|one[ -]?time password|\botp\b)/i;
export function classifyRisk(input) {
    const label = `${input.role ?? ''} ${input.name ?? ''}`;
    if (irreversiblePattern.test(label))
        return 'irreversible';
    if (sensitivePattern.test(label))
        return 'sensitive';
    return 'none';
}
export function canExecute(operation, risk, approved = false) {
    if (operation === 'BLOCKED') {
        return { allowed: false, reason: 'BLOCKED_OPERATION' };
    }
    if ((risk === 'sensitive' || risk === 'irreversible') && !approved) {
        return { allowed: false, reason: 'EXPLICIT_APPROVAL_REQUIRED' };
    }
    return { allowed: true };
}
//# sourceMappingURL=policy.js.map