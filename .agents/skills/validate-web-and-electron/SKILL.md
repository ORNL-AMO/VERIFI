---
name: validate-web-and-electron
description: Select and run VERIFI tests, builds, and focused manual checks across browser and Electron targets. Use before handing off changes, when a task crosses runtime boundaries, or when deciding whether Vitest, Playwright/Chromium, web builds, Electron builds, or desktop checks are required.
---

# Validate web and Electron behavior

1. Read [what a change requires](../../../docs/testing.md#what-a-change-requires), [commands and CI](../../../docs/testing.md#commands-and-ci), [Web and Electron boundary](../../../ARCHITECTURE.md#web-and-electron-boundary), [tests, builds, and delivery](../../../ARCHITECTURE.md#tests-builds-and-delivery), and the [Reviewer](../../../docs/agents/personas.md#reviewer) and [Test Engineer](../../../docs/agents/personas.md#test-engineer) modes.
2. Run `npm run validate:agent -- --mode plan` to classify the current diff. When the work is a narrow follow-up inside a larger dirty diff, pass the files changed for that follow-up explicitly so unrelated pending route, template, or style files do not inflate the validation matrix. Use the output as the default command plan and adjust only when the diff has risk the helper cannot see.
3. Run the smallest useful focused check while iterating. Before handoff, run the selected risk-based matrix, not the largest available matrix by habit.

## Policy and commands

The [testing guide](../../../docs/testing.md#pull-request-policy) owns validation requirements; [commands and CI](../../../docs/testing.md#commands-and-ci) lists test commands, while `package.json` and `angular.json` define executable targets. Keep routine checks focused, use the full test gate for explicit pre-PR/release work, and select Electron checks for its runtime boundaries. Styling/prose changes do not justify artificial tests or unrelated builds. Documentation tooling changes require their own executable tests.

Install Chromium with `npx playwright install chromium` only when missing. Do not use the unavailable TSLint target as a gate.

## Helper script

- Use `npm run validate:agent -- --mode plan` for an advisory plan based on changed files from `git diff --name-only HEAD` plus untracked files.
- Use `npm run validate:agent -- --mode plan -- <files...>` or pass file paths directly to classify a narrower set, especially for small corrections made after a larger implementation diff.
- Use `npm run validate:agent -- --mode run` only when the selected commands are appropriate for the current task; it executes the commands it prints and stops at the first failure.
- The helper is a starting point. Add a broader suite only for explicit pre-PR/release requests or concrete risk not represented in the file paths.

## Release pipeline changes

Read the [release process](../../../docs/release-process.md) and inspect the caller plus affected reusable workflows. Preserve version/release ordering, immutable commit/artifact identity, required desktop-before-web publication, signing, and production concurrency. Validate actual workflow syntax and commands; use the testing policy for runtime gates.

## Manual checks

- Exercise the changed happy path and its loading, empty, validation, error, disabled, and success states.
- Check browser behavior without `window.electronAPI`.
- For Electron-boundary changes, verify channel allowlists, request and response payloads, listener cleanup, cancellation, and error handling.
- Check responsive layout, keyboard use, focus, charts, printing, and generated files when relevant.

## Failure handling

- Capture the failing command and first actionable error.
- If an Angular test or build exits with code `134` after only Browserslist/browser-support warnings and no actionable test or compiler failure, treat it as a likely sandbox/runtime abort. Do not repeat the same sandbox command more than once for the same checkout. For later narrow fixes, cite the known abort instead of rerunning `build-prod` unless the user asks for release validation or the new change affects build configuration, route/module compilation, environment files, or production-only behavior.
- Determine whether the failure is introduced by the diff, pre-existing, or environment-specific; do not dismiss it without evidence.
- Fix in-scope regressions and rerun the failed check followed by its parent gate.
- Report checks that cannot run and the exact missing dependency or environment.

Complete with a validation table listing each command or manual scenario, its result, and any remaining gap.
