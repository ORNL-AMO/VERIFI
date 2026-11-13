---
name: validate-web-and-electron
description: Select and run VERIFI tests, builds, and focused manual checks across browser and Electron targets. Use before handing off changes, when a task crosses runtime boundaries, or when deciding whether Vitest, Playwright/Chromium, web builds, Electron builds, or desktop checks are required.
---

# Validate web and Electron behavior

1. Read [what a change requires](../../../docs/testing.md#what-a-change-requires), [commands and CI](../../../docs/testing.md#commands-and-ci), [Web and Electron boundary](../../../ARCHITECTURE.md#web-and-electron-boundary), [tests, builds, and delivery](../../../ARCHITECTURE.md#tests-builds-and-delivery), and the [Reviewer](../../../docs/agents/personas.md#reviewer) and [Test Engineer](../../../docs/agents/personas.md#test-engineer) modes.
2. Inspect the diff and classify every changed behavior:
   - Pure TypeScript, Angular service/component, pipe, or ordinary utility.
   - IndexedDB, Web Worker, File API, or another native browser dependency.
   - Shared renderer, routing, environment, file flow, or report presentation.
   - Electron preload, IPC, filesystem, shell, dialog, or updater behavior.
3. Run the smallest relevant check during iteration, then the complete required matrix before handoff.

## Command matrix

| Change | Required validation |
| --- | --- |
| Documentation-only | Validate links, commands, and relevant workflow behavior under the [testing guide's documentation exception](../../../docs/testing.md#what-a-change-requires); no unrelated application suites or builds |
| Ordinary logic or Angular behavior | `npm run test:ci` |
| IndexedDB or Web Worker behavior | `npm run test:browser:ci` in addition to fast tests |
| Final code-change test gate | `npm run test:all:ci` |
| Informational calculation, IndexedDB, and Worker coverage | `npm run test:coverage` when coverage evidence is requested; never treat it as a required gate |
| Web behavior | `npm run build-prod` |
| Shared renderer or Electron behavior | `npm run build-prod-electron` in addition to the web build |
| Electron IPC or desktop integration | Both builds plus a focused manual desktop check |

Install Chromium with `npx playwright install chromium` only when the local browser dependency is missing. Do not use `npm run lint` as a gate while it points to the unavailable TSLint builder.

## Release pipeline changes

For production draft evidence or auditing, also read the [production draft audit](../../../docs/production-draft-audit.md). Validate exact uploaded asset identities/hashes against attested native manifests, immutable tag/source/run provenance, Windows checkout byte fidelity, approved historical baseline exceptions, native extraction and applicable blockmaps. Recheck the prepared release ID, tag and production flags without adopting changed API values as new expectations. Disable distribution overwrites so a publication race cannot replace existing files; conflicting rebuilt bytes require reviewed recovery of the unpublished draft. Keep read-only previews ineligible for publication. Do not enable the mandatory audit or authoritative record path before the complete real-draft trial and maintainer review; preserve the existing production web dependency and avoid rebuilding/signing during audit retries.

For desktop packaging, read the [desktop pre-release guide](../../../docs/desktop-prerelease.md), inspect the shared packaging workflow plus both production and manual callers, and run `npm run test:desktop-tooling`. Keep QA identity/feed/profile/instrumentation out of production packages. Verify retained manifest provenance, artifact expiration, and source/version ordering; packaging-only evidence never satisfies installed-app or real-update acceptance. Test reruns reuse verified packages even when later installed tests failed; baseline reuse requires a successful source run.

Read the [release process](../../../docs/release-process.md) and inspect the caller plus every affected reusable workflow. Preserve the invariants that each `master` version advances by SemVer precedence, the preceding release tag points to the preceding commit with a successful completed CI/CD run, release tags target the current run's immutable commit, and production web deployment requires the web artifact and the complete desktop release to succeed for the same workflow run. Do not assume GitHub concurrency is FIFO. Check package/lockfile consistency, normal and hotfix promotion paths, skipped-job handling on `develop`, artifact names and retention, token permissions, signing and draft-release gates, and production concurrency. Validate workflow syntax and documentation links before running the final test and build matrix.

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

## Installed-app/update harness

Use `build-and-test` or a new `test-only` dispatch against retained packages. Start with the Windows pilot; full acceptance requires every platform and scenario. Partial pilot reports never satisfy the upgrade gate. Check source/workflow SHA provenance, compatible QA instrumentation, actual native installation/updater exit/relaunch, read-only GUID/settings comparisons, and real backup failure/recovery. Keep test jobs credential-free and preserve renderer security; never substitute extracted AppImage execution, mocked updater events, or separately launching candidate B. Before publishing harness changes, record the focused tests and local pilot limitations, then require the signed baseline matrix before merging.

For required-check changes, verify the default-branch policy, candidate-SHA targeting, complete-matrix aggregation, canceled/missing evidence, shared-head PRs, and older-run ordering. Keep publisher code on trusted base/default commits with check-write permission only in reporting jobs. Register the publisher before relying on it to gate a later upgrade PR; branch pilot evidence cannot satisfy the required check.
