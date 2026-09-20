# Computer Use Ultra Install Flow Design

## Goal

Make the public npm package usable by a new Codex user with one copy-paste command, either one Jev/Gateway key or a local Laya planner, and no manual `cp` command for installing the Codex Skill.

## User experience

The primary documented flow is:

```bash
npm install -g computer-use-ultra && computer-use-ultra setup
```

`setup` installs the current Skill and the legacy compatibility alias, then automatically selects Jev when a Jev/Gateway credential is already configured or supplied. If no Jev credential exists, it selects local Laya and can install the Python package into a dedicated local virtual environment. The user does not need to understand planner selection: paste a Jev key to use cloud Jev, or leave it empty to use Laya. The command prints the exact next step: restart Codex and ask it to operate Chrome. Existing environment variables and credential files are reused rather than overwritten.

The command also accepts `--api-key <value>` for scripted setup, `--planner auto|jev|laya` for explicit overrides, and `--no-prompt` for CI or managed environments. The key is never printed or included in the success report. The requested planner is recorded in `~/.config/computer-use-ultra/config`; `auto` stays dynamic so adding or removing a Jev key later changes the selected planner without rerunning setup.

## Scope and boundaries

- Add a `setup` subcommand to the existing CLI.
- Install `skills/computer-use-ultra/SKILL.md` into `~/.codex/skills/computer-use-ultra/SKILL.md`.
- Install `skills/codex-chrome-fast/SKILL.md` into the matching legacy directory for existing users.
- Store a supplied key at `~/.config/computer-use-ultra/credentials` as `AI_GATEWAY_API_KEY=...` with mode `0600`.
- Add a local Laya classifier backed by a persistent JSONL Python worker, keeping the model resident between decisions.
- Add planner selection (`auto`, `jev`, or `laya`) to the public Computer Use runner and persist the resolved planner in the local config file. In `auto`, use Jev when a credential exists and otherwise use Laya.
- Preserve a configured `AI_GATEWAY_API_KEY`, `VERCEL_OIDC_TOKEN`, or existing credentials file.
- Extend `doctor` to report whether the Skill is installed, which planner is configured, whether a Jev credential is configured, and whether Laya is importable, without exposing secrets.
- Document the one-line setup, the “give this README to Codex” prompt, manual Node REPL usage for developers, and the Jev/Laya trade-off.

## Architecture

Keep filesystem, planner config, and credential operations in a small `src/setup.ts` module so they can be tested with temporary directories and injected home/config paths. Keep `src/cli.ts` as argument parsing and command orchestration. Add `src/providers/jev-laya.ts` for the TypeScript-to-Python JSONL bridge and `scripts/laya-worker.py` for the persistent Laya process. The setup result is a structured, secret-free report that can be rendered for humans and asserted in tests.

`setup` copies packaged Skill files from a path relative to the installed CLI module. The build output must include the two Skill directories, so the npm package remains self-contained after global installation.

## Error handling

- Refuse setup on Node versions below the package engine requirement with an actionable message.
- Fail clearly if a packaged Skill source is missing or cannot be written.
- Refuse to overwrite a credential file containing a different valid credential unless the user passes `--force-credential`.
- Treat a missing Jev key as the normal `auto` path to Laya; only return a non-zero error when `--planner jev` explicitly requires Jev or when both planners are unavailable.
- Report a missing Python/Laya runtime as an actionable local-planner error; do not silently fall back from an explicitly selected Laya planner to cloud Jev.
- Never log the key, its length, or its source value.

## Testing

- Unit-test skill installation into a temporary home directory, idempotent reruns, credential file mode, planner config, existing credential preservation, and secret-free reports.
- Unit-test CLI command parsing for `setup`, `--planner`, `--api-key`, `--no-prompt`, and `--force-credential`.
- Unit-test Laya request conversion and worker response conversion with a fake JSONL process; do not download model weights in the unit suite.
- Keep the existing provider and runner test suites unchanged and run the complete test suite, typecheck, build, and packaged-file check.
