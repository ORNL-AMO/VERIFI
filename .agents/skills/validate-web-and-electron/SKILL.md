---
name: validate-web-and-electron
description: Select and run VERIFI tests, builds, and focused manual checks across browser and Electron targets. Use before handing off changes, when a task crosses runtime boundaries, or when deciding whether Vitest, Playwright/Chromium, web builds, Electron builds, or desktop checks are required.
---

# Validate web and Electron behavior

1. Read [`AGENTS.md`](../../../AGENTS.md), the delivery and runtime sections of [`ARCHITECTURE.md`](../../../ARCHITECTURE.md), and the Reviewer mode in [`docs/agents/personas.md`](../../../docs/agents/personas.md).
2. Inspect the diff and classify every changed behavior:
   - Pure TypeScript, Angular service/component, pipe, or ordinary utility.
   - IndexedDB, Web Worker, File API, or another native browser dependency.
   - Shared renderer, routing, environment, file flow, or report presentation.
   - Electron preload, IPC, filesystem, shell, dialog, or updater behavior.
3. Run the smallest relevant check during iteration, then the complete required matrix before handoff.

## Command matrix

| Change | Required validation |
| --- | --- |
| Ordinary logic or Angular behavior | `npm run test:ci` |
| IndexedDB or Web Worker behavior | `npm run test:browser:ci` in addition to fast tests |
| Final test gate | `npm run test:all:ci` |
| Web behavior | `npm run build-prod` |
| Shared renderer or Electron behavior | `npm run build-prod-electron` in addition to the web build |
| Electron IPC or desktop integration | Both builds plus a focused manual desktop check |

Install Chromium with `npx playwright install chromium` only when the local browser dependency is missing. Do not use `npm run lint` as a gate while it points to the unavailable TSLint builder.

## Manual checks

- Exercise the changed happy path and its loading, empty, validation, error, disabled, and success states.
- Check browser behavior without `window.electronAPI`.
- For Electron changes, verify channel allowlists, request and response payloads, listener cleanup, cancellation, and error handling.
- Check responsive layout, keyboard use, focus, charts, printing, and generated files when relevant.

## Failure handling

- Capture the failing command and first actionable error.
- Determine whether the failure is introduced by the diff, pre-existing, or environment-specific; do not dismiss it without evidence.
- Fix in-scope regressions and rerun the failed check followed by its parent gate.
- Report checks that cannot run and the exact missing dependency or environment.

Complete with a validation table listing each command or manual scenario, its result, and any remaining gap.
