# Team pull-request workflow

Use this checklist for VERIFI changes. Codex app users do not need the standalone Codex CLI.

1. **Scope.** Link the issue, agree on the target branch (usually `develop`), and keep the branch focused. Preserve unrelated work.
2. **Implement and validate.** Finish the change, update relevant documentation, run the checks required by the [testing guide](../testing.md), and record actual results. Commit only the intended files.
3. **Request fresh review.** Ask Codex to prepare the PR. It reviews the exact committed comparison in a subagent with no inherited development conversation, using the development agent's model and reasoning effort.
4. **Evaluate and revise.** Read the findings and validation gaps in chat. Authorize the fixes you want; commit them, rerun affected checks, and repeat fresh review after code changes. Review completion is not approval.
5. **Publish.** Explicitly authorize opening/updating the PR. Codex preserves authorization already given, verifies that the reviewed commits are still current, and fills the [PR template](../../.github/pull_request_template.md), including the **Fresh agent review** status, exact base/head commits, findings, and reviewer checks/gaps. Include a non-closing issue reference such as `Connects #123`. Stop for unresolved decisions or material validation gaps.
6. **Finish human review and QA.** Address feedback, rerun affected checks and fresh review after changes, and retain the team's required human approvals and CI checks. QA validates and closes the issue; this workflow does not auto-merge or auto-close it.

For an existing PR, ask Codex to review its URL using the fresh-review workflow. Results return in chat. To publish them, explicitly ask for actionable findings as inline GitHub review comments; reviewing alone does not authorize posting, approval, or merging.

Agent details: [fresh review](local-fresh-review.md), [PR creation](github-pr-creation.md), and [GitHub review](github-pr-review.md). These are repository instructions, not an installed GitHub bot or required status check. Each teammate needs a Codex app/runtime that supports explicitly starting a subagent without history, plus repository access; publishing also requires GitHub write access. If fresh delegation is unavailable, Codex must disclose that rather than silently self-review.
