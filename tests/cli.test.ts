import { describe, expect, it } from 'vitest';
import { formatDoctorReport } from '../src/cli.js';

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
