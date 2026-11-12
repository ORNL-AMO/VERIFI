# Desktop pre-release validation

This implements the packaging and installed-app harness for [#2586](https://github.com/ORNL-AMO/VERIFI/issues/2586). Both retain the current Electron runtime; the final stacked PR upgrades Electron. A packaging-only result is **not** installed-update acceptance. The harness also registers the trusted check publisher so it can enforce evidence before the upgrade merges.

## First rollout

1. A repository administrator configures the `desktop-qa-signing` environment with at least one maintainer reviewer and self-approval permitted. The resolver checks this configuration before building. Keep the existing Apple credentials and Windows signing runner available; private keys never belong on test runners or developer machines.
2. Merge the foundation into `develop` after its tests, builds, and reviews. GitHub requires the new manual workflow on the default branch before normal dispatch is available.
3. Run **Desktop pre-release** from `develop`, select `build-only`, and supply a candidate and an explicit baseline. For the first baseline trial, both may identify the same current source; generated QA versions remain ordered.
4. Review the resolved source commits and QA versions in the run summary, then approve signing. The initiating maintainer may approve.
5. Require the signed three-platform packaging trial to succeed before accepting the installed-app harness. After workflow registration on `develop`, select the reviewed harness PR branch to run its pre-merge pilot. That workflow commit must itself resolve to a protected-branch commit or current same-repository PR head, and its SHA appears in the signing approval plan. Start with Windows, then require `test_platform: all` baseline evidence before merging the harness. Keep #2920 unmerged until both update paths and all safeguards have passing evidence.
6. After the harness lands, configure `desktop-installer-validation` from GitHub Actions as a required check. Retarget the final upgrade to `develop`, then dispatch full `electron-upgrade` validation from `develop` for its exact head commit. A changed candidate requires new evidence.

## Inputs and retained packages

The [manual workflow](../.github/workflows/desktop_prerelease.yml) is separate from CI/CD. It never creates release tags, publishes GitHub Releases, or deploys the website. Source refs resolve to immutable commits reachable from protected branches or current heads of open same-repository PRs. Fork heads and unrelated unprotected commits are rejected.

Choose exactly one baseline source: `baseline_ref` or `baseline_run_id`. A retained baseline uses the previous run's candidate-B packages without rebuilding. Its identity, source, version ordering, complete platform set, archive IDs/digests, and expiration must validate. A baseline source run must have completed successfully.

`baseline-validation` creates baseline and candidate-B versions. `electron-upgrade` additionally creates candidate-A from the same candidate commit. The latter supports current runtime → candidate-B and candidate-A → candidate-B without rebuilding the candidate packages.

Retention is 14 days for QA artifacts. The report links each package manifest to its immutable artifact ID and archive digest; manifests record final file hashes/sizes, original source/runtime, QA instrumentation/configuration, signing checks, and actual runner image information. Dependencies come from each source's lockfile. macOS update minimums follow the selected source configuration rather than a hard-coded upgrade minimum.

Do not use GitHub's rerun command to rebuild signed packages. QA packaging, signing, and finalization each reject later workflow attempts, including partial reruns that reuse successful resolver outputs; production retry behavior is retained. Dispatch a new build for packaging failures, or use the same retained packages for test reruns. Expired artifacts require a new build with new recorded relationships; never substitute another artifact silently.

Use `build-and-test` to test newly built packages, or `test-only` with their original `artifact_run_id` to reuse them after failed or canceled tests. Test-only rejects source overrides. Dispatch a new test-only run rather than rerunning individual GitHub jobs. QA wrapper instrumentation must be compatible; packages from earlier witness versions require a new build. `test_platform` permits focused pilots, whose reports are explicitly partial and never satisfy full acceptance.

## Isolation and production release behavior

QA packages use a stable separate application identity, NSIS identity, profile, and loopback generic feed. A QA-only startup wrapper enables loopback debugging so an external controller can reconnect after updater relaunch. It then loads the original application entrypoint without replacing updater handlers, altering BrowserWindow security, or writing fixture data. QA Mac packages retain Developer ID signing and notarization while omitting the production identity's provisioning profile, which is unnecessary for the existing unrestricted entitlements. Production packages reject generated QA startup files and retain their normal entrypoint, identity, feed, and provisioning profile.

The [shared packaging workflow](../.github/workflows/package_desktop.yml) produces the existing distribution formats. Windows packaging embeds the expected public signing publisher, the existing self-hosted runner signs the installer, and a hosted Windows runner validates Authenticode/publisher before final metadata generation. Mac packages require universal slices, Developer ID/team verification, and accepted notarization. The app and DMG are stapled and validated; the final ZIP is rebuilt around the stapled app before metadata/blockmaps/hashes are finalized. Signing workspaces and temporary keychains are cleaned on failure as well as success.

The [production wrapper](../.github/workflows/release_desktop.yml) alone creates a draft release. CI/CD still restricts it to `master`; release-policy and ordinary tests precede it, tags target the run commit, and production web deployment waits for the complete desktop workflow. Production retention remains unchanged.

## Installed-app acceptance

The external controller installs NSIS on Windows, copies the signed app from the mounted Mac DMG, or executes the actual FUSE-mounted AppImage on Linux. It remains alive while VERIFI quits and the updater relaunches the replacement. It never launches candidate B as a substitute for updating. A temporary loopback feed serves exact retained artifacts and byte ranges; file hashes validate before use.

The UI imports a small synthetic account with facility, meter/readings, predictor/readings, account/facility analyses and their GUID links. File choices are supplied inside the disposable QA profile; real backup operations remain untouched. A read-only runtime witness records process/version/archive/security information, including whether Chromium's global `--no-sandbox` switch is present. Both installed launches must report that switch absent as well as secure window preferences; missing security evidence fails validation. The controller verifies the live OS executable, sandbox/context isolation, changed version/archive, reopened data/settings, and actual backup contents. Existing profiles are refused, and cleanup touches only the profile created by the run.

`baseline-validation` requires a real baseline → candidate update on Windows, Mac Apple Silicon and Linux. `electron-upgrade` additionally requires candidate-A → B cases for Later/Cancel/Save, Discard, and a real backup filesystem obstruction followed by UI recovery. Cases use separate hosted jobs/profiles and reuse the same signed packages. The old client's immediate-restart behavior applies to the first upgrade path; current guarded clients explicitly restart when ready.

Failures retain installer/updater/renderer/controller logs, snapshots, screenshots, traces and machine-readable results. Missing, failed, duplicate, incompatible or partial results cannot produce complete acceptance. The final upgrade gate consumes only full successful default-branch workflow evidence for the exact current candidate; branch pilots remain review evidence.

The Windows-first packaged pilot, complete signed baseline matrix, and upgrade matrix are still required CI evidence. Local fixture/feed/contract tests and certificate-free Mac checks do not establish that these signed scenarios passed.

## Exact-commit check

The [trusted policy](../scripts/desktop/validation-policy.json) identifies #2920 as requiring the upgrade matrix, including the expected runtime-major transition. Other PRs targeting the default branch receive an explicit not-applicable success. A second PR sharing the required PR's head cannot bypass its policy.

The [metadata event workflow](../.github/workflows/desktop_validation_events.yml) executes base/default-branch reporting code. It never executes candidate code or receives signing credentials. PR synchronization queues the check on the current candidate SHA and clears obsolete policy on the preceding head; closure and retargeting refresh policy too. A full default-branch dispatch announces its exact candidate, and workflow completion revalidates immutable invocation/package/result records before reporting success or failure. Both package production and installed-test invocation must originate from the default-branch workflow for this gate. Missing, failed, canceled or partial evidence cannot pass. Feature-branch pilots and their package cohorts remain pilot evidence.

Publishers serialize per candidate, retain queued events, and compare validation-run IDs before updating checks. An older validation cannot overwrite a newer result. A test-only dispatch may reuse the same retained signed cohort, but expiration or a different candidate requires a new explicitly identified build.

Keep production-identity artifact/trust verification and the unchanged released client's post-publication production-feed check in release acceptance. Broad OS-version coverage, Intel Mac execution, tarball updating, installer-wizard automation, and extensive download/signature failure injection remain follow-ups. Recovery uses verified backups and forward fixes, not an assumed Chromium-profile downgrade.
