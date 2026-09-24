# Computer Use Ultra as a Codex Plugin

**Status:** Design approved by the user; awaiting written-spec review
**Date:** 2026-09-24

## Goal

Package Computer Use Ultra as a local Codex plugin so the user can enable or disable its Chrome-planning skill in Codex. When disabled, Ultra must not continue to activate through a separately installed copy of the same skill; Codex's normal Computer Use workflow remains available.

Keep planner and credential setup simple by reusing the existing `computer-use-ultra setup` flow for `auto` / Jev / Laya selection and Vercel Gateway credential configuration. The plugin's master switch is managed through Codex's plugin browser. This version does not add a custom settings page.

## Options considered

1. **Repository-distributed local plugin (recommended):** Keep the plugin source and marketplace with the existing project, so it can be tested here and distributed with the project. Codex's plugin browser controls whether its skill is active.
2. **Personal plugin only:** Put the plugin under the user's personal plugin directory. This is locally convenient but leaves the public project without the plugin packaging users need.
3. **Plugin wrapper plus existing global skill:** Add a plugin while continuing to install the same skill globally. This is rejected because turning the plugin off would not reliably turn Ultra off.

## User experience

- The repository marketplace exposes a `computer-use-ultra` plugin containing the Ultra skill.
- The user installs and toggles the plugin in Codex's plugin browser. The toggle is per local plugin and follows Codex's local-plugin behavior.
- With the plugin enabled, Codex can follow the Ultra skill and use the existing npm runtime.
- With the plugin disabled, no Ultra-specific skill should remain installed globally; Codex uses its normal Computer Use workflow.
- `computer-use-ultra setup` remains the place to select `auto`, Jev, or Laya and configure existing credentials. No custom plugin settings panel, new provider, or Cloudflare billing path is part of this work.

## Packaging and migration

- Add a Codex plugin manifest and skill under a repository-owned plugin directory, plus a repository marketplace entry that points to it.
- Include the plugin files in the npm package so the plugin source ships with the existing project distribution.
- Stop `setup` from installing duplicate global copies of the Ultra and legacy `codex-chrome-fast` skills by default. Preserve planner and credential setup behavior.
- Migrate the current user's existing generated skill copies only when each file exactly matches the known packaged version. Leave any modified or otherwise unrecognized file untouched and report that it may keep Ultra active when the plugin is disabled.
- Do not automatically enable the plugin during migration. The user should make the enable/disable choice in Codex.

## Compatibility and non-goals

- Keep the npm CLI and the Computer Use runtime API intact.
- Do not alter Codex's bundled Computer Use implementation or replace its executor.
- Do not add a custom UI, MCP server, Cloudflare provider, automatic spend/top-up behavior, or changes to the existing Jev/Laya decision policy.
- Keep `skills/computer-use-ultra/SKILL.md` as the canonical skill source for the npm package. The plugin contains a packaged copy at its required in-plugin path, and a test must enforce byte-for-byte equality so the two cannot drift. The CLI must not install either copy globally as a side effect of normal setup.

## Verification

- Validate the plugin manifest and local marketplace using the plugin-creator validator.
- Add tests for setup's no-global-skill-install behavior and safe, exact-match-only migration cleanup.
- Verify npm packaging includes the plugin manifest, skill, and marketplace metadata.
- Run the existing typecheck, unit tests, full test suite, and build.
- In Codex, verify that enabling the plugin exposes the Ultra skill and disabling it removes Ultra guidance while leaving normal Computer Use available. Do not enable the plugin automatically as part of migration.

Migration cleanup is limited to exact matches of the canonical Ultra or legacy alias skill files. Any modified or unrecognized files are preserved and reported; cleanup must never recurse beyond those exact named skill directories.
