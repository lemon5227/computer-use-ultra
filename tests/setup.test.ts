import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  installPackagedSkills,
  installLaya,
  readPlannerConfig,
  resolvePlanner,
  writeGatewayCredential,
  writePlannerConfig,
} from '../src/setup.js';

async function makeTempDirectory(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'computer-use-ultra-'));
}

describe('setup filesystem helpers', () => {
  it('installs both current and legacy Skills idempotently into an injected home', async () => {
    const homeDir = await makeTempDirectory();
    const result = await installPackagedSkills({ homeDir, packageRoot: process.cwd() });

    expect(result.installed).toEqual(['computer-use-ultra', 'codex-chrome-fast']);
    await installPackagedSkills({ homeDir, packageRoot: process.cwd() });
    expect(await readFile(join(homeDir, '.codex/skills/computer-use-ultra/SKILL.md'), 'utf8'))
      .toContain('computer-use-ultra');
  });

  it('writes a 0600 credential file and preserves it without force', async () => {
    const homeDir = await makeTempDirectory();
    const configDir = join(homeDir, '.config', 'computer-use-ultra');

    await writeGatewayCredential('key-123', { homeDir, configDir, force: false });
    expect((await stat(join(configDir, 'credentials'))).mode & 0o777).toBe(0o600);
    await expect(writeGatewayCredential('key-456', { homeDir, configDir, force: false }))
      .rejects.toThrow(/force/i);
  });

  it('persists and reads the planner mode from config', async () => {
    const homeDir = await makeTempDirectory();
    const configDir = join(homeDir, '.config', 'computer-use-ultra');

    await writePlannerConfig('laya', { configDir });
    await expect(readPlannerConfig({ configDir })).resolves.toBe('laya');
  });

  it('resolves auto to Jev when a credential exists and Laya otherwise', () => {
    expect(resolvePlanner('auto', true, true)).toBe('jev');
    expect(resolvePlanner('auto', false, true)).toBe('laya');
  });

  it('installs Laya through the selected Python interpreter', async () => {
    let command: string[] = [];
    await installLaya({
      python: 'python-test',
      run: async (executable, args) => { command = [executable, ...args]; },
    });
    expect(command).toEqual(['python-test', '-m', 'pip', 'install', 'laya']);
  });
});
