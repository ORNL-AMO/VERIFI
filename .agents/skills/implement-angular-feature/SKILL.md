---
name: implement-angular-feature
description: Implement or modify VERIFI Angular features, routes, components, services, templates, styles, and user interaction states. Use for user-facing Angular work and UI/UX implementation; do not use for calculation-only, persistence-only, import/export-only, or Electron-main-process-only changes.
---

# Implement an Angular feature

1. Read [UI architecture](../../../ARCHITECTURE.md#ui-architecture), [Angular template guidance](../../../docs/agents/angular-template-guidance.md), and the [Implementer](../../../docs/agents/personas.md#implementer) mode. Add the [Designer](../../../docs/agents/personas.md#designer) mode for user-facing work and [startup and application shell](../../../ARCHITECTURE.md#startup-and-application-shell) for routing or initialization.
2. Trace the current workflow through `src/app/routing/`, its feature module, component, services, and shared dependencies. Inspect at least one neighboring screen that solves a similar problem. For legacy UI, treat `src/app/v0/shared/` and `@v0/shared/*` as the reusable UI layer; use `src/app/shared/` and `@shared/*` only for version-neutral helpers and contracts.
3. Define the behavior and state transitions before editing. For UI work, cover loading, empty, validation, error, disabled, and success states plus responsive and accessible behavior.
4. Keep orchestration in components and reusable behavior in services, helpers, pipes, or shared components according to local precedent. Avoid moving domain calculations into templates or presentation components.
5. Keep templates declarative: use direct signal reads for simple one-off bindings, `@let` aliases for repeated object signal reads in one view, and `computed()` for reusable or non-trivial derived state. Use typed reactive forms for production v1 editable workflows, searches, filters, paging, and preferences. Synchronize external state with `emitEvent: false`, deduplicate real edits, and pass typed values or `FileList | null` across component boundaries. Never read values through `event.target`, `$event.target`, or `$any($event.target)`, and never send raw DOM events to outputs, facades, or services. Avoid repeated ordinary method calls, allocation, sorting, filtering, or business logic in template bindings.
6. Put each Angular component in its own folder with its `.ts`, template, styles, and spec files colocated. Do not leave multiple child component file sets side by side in a parent workflow folder.
7. Use configured aliases for cross-boundary imports where appropriate: `@app/*` for app/v1 boundaries, `@shared/*`, `@data/*`, `@domain/*`, and `@platform/*` for version-neutral code, and `@v0/shared/*` for legacy-only shared UI. Keep relative imports for files local to the same feature or component folder.
8. Reuse Bootstrap, ng-bootstrap, Font Awesome, the appropriate shared layer, and existing style layers. Every native `<select>` in a production v1 template must include `v1-select`; add feature-specific classes alongside it rather than replacing it so themes, dark mode, focus, and disabled states stay consistent. Keep feature-specific styles with the component; add global styles only for a genuinely cross-feature rule.
9. Add meaningful behavior tests. Replace or remove creation-only tests that do not verify the changed behavior.

## Data workbench editing

For Meter, Standard Predictor, Energy Use, and Weather workbench changes, follow the [Data form architecture](../../../docs/v1-data-form-architecture-roadmap.md).

- Create Data Settings sessions through `injectSettingsEditSession` in an Angular injection context. The host owns effects, subscriptions, timers, and registration cleanup; feature adapters own typed values, normalization, dependent rules, reconciliation, and persistence mapping.
- Key drafts by owner/resource/editor identity, hydrate silently, merge nonconflicting saved values, and review conflicting groups through the shared shell-portal component. Match dynamic records by GUID and retain dirty controls across metadata/validator refreshes.
- Register Data drafts using reactive dirty/blocked signals without a navigation-flush callback. The navigation service owns conditional unload protection; feature editors do not install their own listeners. Use form-state events for pristine/dirty transitions and control/group validators as the field-validity authority. Confirm discard for unsaved values and block writes in progress.
- Keep explicit bill/reading saves and Weather preview/review/atomic commits separate from Settings autosave. Source defaults belong to creation or actual source transitions, never saved hydration.
- When changing defaults, shared value contracts, or queued command execution, include compatibility and real IndexedDB evidence using the matching subsystem skills.
- For Energy Uses, read the feature [current accepted behavior](../../../docs/v1-energy-uses-migration-plan.md#current-accepted-behavior) and [architecture contracts](../../../ARCHITECTURE.md#energy-use-group-workbench). Keep feature requirements at those owners rather than duplicating them in this general workflow.

## Validate

- Use `validate-web-and-electron` and `npm run validate:agent -- --mode plan` to select the final risk-based matrix.
- Prefer focused affected specs first, followed by `npx tsc -p tsconfig.app.json --noEmit` for app TypeScript changes and `npm run build-prod` for production Angular UI/routing/template/style changes.
- Add browser tests only when IndexedDB, Web Workers, File APIs, or native browser APIs are exercised.
- Add Electron build/manual validation only when Electron preload, IPC, filesystem, dialog, shell, updater, Electron environment/config, or explicit desktop release behavior is touched.
- Perform a focused manual pass for interaction states, keyboard operation, responsive layout, charts, and printing when applicable.

## Guardrails

- Do not introduce a new design system or Angular architecture as part of a feature issue.
- Distinguish a rejected write from a committed write whose workspace publication failed. Preserve later edit intent and draft protection until verified, and keep error-provided saved snapshots authoritative across conflict review and discard until a new publication arrives. Cover retry against the feature's reconciliation rules, rather than only asserting a dirty flag.
- Distinguish reset from reconciliation hydration. Keep normalized-equivalent raw text during save acknowledgement and refresh, while reset, identity changes, and discard replace it. Apply cross-field validators to merged values without silently changing retained rows. Keep routed editors mounted when their saved target disappears, and register feature persistence such as deletion with shared blocked/unload protection.
- Do not assume a browser-only API is available in tests or Electron without checking the existing abstraction.
- Do not add template-driven forms in production v1. Existing allowlisted migration debt may remain until its owning workflow is changed.
- Do not change a persisted model, calculation contract, file format, or IPC channel silently; use the matching repository skill.
- Stop for maintainer direction when requirements leave navigation, workflow, destructive behavior, or compatibility policy materially undecided.

Complete with a summary of the user-visible behavior, affected routes/components, tests, builds, and any manual checks.
