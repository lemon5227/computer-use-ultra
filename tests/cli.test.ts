import { describe, expect, it } from 'vitest';
import { formatDoctorReport, formatSetupReport, parseCliArgs, promptForJevKey } from '../src/cli.js';

describe('computer-use-ultra doctor', () => {
  it('reports health without exposing the credential', () => {
    const report = formatDoctorReport({
      packageName: 'computer-use-ultra',
      version: '0.1.0',
      nodeVersion: 'v24.12.0',
      credentialConfigured: true,
      credentialValue: 'secret-value-must-not-print',
    });

    expect(report).toContain('computer-use-ultra');
    expect(report).toContain('configured');
    expect(report).not.toContain('secret-value-must-not-print');
  });

  it('reports missing credentials without failing the diagnostic', () => {
    const report = formatDoctorReport({
      packageName: 'computer-use-ultra',
      version: '0.1.0',
      nodeVersion: 'v24.12.0',
      credentialConfigured: false,
    });

    expect(report).toContain('missing');
    expect(report).toContain('bundled-computer-use');
  });
});

describe('computer-use-ultra setup', () => {
  it('accepts a pasted Jev key and treats blank input as local fallback', async () => {
    let promptText = '';
    const key = await promptForJevKey(async (message) => {
      promptText = message;
      return '  key-123  ';
    });
    expect(key).toBe('key-123');
    expect(promptText).toContain('Jev');
    await expect(promptForJevKey(async () => '   ')).resolves.toBeUndefined();
  });

  it('defaults to automatic Jev-or-Laya selection', () => {
    expect(parseCliArgs(['setup'])).toMatchObject({
      command: 'setup',
      planner: 'auto',
      noPrompt: false,
      forceCredential: false,
    });
  });

  it('parses explicit planner and non-interactive setup options', () => {
    expect(parseCliArgs(['setup', '--planner', 'laya', '--no-prompt', '--force-credential']))
      .toMatchObject({
        command: 'setup',
        planner: 'laya',
        noPrompt: true,
        forceCredential: true,
      });
  });

  it('formats a secret-free setup report', () => {
    const report = formatSetupReport({
      planner: 'jev',
      credential: 'configured',
      skills: ['computer-use-ultra'],
      laya: 'not-selected',
      credentialValue: 'secret-value-must-not-print',
    });

    expect(report).toContain('jev');
    expect(report).not.toContain('secret-value-must-not-print');
  });
});
