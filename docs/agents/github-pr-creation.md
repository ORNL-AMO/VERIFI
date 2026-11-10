# GitHub PR creation

Follow the [team checklist](pr-workflow.md) when explicitly asked to open or update a VERIFI PR. This guide does not itself authorize publication.

## Prepare and validate

1. Resolve the exact head and target branches; do not assume `develop` for stacked or epic work. Fetch the target remote and check for an existing PR for the head branch.
2. Isolate intended changes from unrelated work. Follow the [testing guide](../testing.md) and [validation skill](../../.agents/skills/validate-web-and-electron/SKILL.md); record every selected check and its actual result. For documentation-only changes, link/command checks and relevant workflow evidence suffice under the testing guide's documentation exception.
3. Commit only intended files and use a clean checkout for the [fresh review](local-fresh-review.md). Review the same merge-base-to-head comparison GitHub will display.

## Evaluate the independent review

4. Present the complete findings and validation gaps in chat. Explicitly say when no actionable findings remain. Pause for decisions on findings, unapproved fixes, or material validation gaps; do not change the reviewed implementation on the reviewer's authority alone.
5. Apply only authorized fixes, rerun affected checks, commit, and repeat fresh review after changes. A completed review is evidence, not publication authorization.
6. Obtain explicit authorization to push/open/update the PR, honoring authorization already given in the session. Immediately before publication, fetch the target again and verify the checkout, branch, base, head, merge base, and clean working tree against the saved review. Any difference requires fresh review; return to user evaluation for new findings or material gaps.

## Publish and verify

7. Push the reviewed commits without force-pushing unless separately authorized. Create a normal PR unless a draft was requested or unresolved work makes it intentionally incomplete. Include the delivered behavior, validation commands/results, limitations, and related issues. Use non-closing references such as `Connects #123` because QA validates and closes issues; use closing keywords only when requested.
8. Verify the PR URL, base/head commits, title, body, draft state, and displayed comparison. Attach or surface the PR in the active agent environment when supported, read initial CI/check status once, and return the URL and remaining gaps. Do not imply queued checks passed.

Do not add reviewers, labels, project metadata, auto-merge, or GitHub review comments without authorization. Follow the [GitHub review guide](github-pr-review.md) for explicitly requested review publication.
