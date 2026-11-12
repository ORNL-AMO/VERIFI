# Desktop pre-release validation

This is the packaging foundation for [#2586](https://github.com/ORNL-AMO/VERIFI/issues/2586). It retains the current Electron runtime. Signed package production is implemented; installed-app automation and candidate-specific merge enforcement are downstream changes. A successful packaging run is **not** proof of installation or automatic updating.

## First rollout

1. A repository administrator configures the `desktop-qa-signing` environment with at least one maintainer reviewer and self-approval permitted. The resolver checks this configuration before building. Keep the existing Apple credentials and Windows signing runner available; private keys never belong on test runners or developer machines.
2. Merge the foundation into `develop` after its tests, builds, and reviews. GitHub requires the new manual workflow on the default branch before normal dispatch is available.
3. Run **Desktop pre-release** from `develop`, select `build-only`, and supply a candidate and an explicit baseline. For the first baseline trial, both may identify the same current source; generated QA versions remain ordered.
4. Review the resolved source commits and QA versions in the run summary, then approve signing. The initiating maintainer may approve.
5. Require the signed three-platform packaging trial to succeed before advancing the installed-app harness PR. Keep #2920 unmerged until both update paths and all safeguards have actual passing evidence.

## Inputs and retained packages

The [manual workflow](../.github/workflows/desktop_prerelease.yml) is separate from CI/CD. It never creates release tags, publishes GitHub Releases, or deploys the website. Source refs resolve to immutable commits reachable from protected branches or current heads of open same-repository PRs. Fork heads and unrelated unprotected commits are rejected.

Choose exactly one baseline source: `baseline_ref` or `baseline_run_id`. A retained baseline uses the previous run's candidate-B packages without rebuilding. Its identity, source, version ordering, complete platform set, archive IDs/digests, and expiration must validate. A baseline source run must have completed successfully.

`baseline-validation` creates baseline and candidate-B versions. `electron-upgrade` additionally creates candidate-A from the same candidate commit. The latter supports current runtime → candidate-B and candidate-A → candidate-B without rebuilding the candidate packages.

Retention is 14 days for QA artifacts. The report links each package manifest to its immutable artifact ID and archive digest; manifests record final file hashes/sizes, original source/runtime, QA instrumentation/configuration, signing checks, and actual runner image information. Dependencies come from each source's lockfile. macOS update minimums follow the selected source configuration rather than a hard-coded upgrade minimum.

Do not use GitHub's rerun command to rebuild signed packages. QA packaging, signing, and finalization each reject later workflow attempts, including partial reruns that reuse successful resolver outputs; production retry behavior is retained. Dispatch a new build for packaging failures, or use the same retained packages for test reruns. Expired artifacts require a new build with new recorded relationships; never substitute another artifact silently.

The `build-and-test` and `test-only` input contracts are reserved for the installed-app harness PR and currently fail explicitly because that harness is unavailable. Test-only will accept an original run with verified packages even if its later installed tests failed or were canceled; it will reject source overrides. This foundation cannot report installed-test success.

## Isolation and production release behavior

QA packages use a stable separate application identity, NSIS identity, profile, and loopback generic feed. A QA-only startup wrapper enables loopback debugging so an external controller can reconnect after updater relaunch. It then loads the original application entrypoint without replacing updater handlers, altering BrowserWindow security, or writing fixture data. QA Mac packages retain Developer ID signing and notarization while omitting the production identity's provisioning profile, which is unnecessary for the existing unrestricted entitlements. Production packages reject generated QA startup files and retain their normal entrypoint, identity, feed, and provisioning profile.

The [shared packaging workflow](../.github/workflows/package_desktop.yml) produces the existing distribution formats. Windows packaging embeds the expected public signing publisher, the existing self-hosted runner signs the installer, and a hosted Windows runner validates Authenticode/publisher before final metadata generation. Mac packages require universal slices, Developer ID/team verification, and accepted notarization. The app and DMG are stapled and validated; the final ZIP is rebuilt around the stapled app before metadata/blockmaps/hashes are finalized. Signing workspaces and temporary keychains are cleaned on failure as well as success.

The [production wrapper](../.github/workflows/release_desktop.yml) alone creates a draft release. CI/CD still restricts it to `master`; release-policy and ordinary tests precede it, tags target the run commit, and production web deployment waits for the complete desktop workflow. Production retention remains unchanged.

## Evidence still required

The installed-app PR must first establish Windows packaged automation with sandbox/context isolation retained, then add macOS and actual AppImage adapters. Each platform must import representative synthetic data through the UI, complete a real updater installation/relaunch, and compare persisted values, GUID relationships, and settings. Only file/folder choices may be controlled; backups, downloads, installation, and relaunch remain real.

The upgrade PR additionally needs Later, Cancel/Save, Discard, and actual backup failure/recovery on each platform. Its final check must identify the candidate commit, require every scenario/platform, reject stale results, and refresh on candidate changes. Repository required-check configuration belongs to that rollout; this foundation does not configure branch protection.

Keep production-identity artifact/trust verification and the unchanged released client's post-publication production-feed check in release acceptance. Broad OS-version coverage, Intel Mac execution, tarball updating, installer-wizard automation, and extensive download/signature failure injection remain follow-ups. Recovery uses verified backups and forward fixes, not an assumed Chromium-profile downgrade.
