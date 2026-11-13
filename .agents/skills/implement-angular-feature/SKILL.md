---
name: implement-angular-feature
description: Implement or modify VERIFI Angular features, routes, components, services, templates, styles, and user interaction states. Use for user-facing Angular work and UI/UX implementation; do not use for calculation-only, persistence-only, import/export-only, or Electron-main-process-only changes.
---

# Implement an Angular feature

1. Use the task router to read the owning current contract and [Angular template guidance](../../../docs/agents/angular-template-guidance.md). Apply the [Implementer](../../../docs/agents/personas.md#implementer) perspective. Add the [Designer](../../../docs/agents/personas.md#designer) mode for user-facing work and [startup and application shell](../../../ARCHITECTURE.md#startup-and-application-shell) for routing or initialization.
2. Trace the current workflow through `src/app/routing/`, its feature module, component, services, and shared dependencies. Inspect at least one neighboring screen that solves a similar problem. For legacy UI, treat `src/app/v0/shared/` and `@v0/shared/*` as the reusable UI layer; use `src/app/shared/` and `@shared/*` only for version-neutral helpers and contracts.
3. Define the behavior and state transitions before editing. For v0 analysis autosave, keep drafts local, coalesce typing, serialize saves, and flush or resolve unsaved edits before routing or changing owner selections; a save acknowledgement must not overwrite newer input. Bind leave dialogs to the current owner and edit revision, and serialize the complete navigation action through its selection or route change. For UI work, cover loading, empty, validation, error, disabled, and success states plus responsive and accessible behavior.
4. Keep orchestration in components and reusable behavior in services, helpers, pipes, or shared components according to local precedent. Avoid moving domain calculations into templates or presentation components.
5. Keep templates declarative: use direct signal reads for simple one-off bindings, `@let` aliases for repeated object signal reads in one view, and `computed()` for reusable or non-trivial derived state. Use typed reactive forms for production v1 editable workflows, searches, filters, paging, and preferences. Synchronize external state with `emitEvent: false`, deduplicate real edits, and pass typed values or `FileList | null` across component boundaries. Never read values through `event.target`, `$event.target`, or `$any($event.target)`, and never send raw DOM events to outputs, facades, or services. Avoid repeated ordinary method calls, allocation, sorting, filtering, or business logic in template bindings.
6. Put each Angular component in its own folder with its `.ts`, template, styles, and spec files colocated. Do not leave multiple child component file sets side by side in a parent workflow folder.
7. Use configured aliases for cross-boundary imports where appropriate: `@app/*` for app/v1 boundaries, `@shared/*`, `@data/*`, `@domain/*`, and `@platform/*` for version-neutral code, and `@v0/shared/*` for legacy-only shared UI. Keep relative imports for files local to the same feature or component folder.
8. Reuse Bootstrap, ng-bootstrap, Font Awesome, the appropriate shared layer, and existing style layers. Every native `<select>` in a production v1 template must include `v1-select`; add feature-specific classes alongside it rather than replacing it so themes, dark mode, focus, and disabled states stay consistent. Keep feature-specific styles with the component; add global styles only for a genuinely cross-feature rule.
9. Add meaningful behavior tests. Replace or remove creation-only tests that do not verify the changed behavior.

## Conditional feature references

For Meter, Predictor, Energy Use, or Weather workbench editing, read only affected [Data editing](../../../docs/v1-data-editing-architecture.md) sections. They own typed defaults, session lifetime, GUID reconciliation, save acknowledgement, conflict baselines, missing-record drafts, charge interpretation, and unload/route protection. Energy Uses additionally uses its [feature contract](../../../docs/v1-energy-uses-architecture.md). Shared navigation, inventories, modal focus, and scope belong to [workspace architecture](../../../docs/v1-workspace-architecture.md).

## Validate

Use the [testing policy](../../../docs/testing.md#what-a-change-requires) and `validate-web-and-electron` to select checks. Run the scoped planner before handoff. Inspect changed interaction states, keyboard/focus, themes, responsive layout, charts, and printing when relevant. Feature references describe risks; they do not override the common gate policy.

## Guardrails

- Do not introduce a new design system or Angular architecture as part of a feature issue.
- For editing or persistence changes, preserve the draft/reconciliation/recovery rules in the owning feature contract; a committed write with failed publication must never be replayed.
- Do not assume a browser-only API is available in tests or Electron without checking the existing abstraction.
- Do not add template-driven forms in production v1. Existing allowlisted migration debt may remain until its owning workflow is changed.
- Do not change a persisted model, calculation contract, file format, or IPC channel silently; use the matching repository skill.
- Stop for maintainer direction when requirements leave navigation, workflow, destructive behavior, or compatibility policy materially undecided.

Complete with a summary of the user-visible behavior, affected routes/components, tests, builds, and any manual checks.
