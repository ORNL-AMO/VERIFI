---
name: validate-web-and-electron
description: Select and run VERIFI tests, builds, and focused manual checks across browser and Electron targets. Use before handing off changes, when a task crosses runtime boundaries, or when deciding whether Vitest, Playwright/Chromium, web builds, Electron builds, or desktop checks are required.
---

# Validate web and Electron behavior

1. Read [what a change requires](../../../docs/testing.md#what-a-change-requires), [commands and CI](../../../docs/testing.md#commands-and-ci), [Web and Electron boundary](../../../ARCHITECTURE.md#web-and-electron-boundary), [tests, builds, and delivery](../../../ARCHITECTURE.md#tests-builds-and-delivery), and the [Reviewer](../../../docs/agents/personas.md#reviewer) and [Test Engineer](../../../docs/agents/personas.md#test-engineer) modes.
2. Run `npm run validate:agent -- --mode plan` to classify the current diff, or pass explicit files when validating a narrower change. Use the output as the default command plan and adjust only when the diff has risk the helper cannot see.
3. Run the smallest useful focused check while iterating. Before handoff, run the selected risk-based matrix, not the largest available matrix by habit.

## Command matrix

| Change | Required validation |
| --- | --- |
| Ordinary logic or Angular behavior | Focused affected `*.spec.ts` first; use `npm run test:ci` when the touched behavior is broad or there is no reliable narrower suite |
| TypeScript or app source changes | `npx tsc -p tsconfig.app.json --noEmit` |
| Production Angular UI, routing, modules, templates, or styles | `npm run build-prod` |
| IndexedDB, Web Worker, File API, or native browser behavior | `npm run test:browser:ci` in addition to fast tests |
| Explicit pre-PR or release gate | `npm run test:all:ci` plus production builds selected by the changed runtime boundaries |
| Informational calculation, IndexedDB, and Worker coverage | `npm run test:coverage` when coverage evidence is requested; never treat it as a required gate |
| Electron preload, IPC, filesystem, dialog, shell, updater, Electron environment/config, or explicit desktop release behavior | `npm run build-prod-electron` in addition to relevant fast/web checks, plus a focused manual desktop check for OS integration |

Install Chromium with `npx playwright install chromium` only when the local browser dependency is missing. Do not use `npm run lint` as a gate while it points to the unavailable TSLint builder.

## Helper script

- Use `npm run validate:agent -- --mode plan` for an advisory plan based on changed files from `git diff --name-only HEAD` plus untracked files.
- Use `npm run validate:agent -- --mode plan -- <files...>` or pass file paths directly to classify a narrower set.
- Use `npm run validate:agent -- --mode run` only when the selected commands are appropriate for the current task; it executes the commands it prints and stops at the first failure.
- The helper is a starting point. Add a broader suite only for explicit pre-PR/release requests or concrete risk not represented in the file paths.

## Manual checks

- Exercise the changed happy path and its loading, empty, validation, error, disabled, and success states.
- Check browser behavior without `window.electronAPI`.
- For Electron-boundary changes, verify channel allowlists, request and response payloads, listener cleanup, cancellation, and error handling.
- Check responsive layout, keyboard use, focus, charts, printing, and generated files when relevant.

## Failure handling

- Capture the failing command and first actionable error.
- If an Angular test or build exits with code `134` after only Browserslist/browser-support warnings and no actionable test or compiler failure, treat it as a likely sandbox/runtime abort. Do not repeat the same sandbox command more than once; request approval to retry that exact validation outside the sandbox and report the classification.
- Determine whether the failure is introduced by the diff, pre-existing, or environment-specific; do not dismiss it without evidence.
- Fix in-scope regressions and rerun the failed check followed by its parent gate.
- Report checks that cannot run and the exact missing dependency or environment.

Complete with a validation table listing each command or manual scenario, its result, and any remaining gap.
