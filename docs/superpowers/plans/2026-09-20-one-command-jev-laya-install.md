# One-Command Jev/Laya Install Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a new Codex user install Computer Use Ultra with one copy-paste command; use Jev automatically when a Jev key exists and fall back to local Laya when it does not, without manually copying Skills.

**Architecture:** Add a tested setup/config module and CLI subcommand that installs both Skill variants, detects or collects a Jev credential, resolves `auto` to Jev-or-Laya, and writes a restrictive credential file. Persist `auto` as `auto` so later key changes are picked up dynamically. Add a persistent JSONL Python worker around Laya and a TypeScript `ActionClassifier` adapter; the runner selects `auto`, `jev`, or `laya` from explicit options or the persisted config while keeping the existing Jev API intact.

**Tech Stack:** TypeScript/Node.js 22, Vitest, Python 3.8+, Laya via `pip`, JSONL over a long-lived child process, npm package files.

## Global Constraints

- Preserve the public `runJevComputerUse` API and existing Jev behavior.
- Never print, test-log, or overwrite a credential value unless `--force-credential` is explicit.
- Never silently fall back from an explicitly selected Laya planner to Jev.
- Keep the hot path screenshot-free and keep one Laya process/model resident per runner.
- Do not download Laya weights during unit tests.
- Include `skills/` and `scripts/` in the published npm package.

---

### Task 1: Add planner/config and setup filesystem primitives

**Files:**
- Create: `src/setup.ts`
- Create: `tests/setup.test.ts`
- Modify: `src/providers/gateway-auth.ts`

**Interfaces:**
- `src/setup.ts` exports `type PlannerMode = 'auto' | 'jev' | 'laya'`.
- `src/setup.ts` exports `readPlannerConfig(options?: SetupPaths): Promise<PlannerMode | undefined>`.
- `src/setup.ts` exports `resolvePlanner(requested: PlannerMode, credentialConfigured: boolean, layaAvailable: boolean): PlannerMode`.
- `src/setup.ts` exports `writePlannerConfig(mode: PlannerMode, options?: SetupPaths): Promise<void>`.
- `src/setup.ts` exports `installPackagedSkills(options?: SetupPaths): Promise<{ installed: string[] }>`.
- `src/setup.ts` exports `writeGatewayCredential(value: string, options?: SetupPaths & { force?: boolean }): Promise<{ path: string; written: boolean }>`.
- `src/setup.ts` exports `detectLaya(options?: { python?: string }): Promise<{ python: string; available: boolean; reason?: string }>`.
- `src/providers/gateway-auth.ts` exports `loadPlannerMode(cwd?: string): Promise<'auto' | 'jev' | 'laya' | undefined>` and keeps existing credential parsing behavior.

- [ ] **Step 1: Write failing tests for config, skill copying, and credential behavior**

```ts
it('installs both current and legacy Skills idempotently into an injected home', async () => {
  const result = await installPackagedSkills({ homeDir, packageRoot: repoRoot });
  expect(result.installed).toEqual(['computer-use-ultra', 'codex-chrome-fast']);
  await installPackagedSkills({ homeDir, packageRoot: repoRoot });
  expect(await readFile(join(homeDir, '.codex/skills/computer-use-ultra/SKILL.md'), 'utf8')).toContain('computer-use-ultra');
});

it('writes a 0600 credential file and preserves it without force', async () => {
  await writeGatewayCredential('key-123', { homeDir, configDir, force: false });
  expect((await stat(join(configDir, 'credentials'))).mode & 0o777).toBe(0o600);
  await expect(writeGatewayCredential('key-456', { homeDir, configDir, force: false })).rejects.toThrow(/force/i);
});

it('persists and reads the planner mode from config', async () => {
  await writePlannerConfig('laya', { configDir });
  await expect(readPlannerConfig({ configDir })).resolves.toBe('laya');
});

it('resolves auto to Jev when a credential exists and Laya otherwise', () => {
  expect(resolvePlanner('auto', true, true)).toBe('jev');
  expect(resolvePlanner('auto', false, true)).toBe('laya');
});
```

- [ ] **Step 2: Run the focused tests and verify the missing-module failure**

Run: `npm test -- tests/setup.test.ts`

Expected: FAIL because `src/setup.ts` and its exported functions do not exist.

- [ ] **Step 3: Implement the minimal filesystem/config module**

Use `fs/promises`, `homedir()` defaults, `chmod(credentialPath, 0o600)`, and an injected `packageRoot` for tests. Resolve the two packaged Skill paths relative to the installed package root and write them below `~/.codex/skills`. Store planner config as `COMPUTER_USE_ULTRA_PLANNER=<mode>` in `~/.config/computer-use-ultra/config`.

- [ ] **Step 4: Add planner config lookup to gateway auth**

Read `COMPUTER_USE_ULTRA_PLANNER` from the same config file after environment lookup, accepting only `auto`, `jev`, or `laya`; ignore malformed values.

- [ ] **Step 5: Run focused and existing auth tests**

Run: `npm test -- tests/setup.test.ts tests/providers/gateway-auth.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the filesystem/config unit**

```bash
git add src/setup.ts src/providers/gateway-auth.ts tests/setup.test.ts
git commit -m "feat: add planner setup configuration"
```

### Task 2: Add the `setup` and enhanced `doctor` CLI commands

**Files:**
- Modify: `src/cli.ts`
- Modify: `tests/cli.test.ts`
- Modify: `README.md`

**Interfaces:**
- `parseCliArgs(argv: string[]): { command: 'setup' | 'doctor' | 'help'; planner: PlannerMode; apiKey?: string; noPrompt: boolean; forceCredential: boolean }`.
- `formatSetupReport(input: SetupReportInput): string` returns a secret-free human-readable report.
- `formatDoctorReport` adds `planner`, `skill`, and `laya` fields without breaking existing fields.

- [ ] **Step 1: Write failing CLI tests**

```ts
it('parses one-command setup options without logging the key', () => {
  expect(parseCliArgs(['setup', '--planner', 'laya', '--no-prompt'])).toMatchObject({
    command: 'setup', planner: 'laya', noPrompt: true, forceCredential: false,
  });
  expect(formatSetupReport({ planner: 'jev', credential: 'configured', skills: ['computer-use-ultra'], laya: 'not-selected' }))
    .not.toContain('secret');
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- tests/cli.test.ts`

Expected: FAIL because argument parsing and setup reporting are not defined.

- [ ] **Step 3: Implement argument parsing and setup orchestration**

Support `setup`, `--planner auto|jev|laya`, `--api-key`, `--no-prompt`, and `--force-credential`. In default `auto` mode, use an existing/supplied Jev key when available; otherwise detect Laya and install or explain its local setup. An empty key input is a normal Laya fallback, not an error. Explicit `--planner jev` still requires a credential, and explicit `--planner laya` never falls back to Jev. Install Skills and config before reporting success.

- [ ] **Step 4: Extend doctor**

Report package, Node, selected planner, Jev credential state, Skill installation state, and Laya availability. Never include the credential string or its length.

- [ ] **Step 5: Update README with copy-paste onboarding**

Document:

```bash
npm install -g computer-use-ultra && computer-use-ultra setup
```

Add a block titled “给 Codex 的安装说明” that users can paste into Codex, explaining that Codex should use the installed `computer-use-ultra` Skill to operate the current Chrome tab. Explain that the setup uses Jev when a key is present; otherwise it uses Laya, which needs Python plus the local model and no cloud key.

- [ ] **Step 6: Run CLI tests, typecheck, and build**

Run: `npm test -- tests/cli.test.ts && npm run typecheck && npm run build`

Expected: PASS with `dist/cli.js` generated.

- [ ] **Step 7: Commit the CLI/docs unit**

```bash
git add src/cli.ts tests/cli.test.ts README.md
git commit -m "feat: add one-command setup and onboarding docs"
```

### Task 3: Add a persistent Laya JSONL worker

**Files:**
- Create: `scripts/laya-worker.py`
- Create: `tests/providers/laya-worker.test.ts`

**Interfaces:**
- Worker stdin accepts one JSON request per line: `{ "state": ..., "questions": { "action": { "type": "choice", "instructions": ..., "criteria": ... } } }`.
- Worker stdout emits one JSON response per request with Laya’s `{ "answers": ... }` shape or `{ "error": "..." }`.
- The worker loads a single `laya.Router()` once, then calls `router.predict(state, questions, model=...)` for every line.

- [ ] **Step 1: Write a fake-worker protocol test**

```ts
it('accepts one JSON request and returns one JSON response per line', async () => {
  const worker = spawn(process.env.PYTHON ?? 'python3', [workerPath, '--fake'], { stdio: ['pipe', 'pipe', 'pipe'] });
  worker.stdin.write(JSON.stringify({ state: { page: 'Chrome' }, questions: { action: { type: 'choice', instructions: 'choose', criteria: { DONE: 'finish' } } } }) + '\n');
  await expect(readJsonLine(worker.stdout)).resolves.toMatchObject({ answers: { action: { choice: 'DONE' } } });
  worker.kill();
});
```

- [ ] **Step 2: Run the protocol test and verify the missing worker failure**

Run: `npm test -- tests/providers/laya-worker.test.ts`

Expected: FAIL because the worker script does not exist.

- [ ] **Step 3: Implement the worker**

Use `argparse` for `--model` and `--fake`. In production import `Router`, construct it once with `max_loaded=1`, and call `predict` per input line. In fake mode return deterministic `DONE` output for protocol tests. Flush stdout after every response and write diagnostics only to stderr.

- [ ] **Step 4: Run the protocol test**

Run: `npm test -- tests/providers/laya-worker.test.ts`

Expected: PASS without importing or downloading Laya weights.

- [ ] **Step 5: Commit the worker**

```bash
git add scripts/laya-worker.py tests/providers/laya-worker.test.ts
git commit -m "feat: add persistent laya decision worker"
```

### Task 4: Add the TypeScript Laya classifier and planner selection

**Files:**
- Create: `src/providers/laya-local.ts`
- Modify: `src/computer-use/sky-runner.ts`
- Modify: `src/computer-use/node-repl-entry.ts`
- Modify: `tests/providers/jev-computer-use.test.ts`
- Create: `tests/providers/laya-local.test.ts`

**Interfaces:**
- `LayaLocalClassifier implements ActionClassifier` and accepts `{ python?: string; workerPath?: string; model?: string; spawn?: typeof spawn }` for injection.
- `runJevComputerUse` accepts `planner?: 'auto' | 'jev' | 'laya'` while remaining backwards-compatible.
- `runComputerUse` is an alias that exposes the same behavior for new docs.

- [ ] **Step 1: Write failing adapter tests**

```ts
it('converts the action space to Laya choice criteria and maps the selected action back', async () => {
  const classifier = new LayaLocalClassifier({ spawn: fakeSpawnReturning({ answers: { action: { choice: 'CLICK:42', probabilities: { 'CLICK:42': 0.9 }, confidence: 0.9 } } }) });
  await expect(classifier.classify(input)).resolves.toMatchObject({ operation: 'CLICK', targetId: '42', confidence: 0.9 });
});

it('does not silently use Jev when planner=laya', async () => {
  await expect(runJevComputerUse(fakeSky, { app: 'Google Chrome', goal: 'x', planner: 'laya' })).resolves.toMatchObject({ status: 'failed' });
});
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- tests/providers/laya-local.test.ts tests/providers/jev-computer-use.test.ts`

Expected: FAIL because the Laya adapter and planner option do not exist.

- [ ] **Step 3: Implement the persistent Node worker client**

Spawn the worker lazily on the first `classify`, queue requests one at a time, parse one JSON response per line, reject on worker exit or `{error}`, and reuse the same child process for subsequent classifications. Convert object criteria values to compact JSON strings, preserve action labels, and map Laya’s `choice`, `probabilities`, and `confidence` into `ClassificationResult` through the existing action parser.

- [ ] **Step 4: Implement planner selection in the runner**

Resolve explicit `options.planner` first, then persisted config, then `auto`. For `laya`, instantiate `LayaLocalClassifier`; for `jev`, instantiate `JevVercelClassifier`; for `auto`, choose Jev when a credential is configured and otherwise Laya. Return a clear `CLASSIFIER_FAILED` reason when neither is available.

- [ ] **Step 5: Update the public Skill**

Teach the Skill to call `runComputerUse`/`runJevComputerUse` with the configured planner and state that the user can select local Laya or cloud Jev. Keep text approval and completion verification rules unchanged.

- [ ] **Step 6: Run focused tests, typecheck, and build**

Run: `npm test -- tests/providers/laya-local.test.ts tests/providers/jev-computer-use.test.ts && npm run typecheck && npm run build`

Expected: PASS.

- [ ] **Step 7: Commit the planner unit**

```bash
git add src/providers/laya-local.ts src/computer-use/sky-runner.ts src/computer-use/node-repl-entry.ts skills/computer-use-ultra/SKILL.md tests/providers/laya-local.test.ts tests/providers/jev-computer-use.test.ts
git commit -m "feat: support local laya planner"
```

### Task 5: Package and verify the public install path

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: `tests/skills/codex-chrome-fast.test.ts`
- Create: `tests/package-files.test.ts`

**Interfaces:**
- The npm tarball contains `dist`, both Skill directories, `scripts/laya-worker.py`, README, license, and `.env.example`.
- `computer-use-ultra doctor` works after global installation without a repository checkout.

- [ ] **Step 1: Write failing package-file assertions**

```ts
it('publishes the runtime, Skills, and Laya worker', async () => {
  const files = await npmPackFileList();
  expect(files).toContain('package/dist/cli.js');
  expect(files).toContain('package/skills/computer-use-ultra/SKILL.md');
  expect(files).toContain('package/skills/codex-chrome-fast/SKILL.md');
  expect(files).toContain('package/scripts/laya-worker.py');
});
```

- [ ] **Step 2: Run the package test and verify failure if files are missing**

Run: `npm test -- tests/package-files.test.ts`

Expected: FAIL until the package file list and build output are correct.

- [ ] **Step 3: Update package scripts/files and final README examples**

Keep `scripts` in the published files, add a `prepublishOnly` build check if it does not cause recursive publish issues, and make the README’s first screen show the Jev and Laya one-line commands plus the Codex prompt block.

- [ ] **Step 4: Run the complete verification suite**

Run: `npm test && npm run typecheck && npm run build && npm pack --dry-run`

Expected: all tests pass, typecheck/build pass, and dry-run lists both Skills and the Python worker.

- [ ] **Step 5: Commit the packaging/docs verification**

```bash
git add package.json README.md tests/skills/codex-chrome-fast.test.ts tests/package-files.test.ts
git commit -m "chore: package local planner setup path"
```

### Task 6: Publish and smoke-test both setup modes

**Files:**
- Modify: `outputs/` only if a benchmark or install transcript is recorded.

- [ ] **Step 1: Run a temporary-home Jev setup smoke test**

Run: `HOME=$(mktemp -d) node dist/cli.js setup --planner jev --api-key test-key --no-prompt`

Expected: Skills and config are created under the temporary home; output says credential configured without printing `test-key`.

- [ ] **Step 2: Run a temporary-home Laya setup smoke test**

Run: `HOME=$(mktemp -d) node dist/cli.js setup --planner laya --no-prompt`

Expected: output clearly reports whether Python/Laya is available and never falls back to Jev.

- [ ] **Step 3: Update version and publish the npm package**

Run: `npm version 0.2.0 --no-git-tag-version && npm publish`

Expected: npm reports `computer-use-ultra@0.2.0` published.

- [ ] **Step 4: Verify the public install command in a clean npm prefix**

Run: `npm install --prefix "$TMP_PREFIX" computer-use-ultra@0.2.0` and invoke the installed binary with `--help`/`doctor`.

Expected: the installed binary resolves its packaged Skills and worker without the repository checkout.

- [ ] **Step 5: Commit version metadata and report the public install commands**

```bash
git add package.json package-lock.json
git commit -m "release: computer-use-ultra 0.2.0"
git push origin main
```
