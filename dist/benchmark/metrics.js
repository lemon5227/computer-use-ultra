export function percentile(sorted, fraction) {
    if (!sorted.length)
        return 0;
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
    return sorted[index] ?? 0;
}
export function summarize(samplesMs) {
    const sorted = [...samplesMs].sort((left, right) => left - right);
    if (!sorted.length) {
        return { samples: 0, minMs: 0, p50Ms: 0, p95Ms: 0, maxMs: 0, meanMs: 0 };
    }
    const total = samplesMs.reduce((sum, value) => sum + value, 0);
    const round = (value) => Number(value.toFixed(3));
    return {
        samples: samplesMs.length,
        minMs: round(sorted[0]),
        p50Ms: round(percentile(sorted, 0.5)),
        p95Ms: round(percentile(sorted, 0.95)),
        maxMs: round(sorted.at(-1)),
        meanMs: round(total / samplesMs.length),
    };
}
//# sourceMappingURL=metrics.js.map