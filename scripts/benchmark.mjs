import { performance } from 'node:perf_hooks';
import { buildComputerUseActionSpace, normalizeAccessibilityState } from '../dist/computer-use/accessibility.js';
import { AccessibilitySnapshotCache } from '../dist/computer-use/snapshot-cache.js';
import { buildActionSpace } from '../dist/core/action-space.js';
import { buildJevComputerUseRequest, JevVercelClassifier } from '../dist/providers/jev-vercel.js';
import { summarize } from '../dist/benchmark/metrics.js';

const args = new Set(process.argv.slice(2));
const live = args.has('--live');
const requestedSamples = Number(process.argv.find((value) => value.startsWith('--samples='))?.split('=')[1] ?? 1000);
const requestedLiveSamples = Number(process.argv.find((value) => value.startsWith('--live-samples='))?.split('=')[1] ?? 3);
const samples = Number.isSafeInteger(requestedSamples) && requestedSamples > 0 ? requestedSamples : 1000;
const liveSamples = Number.isSafeInteger(requestedLiveSamples) && requestedLiveSamples > 0 ? requestedLiveSamples : 3;

function fixtureState() {
  const lines = ['0 Standard window Benchmark'];
  for (let index = 1; index <= 400; index += 1) {
    if (index % 10 === 0) {
      lines.push(`${index} textbox Search field ${index} (settable), Value: query-${index}`);
    } else if (index % 3 === 0) {
      lines.push(`${index} link Result ${index}, Value: https://example.test/result/${index}`);
    } else {
      lines.push(`${index} button Action ${index}`);
    }
  }
  return { app: 'Google Chrome', text: lines.join('\n') };
}

async function measure(fn, count, warmup = 5) {
  for (let index = 0; index < warmup; index += 1) await fn();
  const elapsed = [];
  for (let index = 0; index < count; index += 1) {
    const start = performance.now();
    await fn();
    elapsed.push(performance.now() - start);
  }
  return summarize(elapsed);
}

const state = fixtureState();
const snapshot = normalizeAccessibilityState(state);
const actionSpace = buildComputerUseActionSpace(snapshot);
const cache = new AccessibilitySnapshotCache();
cache.prepare(state);
const fakeEvaluate = async (request) => {
  const actionCriteria = request.questions.action.criteria;
  return {
    answers: {
      action: {
        type: 'choice',
        choice: 'DONE',
        probabilities: Object.fromEntries(Object.keys(actionCriteria).map((key) => [key, key === 'DONE' ? 1 : 0])),
      },
    },
  };
};
const localClassifier = new JevVercelClassifier(fakeEvaluate);

const report = {
  benchmark: 'computer-use-ultra',
  node: process.version,
  fixture: {
    sourceLines: state.text.split('\n').length,
    normalizedElements: snapshot.elements.length,
    actionOperations: Object.keys(actionSpace.operations),
  },
  offline: {
    normalizeAndBuildActionSpace: await measure(async () => {
      const next = normalizeAccessibilityState(state);
      buildComputerUseActionSpace(next);
    }, samples),
    cachePrepare: {
      uncached: await measure(async () => {
        const next = new AccessibilitySnapshotCache();
        next.prepare(state);
      }, samples),
      cached: await measure(async () => {
        cache.prepare(state);
      }, samples),
    },
    requestBuild: await measure(async () => {
      buildJevComputerUseRequest({ goal: 'Benchmark goal satisfied', snapshot, actionSpace });
    }, samples),
    jevRequestMappingWithInjectedEvaluator: await measure(async () => {
      await localClassifier.classify({ goal: 'Benchmark goal satisfied', snapshot, actionSpace });
    }, samples),
  },
};

if (live) {
  const health = await new JevVercelClassifier().health();
  if (!health.ok) throw new Error(`LIVE_JEV_CREDENTIAL_MISSING: ${health.reason}`);
  const liveClassifier = new JevVercelClassifier();
  const liveSnapshot = {
    snapshotId: 'benchmark',
    fingerprint: 'benchmark',
    url: 'computer-use://benchmark',
    title: 'Benchmark',
    text: 'Benchmark goal satisfied',
    elements: [],
  };
  report.live = {
    jevClassify: await measure(async () => {
      const result = await liveClassifier.classify({
        goal: 'Benchmark goal satisfied',
        snapshot: liveSnapshot,
        actionSpace: buildActionSpace([]),
      });
      if (result.operation !== 'DONE' || !result.shouldStop) throw new Error('LIVE_JEV_UNEXPECTED_DECISION');
    }, liveSamples, 0),
  };
}

console.log(JSON.stringify(report, null, 2));
