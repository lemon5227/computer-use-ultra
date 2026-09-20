# Computer Use Ultra Install Flow Design

## Goal

Make the public npm package usable by a new Codex user with one copy-paste command, one Jev/Gateway key, and no manual `cp` command for installing the Codex Skill.

## User experience

The primary documented flow is:

```bash
npm install -g computer-use-ultra && computer-use-ultra setup
```

`setup` is interactive only when a credential is missing. It installs the current Skill and the legacy compatibility alias, writes a local credential file with restrictive permissions when the user supplies a key, and prints the exact next step: restart Codex and ask it to operate Chrome. Existing environment variables and credential files are reused rather than overwritten.

The command also accepts `--api-key <value>` for scripted setup and `--no-prompt` for CI or managed environments. The key is never printed or included in the success report.

## Scope and boundaries

- Add a `setup` subcommand to the existing CLI.
- Install `skills/computer-use-ultra/SKILL.md` into `~/.codex/skills/computer-use-ultra/SKILL.md`.
- Install `skills/codex-chrome-fast/SKILL.md` into the matching legacy directory for existing users.
- Store a supplied key at `~/.config/computer-use-ultra/credentials` as `AI_GATEWAY_API_KEY=...` with mode `0600`.
- Preserve a configured `AI_GATEWAY_API_KEY`, `VERCEL_OIDC_TOKEN`, or existing credentials file.
- Extend `doctor` to report whether the Skill is installed and whether a credential is configured, without exposing secrets.
- Document the one-line setup, the “give this README to Codex” prompt, manual Node REPL usage for developers, and the Laya limitation.
- Do not add a new model provider without a verified API contract. Laya is documented as a compatible Codex host/workflow, not silently treated as a Jev API.

## Architecture

Keep filesystem and credential operations in a small `src/setup.ts` module so they can be tested with temporary directories and injected home/config paths. Keep `src/cli.ts` as argument parsing and command orchestration. The setup result is a structured, secret-free report that can be rendered for humans and asserted in tests.

`setup` copies packaged Skill files from a path relative to the installed CLI module. The build output must include the two Skill directories, so the npm package remains self-contained after global installation.

## Error handling

- Refuse setup on Node versions below the package engine requirement with an actionable message.
- Fail clearly if a packaged Skill source is missing or cannot be written.
- Refuse to overwrite a credential file containing a different valid credential unless the user passes `--force-credential`.
- Treat a missing key as a setup warning in interactive mode and as a non-zero error with `--no-prompt`.
- Never log the key, its length, or its source value.

## Testing

- Unit-test skill installation into a temporary home directory, idempotent reruns, credential file mode, existing credential preservation, and secret-free reports.
- Unit-test CLI command parsing for `setup`, `--api-key`, `--no-prompt`, and `--force-credential`.
- Keep the existing provider and runner test suites unchanged and run the complete test suite, typecheck, build, and packaged-file check.

