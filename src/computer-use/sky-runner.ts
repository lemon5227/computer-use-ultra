import { AccessibilitySnapshotCache } from './snapshot-cache.js';
import type { SkyAdapter } from './sky-adapter.js';
import { canExecute } from '../core/policy.js';
import type { ClassificationResult, PageSnapshot } from '../core/types.js';
import type { ActionClassifier, RecentAction } from '../providers/classifier.js';
import { loadGatewayCredential, loadPlannerMode } from '../providers/gateway-auth.js';
import { LayaLocalClassifier } from '../providers/laya-local.js';
import type { PlannerMode } from '../setup.js';
import { verifyCompletion, type CompletionResult } from '../runtime/completion.js';
import { performance } from 'node:perf_hooks';

export type SkyTaskOptions = {
  goal: string;
  adapter: SkyAdapter;
  classifier?: ActionClassifier;
  planner?: PlannerMode;
  maxSteps?: number;
  approved?: boolean;
  textValue?: string | Record<string, string>;
  verifier?: (goal: string, snapshot: PageSnapshot) => CompletionResult | Promise<CompletionResult>;
};

export type SkyRunStatus = 'completed' | 'needs_confirmation' | 'blocked' | 'failed' | 'max_steps';

export type SkyRunResult = {
  status: SkyRunStatus;
  steps: number;
  metrics: SkyRunMetrics;
  reason?: string;
  lastSnapshot?: PageSnapshot;
  lastDecision?: ClassificationResult;
};

export type SkyRunMetrics = {
  observeCount: number;
  classifierCalls: number;
  cacheHits: number;
  executedActions: number;
  elapsedMs: number;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function explicitValueFor(targetId: string | null, configured: SkyTaskOptions['textValue']): string | undefined {
  if (typeof configured === 'string') return configured;
  if (targetId && configured) return configured[targetId];
  return undefined;
}

function asElementIndex(targetId: string | null): number | undefined {
  if (!targetId || !/^\d+$/.test(targetId)) return undefined;
  const value = Number(targetId);
  return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function result(
  status: SkyRunStatus,
  steps: number,
  metrics: SkyRunMetrics,
  startedAt: number,
  fields: Omit<SkyRunResult, 'status' | 'steps' | 'metrics'> = {},
): SkyRunResult {
  const updatedMetrics = { ...metrics, elapsedMs: Math.round(performance.now() - startedAt) };
  return { status, steps, metrics: updatedMetrics, ...fields };
}

async function pauseBriefly(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
}

export async function runSkyTask(options: SkyTaskOptions): Promise<SkyRunResult> {
  const startedAt = performance.now();
  const classifier = options.classifier ?? await createDefaultClassifier(options.planner);
  const verifier = options.verifier ?? verifyCompletion;
  const maxSteps = Math.max(1, Math.floor(options.maxSteps ?? 12));
  const metrics: SkyRunMetrics = {
    observeCount: 0,
    classifierCalls: 0,
    cacheHits: 0,
    executedActions: 0,
    elapsedMs: 0,
  };
  const snapshotCache = new AccessibilitySnapshotCache();
  let steps = 0;
  let noProgress = 0;
  const actionHistory: RecentAction[] = [];
  let previousRawKey: string | undefined;

  while (steps < maxSteps) {
    let rawState: Awaited<ReturnType<SkyAdapter['observe']>>;
    try {
      rawState = await options.adapter.observe();
      metrics.observeCount += 1;
    } catch (error) {
      return result('failed', steps, metrics, startedAt, { reason: `OBSERVE_FAILED: ${errorMessage(error)}` });
    }

    const rawKey = `${rawState.app}\u0000${rawState.text}`;
    if (previousRawKey === rawKey) metrics.cacheHits += 1;
    previousRawKey = rawKey;
    const prepared = snapshotCache.prepare(rawState);
    const current = prepared.snapshot;
    const actionSpace = prepared.actionSpace;
    let decision: ClassificationResult;
    try {
      metrics.classifierCalls += 1;
      decision = await classifier.classify({
        goal: options.goal,
        snapshot: current,
        actionSpace,
        history: actionHistory.slice(-10),
      });
    } catch (error) {
      return result('failed', steps, metrics, startedAt, { lastSnapshot: current, reason: `CLASSIFIER_FAILED: ${errorMessage(error)}` });
    }

    if (decision.shouldStop || decision.operation === 'DONE') {
      const completion = await verifier(options.goal, current);
      return completion.complete
        ? result('completed', steps, metrics, startedAt, { lastSnapshot: current, lastDecision: decision, reason: completion.reason })
        : result('blocked', steps, metrics, startedAt, { lastSnapshot: current, lastDecision: decision, reason: `GOAL_NOT_VERIFIED: ${completion.reason}` });
    }
    if (decision.operation === 'BLOCKED') {
      return result('blocked', steps, metrics, startedAt, { lastSnapshot: current, lastDecision: decision, reason: 'CLASSIFIER_BLOCKED' });
    }

    const target = decision.targetId
      ? actionSpace.targets[decision.operation === 'CLICK' ? 'CLICK' : 'TYPE_TEXT']?.[decision.targetId]
      : undefined;
    const policy = canExecute(decision.operation, target?.risk ?? 'none', options.approved ?? false);
    if (!policy.allowed) {
      return result('needs_confirmation', steps, metrics, startedAt, { lastSnapshot: current, lastDecision: decision, reason: policy.reason });
    }

    const elementIndex = asElementIndex(decision.targetId);
    if (['CLICK', 'TYPE_TEXT'].includes(decision.operation) && elementIndex === undefined) {
      return result('failed', steps, metrics, startedAt, { lastSnapshot: current, lastDecision: decision, reason: 'TARGET_INDEX_REQUIRED' });
    }

    if (decision.operation === 'TYPE_TEXT' && explicitValueFor(decision.targetId, options.textValue) === undefined) {
      return result('blocked', steps, metrics, startedAt, { lastSnapshot: current, lastDecision: decision, reason: 'TEXT_VALUE_REQUIRED' });
    }

    try {
      if (decision.operation === 'CLICK' && elementIndex !== undefined) {
        await options.adapter.click(elementIndex);
      } else if (decision.operation === 'TYPE_TEXT' && elementIndex !== undefined) {
        await options.adapter.setValue(elementIndex, explicitValueFor(decision.targetId, options.textValue)!);
      } else if (decision.operation === 'SCROLL_UP') {
        await options.adapter.scroll('up');
      } else if (decision.operation === 'SCROLL_DOWN') {
        await options.adapter.scroll('down');
      } else if (decision.operation === 'WAIT') {
        await pauseBriefly();
      } else {
        return result('failed', steps, metrics, startedAt, { lastSnapshot: current, lastDecision: decision, reason: 'UNSUPPORTED_OPERATION' });
      }
      metrics.executedActions += 1;
    } catch (error) {
      return result('failed', steps, metrics, startedAt, { lastSnapshot: current, lastDecision: decision, reason: `ACTION_FAILED: ${errorMessage(error)}` });
    }

    steps += 1;
    let after: PageSnapshot;
    try {
      const rawAfter = await options.adapter.observe();
      metrics.observeCount += 1;
      const rawAfterKey = `${rawAfter.app}\u0000${rawAfter.text}`;
      if (previousRawKey === rawAfterKey) metrics.cacheHits += 1;
      previousRawKey = rawAfterKey;
      after = snapshotCache.prepare(rawAfter).snapshot;
    } catch (error) {
      return result('failed', steps, metrics, startedAt, { lastSnapshot: current, lastDecision: decision, reason: `VERIFY_OBSERVE_FAILED: ${errorMessage(error)}` });
    }
    const pageChanged = after.fingerprint !== current.fingerprint;
    actionHistory.push({ operation: decision.operation, targetId: decision.targetId, pageChanged });
    actionHistory.splice(0, Math.max(0, actionHistory.length - 10));
    noProgress = !pageChanged && decision.operation !== 'WAIT' ? noProgress + 1 : 0;
    if (noProgress >= 2) {
      const completion = await verifier(options.goal, after);
      return completion.complete
        ? result('completed', steps, metrics, startedAt, { lastSnapshot: after, lastDecision: decision, reason: completion.reason })
        : result('blocked', steps, metrics, startedAt, { lastSnapshot: after, lastDecision: decision, reason: `NO_PROGRESS: ${completion.reason}` });
    }
  }

  return result('max_steps', steps, metrics, startedAt, { reason: `MAX_STEPS_REACHED: ${maxSteps}` });
}

export async function resolveRuntimePlanner(requested?: PlannerMode): Promise<'jev' | 'laya'> {
  const configured = requested ?? await loadPlannerMode() ?? 'auto';
  if (configured === 'jev' || configured === 'laya') return configured;
  return (await loadGatewayCredential()) ? 'jev' : 'laya';
}

async function createDefaultClassifier(requested?: PlannerMode): Promise<ActionClassifier> {
  const planner = await resolveRuntimePlanner(requested);
  if (planner === 'laya') return new LayaLocalClassifier();
  const { JevVercelClassifier } = await import('../providers/jev-vercel.js');
  return new JevVercelClassifier();
}

export type { SkyAdapter } from './sky-adapter.js';
