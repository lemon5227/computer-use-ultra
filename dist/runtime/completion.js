function normalize(value) {
    return value
        .toLocaleLowerCase()
        .normalize('NFKC')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}
export function verifyCompletion(goal, snapshot) {
    const expected = normalize(goal);
    if (!expected)
        return { complete: false, reason: 'empty goal' };
    const observed = normalize([
        snapshot.text,
        snapshot.title,
        ...snapshot.elements.map((element) => `${element.name} ${element.value ?? ''}`),
    ].join(' '));
    return observed.includes(expected)
        ? { complete: true, reason: 'goal text found in page state' }
        : { complete: false, reason: 'goal text not found in page state' };
}
//# sourceMappingURL=completion.js.map