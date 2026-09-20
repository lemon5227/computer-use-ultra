import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('codex-chrome-fast skill contract', () => {
  it('documents the Jev planner and bundled Computer Use executor boundary', async () => {
    const content = await readFile(new URL('../../skills/codex-chrome-fast/SKILL.md', import.meta.url), 'utf8');
    for (const skillContent of [content]) {
      expect(skillContent).toContain('current Chrome');
      expect(skillContent).toContain('one Jev decision per cycle');
      expect(skillContent).toContain('no screenshot in the hot path');
      expect(skillContent).toContain('aggregate metrics');
      expect(skillContent).toContain('Playwright');
      expect(skillContent).not.toContain('launch Browser Harness');
      expect(skillContent).not.toContain('start a second browser');
    }
    expect(content).toMatch(/^---\nname: codex-chrome-fast\ndescription: Use when/m);
    expect(content).toContain('node_repl');
    expect(content).toContain('@oai/sky');
    expect(content).toContain('Jev');
    expect(content).toContain('Accessibility Tree');
    expect(content).toContain('Playwright');
    expect(content).not.toContain('chrome_fast_run');
    expect(content).toContain('confirmation');
    expect(content).toContain('AI_GATEWAY_API_KEY');
  });

  it('exposes the Computer Use Ultra distribution identity', async () => {
    const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { name?: string; bin?: Record<string, string> };
    const publicSkill = await readFile(new URL('../../skills/computer-use-ultra/SKILL.md', import.meta.url), 'utf8');
    const readme = await readFile(new URL('../../README.md', import.meta.url), 'utf8');

    expect(packageJson.name).toBe('computer-use-ultra');
    expect(packageJson.bin).toHaveProperty('computer-use-ultra');
    expect(publicSkill).toMatch(/^---\nname: computer-use-ultra\ndescription: Use when/m);
    expect(publicSkill).toContain('computer-use-ultra');
    expect(readme).toContain('npm install -g computer-use-ultra');
    expect(readme).toContain('import("computer-use-ultra")');
  });
});
