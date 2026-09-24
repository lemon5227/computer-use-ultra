import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('Codex plugin distribution', () => {
  it('publishes the plugin and repo marketplace in the npm package', async () => {
    const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as {
      files?: string[];
    };
    expect(packageJson.files).toEqual(expect.arrayContaining(['plugins', '.agents/plugins/marketplace.json']));
  });

  it('declares a discoverable, toggleable Computer Use Ultra plugin', async () => {
    const plugin = JSON.parse(await readFile(
      join(root, 'plugins/computer-use-ultra/.codex-plugin/plugin.json'),
      'utf8',
    )) as { name?: string; version?: string; skills?: string; interface?: { displayName?: string } };
    const marketplace = JSON.parse(await readFile(join(root, '.agents/plugins/marketplace.json'), 'utf8')) as {
      name?: string;
      plugins?: Array<{ name?: string; source?: { path?: string } }>;
    };

    expect(plugin).toMatchObject({
      name: 'computer-use-ultra',
      interface: { displayName: 'Computer Use Ultra' },
    });
    expect(marketplace.name).toBe('computer-use-ultra');
    expect(marketplace.plugins).toContainEqual(expect.objectContaining({
      name: 'computer-use-ultra',
      source: expect.objectContaining({ path: './plugins/computer-use-ultra' }),
    }));
  });

  it('keeps the plugin Skill byte-for-byte aligned with the canonical Skill', async () => {
    const canonical = await readFile(join(root, 'skills/computer-use-ultra/SKILL.md'), 'utf8');
    const pluginSkill = await readFile(
      join(root, 'plugins/computer-use-ultra/skills/computer-use-ultra/SKILL.md'),
      'utf8',
    );
    expect(pluginSkill).toBe(canonical);
  });
});
