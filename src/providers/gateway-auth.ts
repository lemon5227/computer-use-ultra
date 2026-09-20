import { homedir } from 'node:os';

export type GatewayCredential = {
  value: string;
  variable: 'AI_GATEWAY_API_KEY' | 'VERCEL_OIDC_TOKEN';
};

const ALLOWED_VALUE = /^[A-Za-z0-9._~+/=-]+$/u;
const ASSIGNMENT = /^\s*(?:export\s+)?(AI_GATEWAY_API_KEY|VERCEL_OIDC_TOKEN)\s*=\s*(.*?)\s*$/u;

function cleanAssignmentValue(raw: string): string | undefined {
  const trimmed = raw.trim();
  const unquoted = (trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ? trimmed.slice(1, -1)
    : trimmed;
  return ALLOWED_VALUE.test(unquoted) ? unquoted : undefined;
}

export function parseGatewayCredentialFile(content: string): GatewayCredential | undefined {
  for (const line of content.split(/\r?\n/u)) {
    const match = line.match(ASSIGNMENT);
    if (!match) continue;
    const variable = match[1] as GatewayCredential['variable'];
    const value = match[2] ? cleanAssignmentValue(match[2]) : undefined;
    if (value) return { variable, value };
  }
  return undefined;
}

async function readText(path: string): Promise<string | undefined> {
  try {
    const fs = await import('node:fs/promises');
    return await fs.readFile(path, 'utf8');
  } catch {
    return undefined;
  }
}

export async function loadGatewayCredential(cwd = '.'): Promise<GatewayCredential | undefined> {
  const runtimeEnv = typeof process === 'undefined' ? undefined : process.env;
  for (const variable of ['AI_GATEWAY_API_KEY', 'VERCEL_OIDC_TOKEN'] as const) {
    const value = runtimeEnv?.[variable];
    if (value && ALLOWED_VALUE.test(value)) return { variable, value };
  }

  const configuredPath = runtimeEnv?.CODEX_CHROME_FAST_CREDENTIAL_FILE;
  const candidates = [
    ...(configuredPath ? [configuredPath] : []),
    `${cwd}/.env`,
    `${homedir()}/.config/computer-use-ultra/credentials`,
    `${homedir()}/.config/codex-chrome-fast/credentials`,
    `${homedir()}/.zprofile`,
    `${homedir()}/.zshrc`,
  ];
  for (const path of candidates) {
    const parsed = parseGatewayCredentialFile((await readText(path)) ?? '');
    if (parsed) return parsed;
  }
  return undefined;
}
