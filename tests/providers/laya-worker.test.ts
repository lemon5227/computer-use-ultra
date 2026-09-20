import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const workerPath = join(process.cwd(), 'scripts', 'laya-worker.py');

async function readJsonLine(stream: NodeJS.ReadableStream): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const onData = (chunk: Buffer | string) => {
      buffer += chunk.toString();
      const newline = buffer.indexOf('\n');
      if (newline < 0) return;
      stream.removeListener('data', onData);
      resolve(JSON.parse(buffer.slice(0, newline)) as Record<string, unknown>);
    };
    stream.on('data', onData);
    stream.once('error', reject);
  });
}

describe('laya worker protocol', () => {
  it('accepts one JSON request and returns one JSON response per line', async () => {
    const worker = spawn(process.env.PYTHON ?? 'python3', [workerPath, '--fake'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    worker.stdin.write(JSON.stringify({
      state: { page: 'Chrome' },
      questions: { action: { type: 'choice', instructions: 'choose', criteria: { DONE: 'finish' } } },
    }) + '\n');

    await expect(readJsonLine(worker.stdout)).resolves.toMatchObject({
      answers: { action: { choice: 'DONE' } },
    });
    worker.kill();
    await once(worker, 'close');
  });
});
