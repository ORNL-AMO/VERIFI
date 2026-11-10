---
name: review-code-changes
description: Review VERIFI code changes or pull requests for correctness, architecture, compatibility, tests, and validation. Does not authorize implementing findings or posting a GitHub review.
---

# Review code changes

For agent-assisted PR preparation, the context-aware development agent first uses the steps below to self-review against the original requirements and accepted decisions, then records its findings and validation gaps. Next it follows the [fresh local review workflow](../../../docs/agents/local-fresh-review.md): start a subagent with history inheritance explicitly disabled (`fork_turns: "none"` with the current collaboration tool) and inherit the development agent's model/effort. Pass only comparison facts, neutral requirements, validation evidence, and repository guidance, never self-review conclusions or reasoning. Append both stages using the [agent review record](../../../docs/agents/pr-review-record.md), separate from the general PR template; human-only PRs do not require these records. An independently started reviewer performs the steps below directly; do not delegate recursively. An explicitly requested fresh review of an existing PR can run without an author-context self-review, but must not claim that stage occurred.

1. Read the [Reviewer](../../../docs/agents/personas.md#reviewer) mode and matching [task context](../../../docs/agents/context-index.md). For a PR, read the [GitHub review guide](../../../docs/agents/github-pr-review.md). Load only relevant architecture sections and subsystem skills.
2. Establish the exact comparison and intended behavior. Inspect changed tests, documentation, and validation evidence; trace entrypoints, owners, consumers, shared contracts, and compatibility paths beyond changed lines.
3. Review correctness and architecture: deterministic calculations, units, aggregation, Worker contracts/lifecycle/cancellation, durable data, GUID relationships, backup/import compatibility, errors, and Electron boundaries. Apply affected subsystem skills.
4. For Angular/UI changes, use `implement-angular-feature`. Check component/service ownership, reactive flow, lifecycle cleanup, forms, state handling, keyboard/focus/accessibility, and relevant responsive/print/theme behavior. Compare changed TypeScript, templates, and styles with neighboring/shared implementations; prefer semantic reuse without demanding abstractions for coincidental duplication.
5. Use `design-and-write-tests` and `validate-web-and-electron` to assess meaningful coverage and whether evidence matches the changed boundaries. Run focused checks only when needed to verify a finding. Never describe author-reported or skipped checks as independently passing.
6. Report only evidence-supported findings, prioritized by impact, with path/line, trigger, consequence, and correction direction. Separate optional cleanup. Explicitly report no actionable findings and list unperformed checks and residual uncertainty.

Do not edit implementation, publish comments/reviews, approve, or merge without the corresponding authorization. Save the full fresh-review report and verify comparison freshness before publication as described in the [PR creation guide](../../../docs/agents/github-pr-creation.md).
