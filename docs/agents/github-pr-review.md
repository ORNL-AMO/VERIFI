# GitHub PR review guide

Use this guide when reviewing VERIFI pull requests in GitHub. It extends the [Reviewer mode](personas.md#reviewer) with GitHub-specific expectations.

## Start

Read the pull request diff, changed files, tests provided by the author, and the matching row in the [task context index](context-index.md). Load only the linked architecture sections, skills, and local source needed to understand the changed contract.

For v1 UI migration work, include the [Angular template guidance](angular-template-guidance.md), [Unified UI/UX migration guide](../unified-ux-migration.md), and [P1 selected prototype baseline](p1-selected-prototype-baseline.md) when they are relevant to the changed files.

## What to prioritize

Lead with actionable findings. Prioritize:

- data preservation, IndexedDB migrations, backup compatibility, and GUID relationships;
- calculation, report, import/export, and Web Worker contract changes;
- Electron preload, IPC, filesystem, dialog, updater, and context-isolation boundaries;
- v0/v1 separation, shared-layer imports, route stability, and workspace state correctness;
- user-visible regressions in loading, empty, validation, error, disabled, success, keyboard, responsive, print, and accessibility states;
- test quality and whether validation matches the actual risk.

Style and maintainability comments are useful when they prevent recurring drift. Mark them as non-blocking when they do not affect behavior.

## V1 Angular review checklist

For production `src/app/v1/` changes, check that the PR:

- keeps v1 production code separate from P1 prototypes and v0 UI;
- avoids `@v0/*` imports from production v1 code;
- organizes code by feature folder rather than broad `pages` or `components` buckets;
- avoids routine `V1` or `v1-` prefixes except at real version boundaries;
- keeps orchestration in components and reusable behavior in services, helpers, pipes, or shared components;
- reads workspace and lifecycle state from existing signals instead of maintaining duplicate component copies;
- uses `computed()` for reusable or non-trivial derived state;
- uses `@let` for repeated object signal reads in a single template view when it improves clarity;
- avoids repeated ordinary method calls, allocations, sorting, filtering, or business logic inside template bindings;
- includes meaningful behavior tests instead of creation-only tests.

Repeated direct signal reads such as `appearance.settings().palette` across several bindings are usually a non-blocking maintainability comment: suggest a local alias like `@let settings = appearance.settings();`. Escalate only when the repeated expression is expensive, unstable, or hides important state.

## Commenting in GitHub

Use precise file and line comments for localized issues. Keep each comment focused on one problem and one expected fix. Group broad architectural or validation concerns in the overall review comment.

Use this severity language:

- `P0`: must fix immediately; severe data loss, security exposure, or unusable application behavior.
- `P1`: should block merge; likely regression, compatibility break, incorrect result, or missing required validation.
- `P2`: should fix before merge when practical; meaningful edge-case, maintainability, accessibility, or test gap.
- `P3`: optional cleanup, consistency, naming, or follow-up suggestion.

Prefer direct wording:

```text
[P2] Alias repeated settings signal reads

This template reads `appearance.settings()` several times to compare fields from the same settings object. Please introduce `@let settings = appearance.settings();` at the top of this view and reuse `settings.palette` so future theme options are easier to review.
```

Do not block a PR on taste alone. If a comment is a nit or follow-up, label it that way.

## Validation review

Check the author's evidence against [testing guidance](../testing.md). For ordinary docs-only changes, link and command inspection can be enough. For production Angular templates, routing, styles, or modules, expect the validation plan to consider `npm run build-prod`; for logic changes, expect focused specs first. Add browser or Electron validation only when the changed boundary requires it.

When there are no actionable findings, say so explicitly and name any validation you did not perform.
