import { spawn, type ChildProcess, type ChildProcessWithoutNullStreams, type SpawnOptions } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildJevComputerUseRequest } from './jev-vercel.js';
import { detectLaya } from '../setup.js';
import type {
  ActionClassifier,
  ClassificationInput,
  EvaluationRequest,
  EvaluationResponse,
  ProviderHealth,
  EvaluateFunction,
} from './classifier.js';
import { InvalidJevAnswerError } from './classifier.js';
import type { ClassificationResult, Operation } from '../core/types.js';

type LayaSpawn = (command: string, args: string[], options: SpawnOptions) => ChildProcess;

export type LayaLocalOptions = {
  python?: string;
  workerPath?: string;
  model?: string;
  spawn?: LayaSpawn;
};

type ChoiceAnswer = {
  type?: unknown;
  choice?: unknown;
  probabilities?: unknown;
  confidence?: unknown;
};

function defaultWorkerPath(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../scripts/laya-worker.py');
}

function finiteProbability(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function parseAction(action: string, allowed: Set<string>): { operation: Operation; targetId: string | null } {
  if (action === 'DONE' || action === 'BLOCKED' || action === 'WAIT' || action === 'SCROLL_UP' || action === 'SCROLL_DOWN') {
    if (!allowed.has(action)) throw new InvalidJevAnswerError(`Invalid Laya answer ${action}`);
    return { operation: action, targetId: null };
  }
  for (const operation of ['CLICK', 'TYPE_TEXT', 'SELECT'] as const) {
    const prefix = `${operation}:`;
    if (action.startsWith(prefix)) {
      const targetId = action.slice(prefix.length);
      if (allowed.has(action)) return { operation, targetId };
    }
  }
  throw new InvalidJevAnswerError(`Invalid Laya answer ${action}`);
}

function compactLayaRequest(input: ClassificationInput): EvaluationRequest {
  const request = buildJevComputerUseRequest(input);
  const action = request.questions.action;
  if (!action || action.type !== 'choice') throw new InvalidJevAnswerError('Laya requires a choice action question');
  return {
    model: 'laya',
    state: request.state,
    questions: {
      action: {
        type: 'choice',
        instructions: typeof action.instructions === 'string' ? action.instructions : JSON.stringify(action.instructions),
        criteria: Object.fromEntries(Object.entries(action.criteria).map(([key, value]) => [
          key,
          typeof value === 'string' ? value : JSON.stringify(value),
        ])),
      },
    },
  };
}

function mapAnswer(response: EvaluationResponse, request: EvaluationRequest): ClassificationResult {
  const answer = response.answers.action as ChoiceAnswer | undefined;
  const actionQuestion = request.questions.action;
  const criteria = actionQuestion && actionQuestion.type === 'choice' ? actionQuestion.criteria : {};
  const allowed = new Set(Object.keys(criteria));
  if (!answer || answer.type !== 'choice' || typeof answer.choice !== 'string') {
    throw new InvalidJevAnswerError('Invalid Laya choice answer');
  }
  const selected = parseAction(answer.choice, allowed);
  const rawProbabilities = answer.probabilities;
  const probabilities: Record<string, number> = {};
  for (const choice of allowed) {
    const value = rawProbabilities && typeof rawProbabilities === 'object'
      ? (rawProbabilities as Record<string, unknown>)[choice]
      : undefined;
    const normalized = value === undefined ? (choice === answer.choice ? 1 : 0) : value;
    if (!finiteProbability(normalized)) throw new InvalidJevAnswerError(`Invalid Laya probability for ${choice}`);
    probabilities[choice] = normalized;
  }
  const actionProbabilities = (selected.targetId && ['CLICK', 'TYPE_TEXT', 'SELECT'].includes(selected.operation))
    ? Object.fromEntries(Object.entries(probabilities)
      .filter(([key]) => key.startsWith(`${selected.operation}:`))
      .map(([key, value]) => [key.slice(selected.operation.length + 1), value]))
    : probabilities;
  const confidence = finiteProbability(answer.confidence) ? answer.confidence : undefined;
  return {
    operation: selected.operation,
    targetId: selected.targetId,
    probabilities: actionProbabilities,
    ...(confidence === undefined ? {} : { confidence }),
    shouldStop: selected.operation === 'DONE',
    shouldStopProbability: probabilities.DONE ?? 0,
  };
}

class JsonlLayaClient {
  private process: ChildProcessWithoutNullStreams | undefined;
  private buffer = '';
  private readonly pending: Array<{ resolve: (value: EvaluationResponse) => void; reject: (error: Error) => void }> = [];

  constructor(private readonly options: LayaLocalOptions = {}) {}

  evaluate(request: EvaluationRequest): Promise<EvaluationResponse> {
    const process = this.ensureProcess();
    return new Promise((resolvePromise, rejectPromise) => {
      this.pending.push({ resolve: resolvePromise, reject: rejectPromise });
      process.stdin.write(`${JSON.stringify(request)}\n`);
    });
  }

  private ensureProcess(): ChildProcessWithoutNullStreams {
    if (this.process) return this.process;
    const python = this.options.python ?? process.env.COMPUTER_USE_ULTRA_PYTHON ?? 'python3';
    const workerPath = this.options.workerPath ?? defaultWorkerPath();
    const args = [workerPath];
    if (this.options.model) args.push('--model', this.options.model);
    const spawnProcess = this.options.spawn ?? spawn;
    const child = spawnProcess(python, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    if (!child.stdin || !child.stdout) throw new Error('Laya worker requires piped stdin/stdout');
    const pipedChild = child as ChildProcessWithoutNullStreams;
    this.process = pipedChild;
    pipedChild.stdout.setEncoding('utf8');
    pipedChild.stdout.on('data', (chunk: string) => this.consume(chunk));
    pipedChild.on('error', (error) => this.failAll(error instanceof Error ? error : new Error(String(error))));
    pipedChild.on('exit', (code) => {
      if (code !== 0) this.failAll(new Error(`Laya worker exited with code ${code ?? 'unknown'}`));
      this.process = undefined;
    });
    return pipedChild;
  }

  private consume(chunk: string): void {
    this.buffer += chunk;
    let newline = this.buffer.indexOf('\n');
    while (newline >= 0) {
      const line = this.buffer.slice(0, newline);
      this.buffer = this.buffer.slice(newline + 1);
      newline = this.buffer.indexOf('\n');
      if (!line.trim()) continue;
      const pending = this.pending.shift();
      if (!pending) continue;
      try {
        const response = JSON.parse(line) as EvaluationResponse & { error?: string };
        if (response.error) pending.reject(new Error(response.error));
        else pending.resolve(response);
      } catch (error) {
        pending.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  private failAll(error: Error): void {
    while (this.pending.length) this.pending.shift()!.reject(error);
  }
}

export class LayaLocalClassifier implements ActionClassifier {
  private readonly evaluateFn: EvaluateFunction;
  private readonly python: string;

  constructor(evaluateFn?: EvaluateFunction, options: LayaLocalOptions = {}) {
    const client = new JsonlLayaClient(options);
    this.evaluateFn = evaluateFn ?? ((request) => client.evaluate(request));
    this.python = options.python ?? process.env.COMPUTER_USE_ULTRA_PYTHON ?? 'python3';
  }

  async classify(input: ClassificationInput): Promise<ClassificationResult> {
    const request = compactLayaRequest(input);
    const response = await this.evaluateFn(request);
    return mapAnswer(response, request);
  }

  async health(): Promise<ProviderHealth> {
    const health = await detectLaya({ python: this.python });
    return health.available
      ? { ok: true, provider: 'local-laya' }
      : { ok: false, provider: 'local-laya', reason: health.reason ?? 'LAYA_NOT_INSTALLED' };
  }
}

export { compactLayaRequest };
