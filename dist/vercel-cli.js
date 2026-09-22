import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);
const VERCEL_NPX_ARGS = ['--yes', 'vercel@latest'];
const ANSI_ESCAPE = /\u001b\[[0-?]*[ -/]*[@-~]/gu;
const API_KEY_LINE = /^[A-Za-z0-9._~+/=-]{20,}$/u;
async function captureVercel(args) {
    const { stdout } = await execFileAsync('npx', [...VERCEL_NPX_ARGS, ...args], {
        encoding: 'utf8',
        timeout: 120_000,
        maxBuffer: 1024 * 1024,
    });
    return stdout;
}
function runInteractiveVercel(args) {
    return new Promise((resolve, reject) => {
        const child = spawn('npx', [...VERCEL_NPX_ARGS, ...args], { stdio: 'inherit' });
        child.once('error', reject);
        child.once('close', (code, signal) => {
            if (code === 0)
                resolve();
            else
                reject(new Error(`Vercel CLI exited with ${signal ? `signal ${signal}` : `status ${code ?? 'unknown'}`}`));
        });
    });
}
export function extractGatewayApiKey(output) {
    return output
        .replace(ANSI_ESCAPE, '')
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .find((line) => API_KEY_LINE.test(line));
}
export async function createGatewayKeyWithVercelCli(options = {}) {
    const capture = options.capture ?? captureVercel;
    const interactive = options.interactive ?? runInteractiveVercel;
    let loggedIn = false;
    try {
        await capture(['whoami']);
        loggedIn = true;
    }
    catch {
        // A failed `whoami` means Vercel needs an interactive sign-in before key creation.
    }
    if (!loggedIn) {
        options.onLoginRequired?.();
        await interactive(['login']);
        await capture(['whoami']);
    }
    let output;
    try {
        output = await capture([
            'ai-gateway', 'api-keys', 'create',
            '--name', 'computer-use-ultra',
            '--no-color',
            '--non-interactive',
        ]);
    }
    catch {
        throw new Error('Vercel could not create an AI Gateway key. Check your Vercel account and AI Gateway access, then try again.');
    }
    const key = extractGatewayApiKey(output);
    if (!key) {
        throw new Error('Vercel created no readable AI Gateway key. Check the Vercel AI Gateway API Keys page before retrying.');
    }
    return key;
}
//# sourceMappingURL=vercel-cli.js.map