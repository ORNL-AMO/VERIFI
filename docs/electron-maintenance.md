# Desktop maintenance and verification

This workflow addresses [#2530](https://github.com/ORNL-AMO/VERIFI/issues/2530). The dependency pins and packaging configuration in [package.json](../package.json) are authoritative. Electron supports its [latest three stable majors](https://www.electronjs.org/docs/latest/tutorial/electron-timelines), rather than an LTS line; review its [release schedule](https://releases.electronjs.org/schedule) regularly.

## Compatibility and updater behavior

- macOS compatibility starts at 13.0; recommend a macOS version still receiving Apple security updates. Universal Intel/Apple Silicon packages remain supported. The Mac updater manifest uses Darwin kernel minimum `22.0.0`, while the application bundle uses marketing version `13.0`. These version spaces are different.
- Windows packaging remains 64-bit NSIS. Linux AppImage supports in-place updates; tarball installations use the manual download link.
- Native dialogs without an explicit default path now start in Downloads. Existing explicit backup paths are preserved.
- The app checks once after renderer readiness. Downloading is user initiated, retryable, and does not block normal work. Download completion offers **Restart and install** and **Later**. Ordinary quit never automatically installs an update.
- Restart waits for startup/migrations, uses existing editor Save/Discard/Cancel decisions, then awaits submitted workspace commands and automatic backup operations. Startup errors, backup errors, and conflicts must be resolved before installing. No database migration or profile relocation is part of this change.
- A native application-modal progress dialog blocks editing through preparation and the installer handoff. On macOS, the native updater can fetch again before quitting. The dialog remains blocking until quit or a reported failure; failure restores interaction for retry. Ordinary loading messages cannot unlock it.
- The first update from an older release still runs that release's updater, including its immediate restart after download. The new restart prompt applies after the upgraded application is installed.

## Local checks without signing credentials

Use the toolchain declared in the package manifest:

```sh
npm ci
npx --no-install install-electron --no
npx --no-install electron --version
npm run test:electron
npm run test:all:ci
npx tsc -p tsconfig.app.json --noEmit
npm run build-prod
npm run build-prod-electron
npm run dist-local -- --dir
```

`dist-local` packages for the host platform and always disables publishing. Omit `--dir` to produce the host's configured installers. It does not require certificates or a provisioning profile. macOS uses certificate-free ad-hoc signing for local launch; these packages are not notarized distribution artifacts. Production signing settings remain intact. Use an isolated test profile for desktop data checks; do not point development verification at your ordinary user data.

The fast Electron suite exercises real main/preload scripts with fake OS boundaries and tests the pinned updater's minimum-system-version comparison. Angular tests cover notifications, browser fallback, guarded restart, command draining, and automatic backup completion. These tests do not establish installer trust or actual signed auto-update compatibility.

## Signed release acceptance

Signing and notarization remain owned by the [existing release pipeline](release-process.md). They run from `master`; no signing keys are required on a developer machine. Downloading and verifying CI-signed installers does not require the private keys used to sign them.

Before publishing the draft:

1. Require successful packaging, Windows Authenticode/publisher validation, Mac universal/signature/notarization/stapling checks, and final artifact metadata verification in CI.
2. Install the signed artifacts on Windows and both Mac architectures. Check macOS 13 launch and verify an older updater on macOS 12 rejects the new Darwin minimum.
3. On isolated representative profiles, check startup, existing accounts and GUID relationships, file/folder dialogs and cancellation, bill attachments, backup/restore, exports, Workers, charts, and printing. Exercise Linux AppImage updating and tarball manual download behavior separately.

The normal GitHub feed cannot discover draft releases. After publication, test the unchanged previously released application's actual signed update path on isolated Windows and Mac profiles. Confirm final checksums, differential download or full-download fallback, restart/install behavior, and persisted data after reopening. Do not claim these release checks passed based on local unsigned packages or mocked tests.

The new controller's Download/Later/Restart/error paths are covered before release by controlled tests. Validate the complete signed new-to-new update path when a subsequent signed version is available. Recovery uses verified backups and a forward fix, not an assumed Chromium profile downgrade.

## Evaluation and deferred improvements

The previous implementation registered updater listeners on every renderer-ready message, consumed its download command once, used a private updater property, misread error-event arguments, and installed immediately on download completion. Window activation called an undefined function and popup handling used a removed event. Those defects are addressed together with IPC sender validation and listener cleanup.

Broader follow-ups remain separate: narrow macOS entitlements, Electron fuses, content-security policy, filesystem capabilities, request-header scoping, periodic/manual update checks, and a packaged desktop automation pilot. Signing infrastructure and the update provider are retained.

Dependency audit findings must be compared with the unchanged integration branch. Do not run an automatic broad dependency upgrade as part of desktop maintenance; record pre-existing findings and address them through their owning dependency work.

## Verification for #2530

Local verification on November 10, 2026, against integration commit `34bd058d4`:

| Check | Result and limitation |
| --- | --- |
| Clean `npm ci` with the configured toolchain | Passed. Electron's separate on-demand binary install and version verification passed. |
| `npm run test:all:ci` | Passed: 21 Electron/release tests, 589 Angular tests, and 53 native browser tests. |
| `npx tsc -p tsconfig.app.json --noEmit` | Passed. |
| `npm run build-prod` and `npm run build-prod-electron` | Passed, with existing browser-support/CommonJS warnings. Restricted runs initially aborted with exit 134; reruns with the required execution access passed. |
| `npm run dist-local -- --dir` and `npm run dist-local` | Passed on Apple Silicon without a certificate or provisioning profile. Generated the app, DMG, and ZIP; these are ad-hoc-signed, unnotarized development packages. |
| Local Mac signature and update metadata | `codesign --verify --deep --strict` passed for the ad-hoc app. Final artifact hashes, sizes, blockmaps, and Darwin minimum verified. Bundle minimum is 13.0. This does not establish Developer ID trust. |
| Isolated native Electron 39 → 45 profile check | Passed for a stored account GUID/name, native backup write/read round trip, sanitized backup path, and bridge subscription cleanup. Same application build and storage origin were used in both runtimes; this was not a signed production-version update. |
| Final-source native Electron 45 check | Startup, a fixture account across relaunch, backup read/write and sanitization, listener cleanup, progress, downloaded prompt, and Later passed on an isolated profile. Explicit installation was acknowledged; the native modal remained blocking after the ordinary loader closed, outside controls could not receive focus, and reported failure restored interaction. Visual inspection passed. Downloads/installers were controlled; download completion and Later did not install. |
| Workflow validation | YAML and job-dependency checks passed. `actionlint` passed excluding the existing `queue` syntax unsupported by the installed checker and the existing custom `cs` runner label. Signing shell quoting was repaired. |
| `npm audit --package-lock-only --audit-level=high` | Fails on pre-existing findings. Baseline: 17 high, 6 critical, 68 total. Upgrade: 15 high, 6 critical, 66 total. No new high/critical finding was introduced. |
| Distribution and signed update acceptance | Pending CI/release infrastructure and Windows, Linux, Intel Mac, and older-macOS verification. Production signing/notarization, live-feed legacy-to-new updates, differential-download behavior, and the wider OS feature checklist above were not executed locally. |

The native check caught and corrected a real boundary regression: Angular hash routing replaces `index.html` with the application's base directory in history. Sender validation accepts that specific directory/hash form while continuing to reject other local documents, remote documents, subframes, and windows. Regression coverage protects both forms.

Automatic saves remain queued during file validation, conflicts, and errors. Attached-file issues and failed revisions remain associated with their account GUID across switches and an empty workspace. Validated inspection or an explicit overwrite can resume a failed revision; successful writing and registration clear its write failure. Initial setup, archives, and full archive/restore confirmations share the restart barrier, including later account commands and cleanup. Setup, archive, and confirmation failures clear through successful completion for their owner; canceling a setup retry does not clear its previous failure. Persisted catalog refreshes retire issues for removed/deletion-marked accounts, while pending operations still must settle. A restore transfers its remaining confirmation work to the replacement GUID. Restart drains commands and backups until both are idle, including backups generated by the final commands.

Failed persistence commands remain blocking after settling, including on repeated restart attempts. A successful command for the same account/entity, explicit entity deletion, or catalog-confirmed account removal resolves them. Existing Save/Discard/Cancel navigation still handles unsaved drafts; a failed database operation needs successful persistence or owner removal. Delayed inspection outcomes stay with their original owner without changing another account's UI. A newer validated file inspection supersedes an older attachment request.

Successful parent deletions also resolve retained failures for descendants proven removed from the committed workspace. Unrelated failures remain blocking. Installation acknowledgment, delayed native handoff, failure recovery, and the modal's dismissal prevention have dedicated regression coverage.

Regression coverage includes retained conflicts, delayed inspection, failed-write recovery, delayed/failed archives, late failures across account switches, serialization, complete confirmation/account/final-backup sequences, disabled confirmation controls, both setup/settings callers with delayed file/registry/account operations, routed-view destruction, failed setup phases, canceled retries, and delayed dialogs after a switch. The full test suite and both renderer builds cover these final safeguards. Earlier packaging and native 39-to-45 checks predate them. The final-source Electron 45 launch verifies startup, IPC, profile relaunch, and controlled update UI; failed-save and installer fault scenarios are covered by automated tests and the release acceptance checklist, not a signed local update.
