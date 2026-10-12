# GitHub pull request creation guide

Use this guide when a user or maintainer explicitly asks an agent to open a VERIFI pull request. It complements the contribution rules in [`CONTRIBUTING.md`](../../CONTRIBUTING.md); it does not authorize pull-request creation on its own.

## Confirm the comparison

1. Resolve the exact head branch and target branch from the request, branch history, or established feature-branch workflow. Do not assume `develop` when work intentionally targets an epic or feature branch.
2. Fetch the relevant remote refs when possible and review `origin/<base>...HEAD`, including its commits, changed files, and diff statistics. Use the same comparison GitHub will display.
3. Check for an existing pull request for the head branch before creating another one.
4. Preserve unrelated worktree changes. Stop before committing or pushing if the requested PR cannot be isolated safely.

## Complete the local review checkpoint

Before pushing the branch or creating or updating the pull request:

1. Use the [`review-code-changes`](../../.agents/skills/review-code-changes/SKILL.md) workflow to review the exact `origin/<base>...HEAD` comparison that GitHub will display.
2. Present the user with prioritized, actionable findings and validation gaps. Say explicitly when no actionable findings remain.
3. Stop and wait for the user to evaluate the findings. Do not change the reviewed implementation, push the branch, or create or update the pull request until the user authorizes the next step.
4. Apply only the fixes the user requests, rerun the affected checks, and review the updated comparison before returning to this checkpoint. Continue only after the user explicitly approves opening or updating the pull request.

GitHub-hosted review, including Copilot review, follows pull-request creation and complements rather than replaces this local checkpoint.

## Prepare the branch

- After the user approves the local review checkpoint, resolve the agreed findings in scope and confirm the comparison still contains only intended work.
- Run the risk-based validation selected by the matching task context and skills. An explicit pre-PR request requires `npm run test:all:ci` plus the production builds selected by the affected runtime boundaries.
- Record every command and its result. Disclose failed, aborted, skipped, or unavailable checks exactly; never describe them as passing.
- Ensure intended files are committed with focused messages and the head branch is pushed to its configured remote. Do not force-push unless the user explicitly authorizes it.

## Write the pull request

Use a concise title that describes the delivered behavior. The body must include:

- a summary of user-visible and architectural changes;
- the validation commands and outcomes;
- known limitations, deferred work, or environment-specific validation gaps; and
- related issue references.

Use non-closing references such as `Connects #1234` by default because VERIFI issues are validated and closed by QA. Use `Closes`, `Fixes`, or another automatic-closing keyword only when the user or maintainer explicitly requests it.

Create a normal pull request unless a draft was requested or unresolved work makes the branch intentionally incomplete. Do not enable auto-merge, assign reviewers, add labels, or change project metadata without authorization.

## Verify after creation

1. Confirm the pull request URL, base, head, title, body, draft state, and displayed comparison.
2. Attach or surface the pull request through the active agent environment when that capability exists.
3. Read the initial CI/check status once and report it without implying that queued checks passed.
4. Return the pull request URL, validation evidence, unresolved risks, and any required next action.
