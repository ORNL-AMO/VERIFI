# Fresh local PR review

Use this procedure for the [pre-PR review checkpoint](github-pr-creation.md#evaluate-the-independent-review), or when asked to review an existing PR with a fresh agent. The development chat coordinates the work; no standalone Codex CLI or new user-created chat is required.

For PR preparation, complete and record the context-aware development agent's self-review first. This procedure is the second, independent stage; do not include the self-review report or conclusions in its brief. An explicitly requested fresh review of an existing PR can run on its own without claiming the self-review stage occurred.

## 1. Pin the comparison

Confirm the intended target and fetch its remote ref. For an existing PR, read its current title, requirements, base, head, and reported validation. Do not assume the target of a stacked PR.

Finish selected validation and commit intended changes. Require a clean checkout, including staged, unstaged, untracked, and submodule changes. Use a separate clean checkout if unrelated work is in progress; do not automatically stash or commit it. Record the checkout, branch, base ref/commit, HEAD, and merge base. Review the merge-base-to-HEAD diff that GitHub's three-dot comparison displays.

Agent commands, with the resolved target substituted for `<remote>/<base>` (for example, `origin/develop` in the main repository or `upstream/develop` in a fork):

```bash
git status --porcelain --untracked-files=all --ignore-submodules=none
git rev-parse --abbrev-ref HEAD
git rev-parse --verify <remote>/<base>
git rev-parse --verify HEAD
git merge-base <remote>/<base> HEAD
git diff <remote>/<base>...HEAD
```

## 2. Start without conversation history

Explicitly disable history inheritance when spawning the reviewer. With the current collaboration tool, use `spawn_agent` with `fork_turns: "none"`; omitting it defaults to inheriting history and does not satisfy this workflow. Asking the development chat to forget its reasoning is insufficient. Leave model/effort overrides unset to inherit the development agent's settings with this tool. For another interface, use its documented equivalents and verify the same settings. If no explicit no-history control exists, disclose the gap instead of falling back to self-review or the standalone CLI.

Give the reviewer only the pinned comparison, neutral expected behavior/constraints, factual validation results, and instructions to read `AGENTS.md`, [review-code-changes](../../.agents/skills/review-code-changes/SKILL.md), the Reviewer mode, and affected subsystem guidance. Treat author-reported checks as unverified unless independently run. Do not supply the development transcript, reasoning summary, previous findings, suspected bugs, proposed fixes, or a defense of the implementation. Do not retrieve saved memories or other chats.

Freshness here isolates the development conversation. Repository/global instructions still apply; disabling transcript inheritance does not independently disable host memory. Disable memory too if a per-agent control exists, and do not claim isolation the runtime does not guarantee. Subagents inherit execution permissions; read-only review is a task constraint, not a separate filesystem sandbox.

## 3. Review and retain findings

Instruct the reviewer to inspect surrounding contracts and consumers, report consequential P0–P2 findings with path/line, trigger, impact, and evidence, separate optional cleanup, and list checks performed and gaps. It must not edit implementation, publish anything, read other chats/session logs/memories, or start another reviewer. Focused checks may substantiate findings; do not repeat broad suites/builds by habit.

Keep implementation unchanged while the review runs. Wait for completion and save the complete returned findings plus comparison facts in a new ignored `tmp/fresh-reviews/` report. Record the explicit no-history setting, reviewer identifier, inherited model/effort (exact names only when available), timestamps, and status `needs-human-review`. Failed/interrupted reviews or missing reports leave the checkpoint incomplete. Explicitly record no findings when applicable; do not silently omit findings when presenting the result.

## 4. Evaluate and recheck

Present findings and validation gaps to the user. Apply only authorized fixes, rerun affected checks, commit changes, repeat context-aware self-review when preparing a PR, and start another fresh reviewer with current requirements/evidence rather than prior conclusions. Immediately before publication, fetch the target again and verify the checkout, branch, base commit, HEAD, merge base, and clean state still match the report. A change to any of them invalidates the review, even if a moved base retains the same merge base. For an existing PR, also confirm GitHub's current base/head commits match the reviewed commits.

Reviews return in chat by default. When an agent opens/updates a PR, append the [agent review records](pr-review-record.md) to the general PR description, filling **Fresh agent review** from this report and retaining the separate **Context-aware self-review** record as required by the [creation guide](github-pr-creation.md#publish-and-verify). Human-only PRs do not require these records; recording evidence in an authorized PR description does not authorize separate review comments. Explicitly requested comment posting follows the [GitHub review guide](github-pr-review.md); publication authorization already given remains valid subject to its scope and any new decisions. This is an agent workflow, not a GitHub required check, proof of correctness, or merge approval. See official background on [subagents and model inheritance](https://learn.chatgpt.com/docs/agent-configuration/subagents).
