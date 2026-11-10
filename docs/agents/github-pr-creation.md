# GitHub PR creation

Follow the [team checklist](pr-workflow.md) when explicitly asked to open or update a VERIFI PR. This guide does not itself authorize publication.

## Prepare and validate

1. Resolve the exact head and target branches; do not assume `develop` for stacked or epic work. Fetch the target remote and check for an existing PR for the head branch.
2. Isolate intended changes from unrelated work. Follow the [testing guide](../testing.md) and [validation skill](../../.agents/skills/validate-web-and-electron/SKILL.md); record every selected check and its actual result. For documentation-only changes, link/command checks and relevant workflow evidence suffice under the testing guide's documentation exception.
3. Commit only intended files and use a clean checkout. The context-aware development agent self-reviews the complete merge-base-to-head comparison against the requirements, accepted decisions, tests, documentation, and validation evidence using [review-code-changes](../../.agents/skills/review-code-changes/SKILL.md). Resolve authorized in-scope issues, rerun affected checks, and record self-review findings/gaps against the final commits. Then start the [fresh review](local-fresh-review.md) of that same comparison, without passing self-review findings or reasoning.

## Evaluate the independent review

4. Present both stages' complete findings and validation gaps in chat. Explicitly say when no actionable findings remain. Pause for decisions on findings, unapproved fixes, or material validation gaps; do not change the reviewed implementation on the reviewer's authority alone.
5. Apply only authorized fixes, rerun affected checks, commit, and repeat both review stages after changes. A completed review is evidence, not publication authorization.
6. Obtain explicit authorization to push/open/update the PR, honoring authorization already given in the session. Immediately before publication, fetch the target again and verify the checkout, branch, base, head, merge base, and clean working tree against both saved review records. Any difference requires both reviews to be refreshed; return to user evaluation for new findings or material gaps.

## Publish and verify

7. Push the reviewed commits without force-pushing unless separately authorized. Create a normal PR unless a draft was requested or unresolved work makes it intentionally incomplete. Use the [PR template](../../.github/pull_request_template.md): include delivered behavior, validation commands/results, limitations, related issues, and separate **Context-aware self-review** and **Fresh agent review** evidence copied from their completed reports. Record each reviewer, exact base/head commits, findings/disposition, and checks/gaps; record the fresh reviewer's explicit no-history setting. Set each status `Completed` only when its report covers the current comparison; otherwise use `Not run`, `Failed`, or `Stale` as appropriate. Use non-closing references such as `Connects #123` because QA validates and closes issues; use closing keywords only when requested.
8. Verify the PR URL, base/head commits, title, body, draft state, and displayed comparison. Attach or surface the PR in the active agent environment when supported, read initial CI/check status once, and return the URL and remaining gaps. Do not imply queued checks passed.

Do not add reviewers, labels, project metadata, auto-merge, or GitHub review comments without authorization. Follow the [GitHub review guide](github-pr-review.md) for explicitly requested review publication.

The review sections are visible evidence records, not GitHub-required status checks or merge approval. After new commits or a moved target, mark both `Stale` until both stages and the comparison check complete. The template also applies to PRs opened through tools/API; do not rely on GitHub to insert it automatically there.
