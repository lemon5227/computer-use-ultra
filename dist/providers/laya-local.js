import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildJevComputerUseRequest } from './jev-vercel.js';
import { detectLaya } from '../setup.js';
import { InvalidJevAnswerError } from './classifier.js';
function defaultWorkerPath() {
    return resolve(dirname(fileURLToPath(import.meta.url)), '../../scripts/laya-worker.py');
}
function finiteProbability(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}
function parseAction(action, allowed) {
    if (action === 'DONE' || action === 'BLOCKED' || action === 'WAIT' || action === 'SCROLL_UP' || action === 'SCROLL_DOWN') {
        if (!allowed.has(action))
            throw new InvalidJevAnswerError(`Invalid Laya answer ${action}`);
        return { operation: action, targetId: null };
    }
    for (const operation of ['CLICK', 'TYPE_TEXT', 'SELECT']) {
        const prefix = `${operation}:`;
        if (action.startsWith(prefix)) {
            const targetId = action.slice(prefix.length);
            if (allowed.has(action))
                return { operation, targetId };
        }
    }
    throw new InvalidJevAnswerError(`Invalid Laya answer ${action}`);
}
function compactLayaRequest(input) {
    const request = buildJevComputerUseRequest(input);
    const action = request.questions.action;
    if (!action || action.type !== 'choice')
        throw new InvalidJevAnswerError('Laya requires a choice action question');
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
function mapAnswer(response, request) {
    const answer = response.answers.action;
    const actionQuestion = request.questions.action;
    const criteria = actionQuestion && actionQuestion.type === 'choice' ? actionQuestion.criteria : {};
    const allowed = new Set(Object.keys(criteria));
    if (!answer || answer.type !== 'choice' || typeof answer.choice !== 'string') {
        throw new InvalidJevAnswerError('Invalid Laya choice answer');
    }
    const selected = parseAction(answer.choice, allowed);
    const rawProbabilities = answer.probabilities;
    const probabilities = {};
    for (const choice of allowed) {
        const value = rawProbabilities && typeof rawProbabilities === 'object'
            ? rawProbabilities[choice]
            : undefined;
        const normalized = value === undefined ? (choice === answer.choice ? 1 : 0) : value;
        if (!finiteProbability(normalized))
            throw new InvalidJevAnswerError(`Invalid Laya probability for ${choice}`);
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
    options;
    process;
    buffer = '';
    pending = [];
    constructor(options = {}) {
        this.options = options;
    }
    evaluate(request) {
        const process = this.ensureProcess();
        return new Promise((resolvePromise, rejectPromise) => {
            this.pending.push({ resolve: resolvePromise, reject: rejectPromise });
            process.stdin.write(`${JSON.stringify(request)}\n`);
        });
    }
    ensureProcess() {
        if (this.process)
            return this.process;
        const python = this.options.python ?? process.env.COMPUTER_USE_ULTRA_PYTHON ?? 'python3';
        const workerPath = this.options.workerPath ?? defaultWorkerPath();
        const args = [workerPath];
        if (this.options.model)
            args.push('--model', this.options.model);
        const spawnProcess = this.options.spawn ?? spawn;
        const child = spawnProcess(python, args, { stdio: ['pipe', 'pipe', 'pipe'] });
        if (!child.stdin || !child.stdout)
            throw new Error('Laya worker requires piped stdin/stdout');
        const pipedChild = child;
        this.process = pipedChild;
        pipedChild.stdout.setEncoding('utf8');
        pipedChild.stdout.on('data', (chunk) => this.consume(chunk));
        pipedChild.on('error', (error) => this.failAll(error instanceof Error ? error : new Error(String(error))));
        pipedChild.on('exit', (code) => {
            if (code !== 0)
                this.failAll(new Error(`Laya worker exited with code ${code ?? 'unknown'}`));
            this.process = undefined;
        });
        return pipedChild;
    }
    consume(chunk) {
        this.buffer += chunk;
        let newline = this.buffer.indexOf('\n');
        while (newline >= 0) {
            const line = this.buffer.slice(0, newline);
            this.buffer = this.buffer.slice(newline + 1);
            newline = this.buffer.indexOf('\n');
            if (!line.trim())
                continue;
            const pending = this.pending.shift();
            if (!pending)
                continue;
            try {
                const response = JSON.parse(line);
                if (response.error)
                    pending.reject(new Error(response.error));
                else
                    pending.resolve(response);
            }
            catch (error) {
                pending.reject(error instanceof Error ? error : new Error(String(error)));
            }
        }
    }
    failAll(error) {
        while (this.pending.length)
            this.pending.shift().reject(error);
    }
}
export class LayaLocalClassifier {
    evaluateFn;
    python;
    constructor(evaluateFn, options = {}) {
        const client = new JsonlLayaClient(options);
        this.evaluateFn = evaluateFn ?? ((request) => client.evaluate(request));
        this.python = options.python ?? process.env.COMPUTER_USE_ULTRA_PYTHON ?? 'python3';
    }
    async classify(input) {
        const request = compactLayaRequest(input);
        const response = await this.evaluateFn(request);
        return mapAnswer(response, request);
    }
    async health() {
        const health = await detectLaya({ python: this.python });
        return health.available
            ? { ok: true, provider: 'local-laya' }
            : { ok: false, provider: 'local-laya', reason: health.reason ?? 'LAYA_NOT_INSTALLED' };
    }
}
export { compactLayaRequest };
//# sourceMappingURL=laya-local.js.map