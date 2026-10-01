# VERIFI release process

This guide describes how VERIFI's GitHub Actions workflows build and deploy the web and Electron distributions. The workflow files are the source of truth for runner labels, action versions, artifact retention, secrets, and packaging commands.

## Release invariant

Production web deployment must not start until both the production web bundle and the complete Electron release have succeeded for the same workflow run and commit.

```text
Tests ─┬─ Web build ───────────────┐
       └─ Desktop release ─────────┴─ Production web deploy
```

The desktop gate includes the Electron renderer build, macOS packaging and notarization, Windows and Linux packaging, Windows signing, release-artifact collection, and creation of the draft GitHub Release. A failure or cancellation anywhere in that chain prevents production web deployment. The already-deployed production site is not modified.

Development web deployment does not depend on Electron packaging because desktop releases run only from `master`.

## Triggers and job flow

The caller workflow is [`.github/workflows/main.yml`](../.github/workflows/main.yml).

### Pull requests

Pull requests targeting `develop` or `master` run the test gate. Release jobs are skipped.

### Development pushes

A push to `develop` follows this sequence:

```text
Tests → Web build → Development web deployment
```

The desktop job is intentionally skipped. The web-deployment condition uses `always()` so GitHub evaluates the development path despite that skipped dependency; it still requires the web build to succeed.

### Production pushes

A push to `master` runs the web build and [desktop release workflow](../.github/workflows/release_desktop.yml) in parallel after tests. The [web deployment workflow](../.github/workflows/deploy_web.yml) starts only when the web build and the entire desktop workflow both report success.

The desktop workflow creates a draft GitHub Release. A core maintainer reviews its installers and generated notes before publishing it.

### Manual dispatch

Manual dispatch runs QA after the test gate. When dispatched from `develop` or `master`, the matching development or production flow also runs. QA keeps its `dist` artifact name, while the release web build uses `web-dist`, so both builds can exist in the same workflow run.

## Artifacts and ownership

The [build template](../.github/workflows/template_build.yml) creates `web-dist` for the release web deployment and `dist` for QA. The deployment workflow only consumes the appropriate artifact; it never rebuilds the application.

The desktop workflow owns its renderer and installer artifacts. Refer to its upload steps for the current platform outputs rather than copying that changing inventory into documentation.

Artifacts expire according to the `retention-days` values on their upload steps. When retrying a deployment, first confirm its required artifacts are still available in the workflow run. If they have expired, rerun the full workflow so deployment cannot consume output from a different commit.

## Concurrent releases

Runs from `master` share the `verifi-production-release` concurrency group and are queued in submission order. A later release cannot overtake an earlier release or interrupt signing, notarization, draft creation, or deployment. Development and pull-request runs use run-specific groups and remain parallel.

Do not manually reorder queued production releases. If a queued release is no longer valid, cancel it deliberately and confirm which commit should be released next.

## Failure and retry behavior

- A test or web-build failure prevents all web deployment for that run.
- A desktop build, packaging, signing, notarization, upload, or draft-release failure prevents production web deployment.
- A development deployment does not depend on the skipped desktop job.
- If the desktop gate fails, fix the underlying problem and rerun the failed jobs and their dependents. Confirm `web_deploy` runs only after the desktop caller reports success.
- If web deployment fails after the desktop gate succeeds, rerun the failed deployment while `web-dist` is retained. Rerun the full workflow after artifact expiration.
- Never substitute an artifact from another workflow run or commit to bypass the gate.

The [deployment template](../.github/workflows/template_deploy.yml) archives the currently deployed web directory before replacing its contents when a backup directory is configured. Rollback is not automated; a core maintainer must select and restore the correct server backup using the approved infrastructure procedure.

## Maintainer checklist

1. Complete QA for the release milestone and confirm the intended changes are on `develop`.
2. Set the approved semantic version in `package.json` and ensure the production release commit uses a unique version/tag.
3. Merge the release into `master`.
4. Monitor the test gate, parallel web build, and full desktop workflow.
5. Confirm production web deployment starts only after the desktop workflow and draft GitHub Release succeed.
6. Verify the production web application and review the draft release's installers and generated notes.
7. Publish the draft GitHub Release only after maintainer review is complete.

For required local checks before merging a workflow change, see the [testing guide](testing.md#commands-and-ci).
