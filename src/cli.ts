#!/usr/bin/env node
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { JevVercelClassifier } from './providers/jev-vercel.js';

export type DoctorReportInput = {
  packageName: string;
  version: string;
  nodeVersion: string;
  credentialConfigured: boolean;
  credentialValue?: string;
};

export function formatDoctorReport(input: DoctorReportInput): string {
  return JSON.stringify({
    package: { name: input.packageName, version: input.version },
    node: input.nodeVersion,
    jev: { credential: input.credentialConfigured ? 'configured' : 'missing' },
    executor: { mode: 'bundled-computer-use', configured: true },
  }, null, 2);
}

function usage(): string {
  return `computer-use-ultra

Usage:
  computer-use-ultra doctor
  computer-use-ultra help

The Chrome executor is Codex Computer Use through node_repl and @oai/sky.
This package supplies the Jev planner and does not launch a browser itself.
`;
}

async function doctor(): Promise<void> {
  const health = await new JevVercelClassifier().health();
  console.log(formatDoctorReport({
    packageName: 'computer-use-ultra',
    version: '0.1.0',
    nodeVersion: process.version,
    credentialConfigured: health.ok,
  }));
}

async function main(): Promise<void> {
  const [command = 'help'] = process.argv.slice(2);
  if (command === 'doctor') return doctor();
  console.log(usage());
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
