import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  migrateStandaloneSkills,
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
  it('removes exact packaged standalone Skills and is idempotent', async () => {
    const homeDir = await makeTempDirectory();
    const packageRoot = process.cwd();
    for (const name of ['computer-use-ultra', 'codex-chrome-fast']) {
      const target = join(homeDir, '.codex', 'skills', name, 'SKILL.md');
      await mkdir(join(homeDir, '.codex', 'skills', name), { recursive: true });
      await writeFile(target, await readFile(join(packageRoot, 'skills', name, 'SKILL.md'), 'utf8'));
    }

    await expect(migrateStandaloneSkills({ homeDir, packageRoot })).resolves.toEqual({
      removed: ['computer-use-ultra', 'codex-chrome-fast'],
      preserved: [],
    });
    await expect(migrateStandaloneSkills({ homeDir, packageRoot })).resolves.toEqual({ removed: [], preserved: [] });
    await expect(readFile(join(homeDir, '.codex/skills/computer-use-ultra/SKILL.md'), 'utf8')).rejects.toThrow();
  });

  it('preserves customized standalone Skills but removes exact packaged copies', async () => {
    const homeDir = await makeTempDirectory();
    const packageRoot = process.cwd();
    const currentTarget = join(homeDir, '.codex', 'skills', 'computer-use-ultra', 'SKILL.md');
    const legacyTarget = join(homeDir, '.codex', 'skills', 'codex-chrome-fast', 'SKILL.md');
    await mkdir(join(homeDir, '.codex', 'skills', 'computer-use-ultra'), { recursive: true });
    await mkdir(join(homeDir, '.codex', 'skills', 'codex-chrome-fast'), { recursive: true });
    const currentSource = await readFile(join(packageRoot, 'skills/computer-use-ultra/SKILL.md'), 'utf8');
    await writeFile(currentTarget, `${currentSource}\nMy local customization.\n`);
    await writeFile(legacyTarget, await readFile(join(packageRoot, 'skills/codex-chrome-fast/SKILL.md'), 'utf8'));

    await expect(migrateStandaloneSkills({ homeDir, packageRoot })).resolves.toEqual({
      removed: ['codex-chrome-fast'],
      preserved: ['computer-use-ultra'],
    });
    await expect(readFile(currentTarget, 'utf8')).resolves.toContain('My local customization.');
    await expect(readFile(legacyTarget, 'utf8')).rejects.toThrow();
  });

  it('removes an exact Skill from the known 0.2.0 package snapshot', async () => {
    const homeDir = await makeTempDirectory();
    const packageRoot = process.cwd();
    const target = join(homeDir, '.codex', 'skills', 'computer-use-ultra', 'SKILL.md');
    await mkdir(join(homeDir, '.codex', 'skills', 'computer-use-ultra'), { recursive: true });
    await writeFile(target, await readFile(
      join(packageRoot, 'skills/migrations/v0.2.0/computer-use-ultra/SKILL.md'),
      'utf8',
    ));

    await expect(migrateStandaloneSkills({ homeDir, packageRoot })).resolves.toMatchObject({
      removed: ['computer-use-ultra'],
      preserved: [],
    });
  });

  it('treats missing standalone Skills as an empty migration', async () => {
    const homeDir = await makeTempDirectory();
    await expect(migrateStandaloneSkills({ homeDir, packageRoot: process.cwd() }))
      .resolves.toEqual({ removed: [], preserved: [] });
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
