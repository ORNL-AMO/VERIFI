---
name: review-code-changes
description: Review VERIFI code changes or pull requests for correctness, architecture, Angular design, reuse, tests, and validation. Use for implementation reviews and risk assessments; do not use for design-only feedback without code.
---

# Review code changes

1. Read the [Reviewer](../../../docs/agents/personas.md#reviewer) mode and the matching row in the [task context index](../../../docs/agents/context-index.md). For a pull request, also read the [GitHub PR review guide](../../../docs/agents/github-pr-review.md). Load the affected architecture sections and subsystem skills before judging the implementation.
2. Establish the complete comparison and the intended behavior. Read the changed tests, documentation, and validation evidence, then trace affected entry points, owners, consumers, shared contracts, and compatibility paths beyond the changed lines.
3. Review in focused passes:
   - **Correctness and architecture:** Check data and control flow, ownership, lifecycle, cancellation, error handling, compatibility, and whether the implementation preserves documented boundaries and invariants.
   - **Angular and UI:** For Angular changes, apply the [Angular template guidance](../../../docs/agents/angular-template-guidance.md) and `implement-angular-feature`. Check component, service, and route-context responsibilities; signals and derived state; typed reactive forms and semantic outputs; accessibility; responsive behavior; and shared-layer imports.
   - **Reuse and maintainability:** Compare changed TypeScript, templates, and styles with neighboring features, shared components, and global style layers. Identify repeated semantic presentation, interaction, or data-shaping patterns that should reuse or extend an existing abstraction. Treat matching low-level declarations as coincidental until shared meaning and a stable ownership boundary justify extraction.
   - **Tests and validation:** Use `design-and-write-tests` to assess observable behavior and regression coverage. Use `validate-web-and-electron` to judge whether the evidence matches the changed runtime boundaries, and run focused checks when they are needed to verify a finding.
4. Inspect CSS as code. Flag copied component style blocks, repeated semantic selectors, or feature rules that duplicate an established shared component or class. Do not request a global rule merely because a few declarations match; prefer shared components or semantic classes only when the behavior and visual contract are intentionally common.
5. Report only findings supported by precise evidence. Prioritize defects and regression risks before non-blocking cleanup, state the impact and expected correction, and avoid comments based only on taste. Explicitly report when no actionable findings remain and list validation not performed.

Do not edit the reviewed implementation unless the user separately requests fixes. Do not post or approve a review in GitHub without authorization.
