# Team pull-request workflow

Use this checklist for VERIFI changes. Codex app users do not need the standalone Codex CLI.

1. **Scope.** Link the issue, agree on the target branch (usually `develop`), and keep the branch focused. Preserve unrelated work.
2. **Implement and validate.** Finish the change, update relevant documentation, run the checks required by the [testing guide](../testing.md), and record actual results. Commit only the intended files.
3. **Context-aware self-review.** The development agent checks the full diff against the original requirements, accepted decisions, tests, documentation, and validation evidence. Resolve authorized in-scope issues and record the result for the final committed comparison.
4. **Fresh review and evaluation.** A subagent reviews the same comparison with no inherited development conversation, using the development agent's model/effort. It receives no self-review findings or reasoning. Read its findings/gaps in chat, authorize fixes, commit, and rerun affected checks and both review stages after changes. Review completion is not approval.
5. **Publish.** Explicitly authorize opening/updating the PR. Codex preserves authorization already given, verifies that both reviews cover the current commits, and fills the [PR template](../../.github/pull_request_template.md), including separate **Context-aware self-review** and **Fresh agent review** records. Include a non-closing issue reference such as `Connects #123`. Stop for unresolved decisions or material validation gaps.
6. **Finish human review and QA.** Address feedback, rerun affected checks and both review stages after changes, and retain the team's required human approvals and CI checks. QA validates and closes the issue; this workflow does not auto-merge or auto-close it.

In the Codex app, **“Prepare a PR to develop”** triggers preparation and both reviews without publication. **“Let’s open a PR to develop”** also authorizes publication after the checks and any required decisions. No special command is needed; resolve a different target from the request or branch context when appropriate.

For an existing PR, ask Codex to review its URL using the fresh-review workflow. This can run a fresh review alone; do not claim an author-context self-review occurred if it did not. Results return in chat. To publish them, explicitly ask for actionable findings as inline GitHub review comments; reviewing alone does not authorize posting, approval, or merging.

Agent details: [fresh review](local-fresh-review.md), [PR creation](github-pr-creation.md), and [GitHub review](github-pr-review.md). These are repository instructions, not an installed GitHub bot or required status check. Each teammate needs a Codex app/runtime that supports explicitly starting a subagent without history, plus repository access; publishing also requires GitHub write access. If fresh delegation is unavailable, Codex must disclose that rather than silently self-review.
