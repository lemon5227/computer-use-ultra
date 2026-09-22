#!/usr/bin/env node
import { access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline/promises';
import { join } from 'node:path';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { JevVercelClassifier } from './providers/jev-vercel.js';
import { loadGatewayCredential, loadPlannerMode } from './providers/gateway-auth.js';
import { createGatewayKeyWithVercelCli } from './vercel-cli.js';
import {
  detectLaya,
  installLaya,
  installPackagedSkills,
  resolvePlanner,
  type PlannerMode,
  writeGatewayCredential,
  writePlannerConfig,
} from './setup.js';

export type DoctorReportInput = {
  packageName: string;
  version: string;
  nodeVersion: string;
  credentialConfigured: boolean;
  credentialValue?: string;
  planner?: PlannerMode;
  plannerConfig?: PlannerMode;
  skillInstalled?: boolean;
  layaAvailable?: boolean;
};

export type SetupReportInput = {
  planner: PlannerMode;
  credential: 'configured' | 'missing' | 'not-selected';
  skills: string[];
  laya: 'available' | 'missing' | 'not-selected';
  credentialValue?: string;
  warning?: string;
};

export type CliArgs = {
  command: 'setup' | 'doctor' | 'help';
  planner: PlannerMode;
  apiKey?: string;
  noPrompt: boolean;
  forceCredential: boolean;
};

export type CredentialSetupChoice = 'vercel' | 'key' | 'laya';

export function formatDoctorReport(input: DoctorReportInput): string {
  return JSON.stringify({
    package: { name: input.packageName, version: input.version },
    node: input.nodeVersion,
    jev: { credential: input.credentialConfigured ? 'configured' : 'missing' },
    executor: { mode: 'bundled-computer-use', configured: true },
    ...(input.planner ? { planner: input.planner } : {}),
    ...(input.plannerConfig ? { plannerConfig: input.plannerConfig } : {}),
    ...(input.skillInstalled !== undefined ? { skill: { installed: input.skillInstalled } } : {}),
    ...(input.layaAvailable !== undefined ? { laya: { available: input.layaAvailable } } : {}),
  }, null, 2);
}

export function formatSetupReport(input: SetupReportInput): string {
  const lines = [
    'Computer Use Ultra setup complete',
    `planner: ${input.planner}`,
    `jev credential: ${input.credential}`,
    `laya: ${input.laya}`,
    `skills: ${input.skills.join(', ') || 'none'}`,
    'next: restart Codex, then ask it to operate the current Chrome tab',
  ];
  if (input.warning) lines.push(`warning: ${input.warning}`);
  return lines.join('\n');
}

export async function promptForJevKey(
  ask: (message: string) => Promise<string>,
): Promise<string | undefined> {
  const value = (await ask('Enter your Vercel AI Gateway key for Jev (press Enter to use local Laya): ')).trim();
  return value || undefined;
}

export async function promptForCredentialSetupChoice(
  ask: (message: string) => Promise<string>,
): Promise<CredentialSetupChoice> {
  const value = (await ask(
    'Set up Jev with Vercel sign-in (recommended), paste an existing Gateway key, or use local Laya? [1/2/3, default 1]: ',
  )).trim().toLocaleLowerCase();
  if (!value || value === '1' || value === 'vercel') return 'vercel';
  if (value === '2' || value === 'key') return 'key';
  if (value === '3' || value === 'laya') return 'laya';
  throw new Error('Choose 1 for Vercel sign-in, 2 to paste a Gateway key, or 3 for local Laya.');
}

export function parseCliArgs(argv: string[]): CliArgs {
  const [first, ...rest] = argv;
  const args: CliArgs = {
    command: first === 'setup' || first === 'doctor' ? first : 'help',
    planner: 'auto',
    noPrompt: false,
    forceCredential: false,
  };
  for (let index = first === 'setup' || first === 'doctor' ? 0 : -1; index >= 0 && index < rest.length; index += 1) {
    const flag = rest[index];
    if (flag === '--planner') {
      const value = rest[++index];
      if (value !== 'auto' && value !== 'jev' && value !== 'laya') throw new Error('--planner must be auto, jev, or laya');
      args.planner = value;
    } else if (flag === '--api-key') {
      const value = rest[++index];
      if (!value) throw new Error('--api-key requires a value');
      args.apiKey = value;
    } else if (flag === '--no-prompt') {
      args.noPrompt = true;
    } else if (flag === '--force-credential') {
      args.forceCredential = true;
    } else if (flag !== '--help') {
      throw new Error(`Unknown option: ${flag}`);
    }
  }
  return args;
}

function usage(): string {
  return `computer-use-ultra

Usage:
  computer-use-ultra setup [--api-key <key>] [--planner auto|jev|laya]
  computer-use-ultra doctor
  computer-use-ultra help

The Chrome executor is Codex Computer Use through node_repl and @oai/sky.
This package supplies the Jev planner and does not launch a browser itself.
`;
}

async function promptForJevKeyFromTerminal(): Promise<string | undefined> {
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await promptForJevKey((message) => readline.question(message));
  } finally {
    readline.close();
  }
}

async function promptForCredentialSetupChoiceFromTerminal(): Promise<CredentialSetupChoice> {
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await promptForCredentialSetupChoice((message) => readline.question(message));
  } finally {
    readline.close();
  }
}

async function doctor(): Promise<void> {
  const health = await new JevVercelClassifier().health();
  const planner = await loadPlannerMode();
  const laya = await detectLaya();
  const skillInstalled = await hasSkillInstalled();
  console.log(formatDoctorReport({
    packageName: 'computer-use-ultra',
    version: '0.2.0',
    nodeVersion: process.version,
    credentialConfigured: health.ok,
    planner: resolvePlanner(planner ?? 'auto', health.ok, laya.available),
    plannerConfig: planner ?? 'auto',
    skillInstalled,
    layaAvailable: laya.available,
  }));
}

async function setup(args: CliArgs): Promise<void> {
  if (Number(process.versions.node.split('.')[0]) < 22) {
    throw new Error('Computer Use Ultra requires Node.js 22 or newer');
  }
  const skills = await installPackagedSkills();
  if (args.apiKey) await writeGatewayCredential(args.apiKey, { force: args.forceCredential });

  let credential = await loadGatewayCredential();
  if (!credential && !args.apiKey && !args.noPrompt && args.planner !== 'laya' && process.stdin.isTTY && process.stdout.isTTY) {
    const choice = await promptForCredentialSetupChoiceFromTerminal();
    if (choice === 'vercel') {
      let promptedKey: string | undefined;
      let createdByVercel = false;
      try {
        promptedKey = await createGatewayKeyWithVercelCli({
          onLoginRequired: () => console.log('Vercel CLI is not signed in. Starting Vercel browser sign-in...'),
        });
        createdByVercel = true;
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        promptedKey = await promptForJevKeyFromTerminal();
      }
      if (promptedKey) {
        await writeGatewayCredential(promptedKey, { force: args.forceCredential });
        if (createdByVercel) console.log('Vercel AI Gateway key created and saved locally.');
      }
    } else if (choice === 'key') {
      const promptedKey = await promptForJevKeyFromTerminal();
      if (promptedKey) await writeGatewayCredential(promptedKey, { force: args.forceCredential });
    }
    if (choice !== 'laya') {
      credential = await loadGatewayCredential();
    }
  }
  let laya = await detectLaya();
  const shouldUseLaya = args.planner === 'laya' || (args.planner === 'auto' && !credential);
  if (shouldUseLaya && !laya.available && !args.noPrompt) {
    console.log(`No Jev key found; installing local Laya with ${laya.python}...`);
    try {
      await installLaya({ python: laya.python });
      laya = await detectLaya({ python: laya.python });
    } catch (error) {
      const message = error instanceof Error ? error.message.split('\n', 1)[0] : String(error);
      throw new Error(`Laya installation failed: ${message}`);
    }
  }
  const planner = resolvePlanner(args.planner, Boolean(credential), laya.available);
  if (planner === 'jev' && !credential) {
    throw new Error('No Jev/Gateway key found. Pass --api-key or run setup without --planner jev to use local Laya.');
  }
  if (planner === 'laya' && !laya.available) {
    throw new Error(`No Jev key found and Laya is unavailable. Install it with: ${laya.python} -m pip install laya`);
  }
  await writePlannerConfig(args.planner === 'auto' ? 'auto' : planner);
  console.log(formatSetupReport({
    planner,
    credential: credential ? 'configured' : 'missing',
    skills: skills.installed,
    laya: planner === 'laya' ? 'available' : 'not-selected',
  }));
}

async function hasSkillInstalled(): Promise<boolean> {
  try {
    await access(join(homedir(), '.codex', 'skills', 'computer-use-ultra', 'SKILL.md'));
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.command === 'doctor') return doctor();
  if (args.command === 'setup') return setup(args);
  console.log(usage());
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
