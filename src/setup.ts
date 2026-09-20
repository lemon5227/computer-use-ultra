import { execFile } from 'node:child_process';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

export type PlannerMode = 'auto' | 'jev' | 'laya';

export type SetupPaths = {
  homeDir?: string;
  configDir?: string;
  packageRoot?: string;
};

export type CommandRunner = (command: string, args: string[], options?: { timeout?: number }) => Promise<unknown>;

const execFileAsync = promisify(execFile);
const VALID_KEY = /^[A-Za-z0-9._~+/=-]+$/u;
const PLANNER_ASSIGNMENT = /^\s*COMPUTER_USE_ULTRA_PLANNER\s*=\s*(auto|jev|laya)\s*$/mu;

function defaultPackageRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '..');
}

function setupPaths(options: SetupPaths = {}): Required<SetupPaths> {
  const homeDir = options.homeDir ?? homedir();
  return {
    homeDir,
    configDir: options.configDir ?? join(homeDir, '.config', 'computer-use-ultra'),
    packageRoot: options.packageRoot ?? defaultPackageRoot(),
  };
}

function credentialPath(options: SetupPaths = {}): string {
  return join(setupPaths(options).configDir, 'credentials');
}

export function resolvePlanner(
  requested: PlannerMode,
  credentialConfigured: boolean,
  _layaAvailable: boolean,
): PlannerMode {
  if (requested !== 'auto') return requested;
  return credentialConfigured ? 'jev' : 'laya';
}

export async function readPlannerConfig(options: SetupPaths = {}): Promise<PlannerMode | undefined> {
  const content = await readOptional(join(setupPaths(options).configDir, 'config'));
  const match = content?.match(PLANNER_ASSIGNMENT);
  return match?.[1] as PlannerMode | undefined;
}

export async function writePlannerConfig(mode: PlannerMode, options: SetupPaths = {}): Promise<void> {
  const target = join(setupPaths(options).configDir, 'config');
  await mkdir(dirname(target), { recursive: true, mode: 0o700 });
  await writeFile(target, `COMPUTER_USE_ULTRA_PLANNER=${mode}\n`, { mode: 0o600 });
  await chmod(target, 0o600);
}

export async function installPackagedSkills(options: SetupPaths = {}): Promise<{ installed: string[] }> {
  const paths = setupPaths(options);
  const skillNames = ['computer-use-ultra', 'codex-chrome-fast'];
  for (const name of skillNames) {
    const source = join(paths.packageRoot, 'skills', name, 'SKILL.md');
    const target = join(paths.homeDir, '.codex', 'skills', name, 'SKILL.md');
    const content = await readFile(source, 'utf8');
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(target, content, { mode: 0o600 });
  }
  return { installed: skillNames };
}

export async function writeGatewayCredential(
  value: string,
  options: SetupPaths & { force?: boolean } = {},
): Promise<{ path: string; written: boolean }> {
  if (!value || !VALID_KEY.test(value)) throw new Error('Invalid Jev/Gateway key format');
  const target = credentialPath(options);
  const existing = await readOptional(target);
  if (existing?.trim()) {
    const existingValue = existing.match(/^\s*(?:export\s+)?AI_GATEWAY_API_KEY\s*=\s*["']?([^\s"']+)["']?\s*$/mu)?.[1];
    if (existingValue === value) return { path: target, written: false };
    if (!options.force) throw new Error(`Credential already exists at ${target}; use --force-credential to replace it`);
  }
  await mkdir(dirname(target), { recursive: true, mode: 0o700 });
  await writeFile(target, `AI_GATEWAY_API_KEY=${value}\n`, { mode: 0o600 });
  await chmod(target, 0o600);
  return { path: target, written: true };
}

export async function detectLaya(options: { python?: string } = {}): Promise<{ python: string; available: boolean; reason?: string }> {
  const python = options.python ?? 'python3';
  try {
    await execFileAsync(python, ['-c', 'import laya'], { timeout: 4000 });
    return { python, available: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message.split('\n', 1)[0] : String(error);
    return reason ? { python, available: false, reason } : { python, available: false };
  }
}

export async function installLaya(options: { python?: string; run?: CommandRunner } = {}): Promise<void> {
  const python = options.python ?? 'python3';
  const run = options.run ?? ((command, args, runOptions) => execFileAsync(command, args, runOptions));
  await run(python, ['-m', 'pip', 'install', 'laya'], { timeout: 15 * 60 * 1000 });
}

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return undefined;
  }
}
