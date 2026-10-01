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

Every change to `master` is an intentional release. The release-policy job checks the proposed version against the pull request base before merge and against the pre-push `master` commit after merge. It also requires `package.json` and `package-lock.json` to agree and rejects a version tag that belongs to another commit. An existing tag that points to the current commit is accepted during a manual rerun so the same release can be retried safely.

## Triggers and job flow

The caller workflow is [`.github/workflows/main.yml`](../.github/workflows/main.yml).

### Pull requests

Pull requests targeting `develop` or `master` run the test and release-policy gates. The policy always checks version-file consistency; pull requests to `master` must also propose a new, non-conflicting release version. Release jobs are skipped.

### Development pushes

A push to `develop` follows this sequence:

```text
Tests → Web build → Development web deployment
```

The release-policy job verifies that the package and lockfile versions agree. The desktop job is intentionally skipped. The web-deployment condition uses `always()` so GitHub evaluates the development path despite that skipped dependency; it still requires the web build to succeed.

### Production pushes

A push to `master` must pass the release-policy and test jobs. It then runs the web build and [desktop release workflow](../.github/workflows/release_desktop.yml) in parallel. The [web deployment workflow](../.github/workflows/deploy_web.yml) starts only when the web build and the entire desktop workflow both report success.

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

## Branch policy

`develop` is the integration branch and `master` is the release branch. Protect both branches in GitHub so changes require a pull request, the required test and release-policy checks, resolved review conversations, and the configured approvals. Disable force pushes and branch deletion. A production hotfix may target `master` without first merging to `develop`, but it must still use a reviewed pull request and pass the same checks.

Do not merge documentation-only, administrative, or unrelated changes directly to `master`; every push starts a production release. Put those changes on `develop` and include them in the next planned promotion.

## Normal release process

1. Use the release epic and milestone as the source of truth for scope. Confirm every included issue has the required QA approval and that deferred work is removed from the release scope.
2. Create a release-preparation branch from `develop` and open a pull request back into `develop`.
3. In that pull request, update the approved version in both `package.json` and `package-lock.json`, reference the release epic, and include only release-preparation changes.
4. After the release-preparation pull request passes review and required checks, merge it into `develop`.
5. Open a promotion pull request from `develop` to `master`. Do not add release-only code changes to this pull request; any correction returns to `develop` first.
6. Confirm the promotion diff, version, epic scope, QA status, and required checks, then merge it into `master`.
7. Monitor the release-policy and test gates, parallel web build, and full desktop workflow.
8. Confirm production web deployment starts only after the desktop workflow and draft GitHub Release succeed. The website is live before the draft GitHub Release is manually published.
9. Verify the production web application and review the draft release's installers and generated notes, then publish the draft GitHub Release.

Referencing or labeling an epic is issue-tracking metadata. The `v<version>` Git tag created by the release workflow is a separate release identifier.

## Emergency patch release

Use this path only when a vital fix cannot wait for the normal `develop` promotion:

1. Create a hotfix branch from the current `master` commit.
2. Implement the smallest safe fix and its focused regression coverage.
3. Advance the patch version in both `package.json` and `package-lock.json`; never reuse or replace an already released version.
4. Open a pull request from the hotfix branch to `master`, reference the incident or issue, and require the normal review and test checks.
5. Merge the pull request and follow the same pipeline monitoring, production verification, draft review, and publication steps as a normal release.
6. Immediately forward-port the released fix into `develop` through a pull request or a deliberate cherry-pick. Resolve version-file conflicts according to the version policy below, and do not allow later development to regress the fix.

## Version policy

`master` contains the exact latest released version. `develop` may retain that base version until the next release target is approved; development-server builds append the commit SHA so deployed development builds remain identifiable. The release-preparation pull request sets the next exact version. There is no required post-release version-bump pull request unless the next release version is already known and the team wants to record it early.

## Failure and retry behavior

- A test or web-build failure prevents all web deployment for that run.
- A desktop build, packaging, signing, notarization, upload, or draft-release failure prevents production web deployment.
- A development deployment does not depend on the skipped desktop job.
- If the desktop gate fails, fix the underlying problem and rerun the failed jobs and their dependents. Confirm `web_deploy` runs only after the desktop caller reports success.
- If web deployment fails after the desktop gate succeeds, rerun the failed deployment while `web-dist` is retained. Rerun the full workflow after artifact expiration.
- Never substitute an artifact from another workflow run or commit to bypass the gate.

The [deployment template](../.github/workflows/template_deploy.yml) archives the currently deployed web directory before replacing its contents when a backup directory is configured. Rollback is not automated; a core maintainer must select and restore the correct server backup using the approved infrastructure procedure.

For required local checks before merging a workflow change, see the [testing guide](testing.md#commands-and-ci).
