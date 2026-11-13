# Production draft audit

This is the staged implementation of [#2941](https://github.com/ORNL-AMO/VERIFI/issues/2941), within the [installer/update testing effort](https://github.com/ORNL-AMO/VERIFI/issues/2586). The workflow files and desktop scripts are the source of truth.

## Current rollout stage

Stage one retains attested production packaging evidence and provides a **read-only preview**. It does not yet require an audit before production web deployment or create an authoritative publication record. Existing packaging, signing, release-policy and desktop-before-web gates remain in force; failure to attach packaging evidence also fails the desktop workflow.

1. Land this tooling on `develop` so the manual workflow is registered.
2. Include it in the next normal promotion to `master`. The production workflow creates or verifies the version tag at the immutable run commit before creating its unpublished draft, then attaches packaging evidence.
3. Run the preview against that real production draft. Require all five distributions, metadata/blockmaps, native evidence, packaged configuration, provenance and baseline checks to pass.
4. Have a maintainer review the complete report. Record the successful trial run before accepting the second rollout change.
5. In that subsequent change and normal promotion, add the mandatory direct audit call downstream of draft upload. Do not use a draft-created event. A failing audit or failed report persistence must fail the desktop workflow and block production web deployment.

The real-draft trial has not been performed by local unit tests or checks against an older public file. The required gate remains pending until that trial and review happen. [#2942](https://github.com/ORNL-AMO/VERIFI/issues/2942) controls approved publication, and [#2943](https://github.com/ORNL-AMO/VERIFI/issues/2943) proves actual public-feed discovery, updating and data preservation.

## Run a preview

From the repository default branch, open **Actions → Production draft audit → Run workflow** and supply:

| Input | Meaning |
| --- | --- |
| `release_id` | The exact unpublished production GitHub Release ID. |
| `release_run_id` | The successful master CI/CD run that uploaded that draft's packaging evidence. |

Start a fresh dispatch for each audit retry, using the same IDs when retrying the same target. Individual GitHub job reruns are rejected. Installer builds, signing, notarization, publication and web deployment are absent from this audit workflow. No signing keys are needed by audit jobs.

Preparation downloads assets by ID, resolves tags to immutable commits, verifies attestation provenance, and binds all downloaded bytes to the retained native manifests. Native jobs statically extract the NSIS payload, DMG/ZIP, and AppImage/tarball without installing or launching VERIFI. They inspect ASAR identity and entrypoint bytes, platform identity, public GitHub updater configuration and Windows publisher expectations, then verify updater versions, referenced files, checksums and blockmaps. Existing native signing/notarization evidence is reused only when its final-file hashes match.

Shared desktop source checkout pins LF behavior with action-scoped Git configuration before files are materialized. Windows CRLF defaults therefore cannot change the entrypoint relative to its immutable Git blob; no global Git setting or retained artifact is rewritten. Final checks compare the draft's pinned ID, tag, source and production flags again, rather than accepting its current identity as a new expectation.

GitHub production updater configuration may omit `channel` or explicitly specify `latest`. A `-beta` version is not itself a GitHub prerelease flag. The audit preserves the current updater behavior rather than changing production channel selection.

## Evidence and reports

The production draft receives `production-evidence-<run-id>-<attempt>.json`. This single envelope contains the exact signed packaging-evidence JSON text and its Sigstore verification-bundle text. Keeping them in one attachment avoids a successful subject upload followed by a missing bundle. It retains the original manifests, native verification, source/workflow commits, run/attempt, package-artifact IDs/digests and final release-file IDs, sizes and SHA256 hashes.

The auditor verifies the envelope against the production repository, the release reusable workflow, `master`, its exact source commit and invocation. This uses [GitHub artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations); no new private signing keys are introduced. The evidence remains with the release after the short-lived packaging artifacts expire and becomes public when the release is published. Do not include credentials or private signing material.

Preview results stay in the audit run's Actions artifacts:

- `production-draft-audit-preview`: readable `audit-preview.md` and machine-readable `audit-preview.json`.
- `production-draft-audit-inputs`: pinned target/baseline plan and downloaded provenance.
- Per-platform inspection artifacts: static inspection observations and failures.

Preview reports explicitly set `publicationEligible: false`. See the workflow upload steps for retention; preview reports cannot substitute for the later authoritative record.

## Baseline and retry behavior

The baseline is the current published production latest, selected before target publication. Its resolved source, exact installer/updater assets and downloaded hashes are recorded. It must be older by SemVer precedence and have the complete distribution set. Missing or unsuitable latest fails; no older release is silently substituted.

Only explicitly approved historical releases in [the legacy baseline policy](../scripts/desktop/production-audit-policy.json) may omit modern evidence. Each exception binds a release ID, tag and source commit. Removing modern evidence from another release does not turn it into a legacy baseline. Changes to this exception list require review.

Missing, duplicate, unknown, replaced or mismatched assets fail. Replacing an installer with identical bytes still changes its asset ID and invalidates the recorded inventory. The auditor never repairs or replaces release files. Before a production retry, the writer can remove a zero-byte `starter` evidence attachment only when GitHub identifies its uploader as Actions and its exact originating attempt as failed/cancelled master CI/CD for the same source. Uploaded evidence and installer assets are never removed by this recovery. Other incomplete or invalid evidence needs maintainer inspection; do not remove valid historical evidence to bypass checks.

The distribution uploader disables overwrites even if a draft is published after preflight. Ordinary failed-job retries reuse retained packages and existing asset IDs; their uploaded hashes/sizes must still match the packaging manifests. A rebuild producing different bytes under existing filenames fails rather than replacing them. If expired artifacts require rebuilding, a maintainer must review and discard only the unpublished draft before restarting the trusted release path. Preserve the immutable version tag and never discard or replace published release files for this recovery.

Preparation and final collection both check that the draft, tag, asset inventory and production latest stayed unchanged. A preview failure leaves the draft unpublished but does not gate the already separate stage-one release run. Re-dispatch the audit after correcting the cause. If durable evidence was never attached and the original packaging evidence expired, a new trusted production packaging run is required; release assets alone cannot recreate native verification.

Stage two adds explicit authoritative record and baseline-refresh modes. Ordinary authoritative retries must retain the pinned target and baseline; changed latest requires an explicit new generation. Serialize writes by release, retain attested start/final records, and require the latest authoritative attempt to finish and pass. Failed or interrupted authoritative attempts invalidate an older pass; read-only investigations do not supersede it. These modes and the required call are not enabled in stage one.

## Consumer and validation contracts

The shared production audit contract validates exact distribution snapshots, native manifests, baseline relationships and complete authoritative inspection records. [#2942](https://github.com/ORNL-AMO/VERIFI/issues/2942) must additionally verify the exact originating CI/CD run completed successfully and revalidate all pinned identities after approval. An audit cannot certify completion of its enclosing workflow while deployment is downstream of it. Publication authority remains outside installer/audit jobs.

Run `npm run test:desktop-tooling` for the focused contracts and helper regressions, and the final suite selected by the [testing guide](testing.md). Validate changed workflows with `actionlint`; the existing production `concurrency.queue` field needs a compatible actionlint version. A real production draft with all three native inspection jobs is the rollout acceptance evidence. Broad OS coverage and installed-app update acceptance remain separate work.
