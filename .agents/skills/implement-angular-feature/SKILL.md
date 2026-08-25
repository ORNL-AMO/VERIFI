---
name: implement-angular-feature
description: Implement or modify VERIFI Angular features, routes, components, services, templates, styles, and user interaction states. Use for user-facing Angular work and UI/UX implementation; do not use for calculation-only, persistence-only, import/export-only, or Electron-main-process-only changes.
---

# Implement an Angular feature

1. Read [UI architecture](../../../ARCHITECTURE.md#ui-architecture) and the [Implementer](../../../docs/agents/personas.md#implementer) mode. Add the [Designer](../../../docs/agents/personas.md#designer) mode for user-facing work and [startup and application shell](../../../ARCHITECTURE.md#startup-and-application-shell) for routing or initialization.
2. Trace the current workflow through `src/app/routing/`, its feature module, component, services, and shared dependencies. Inspect at least one neighboring screen that solves a similar problem. For legacy UI, treat `src/app/v0/shared/` and `@v0/shared/*` as the reusable UI layer; use `src/app/shared/` and `@shared/*` only for version-neutral helpers and contracts.
3. Define the behavior and state transitions before editing. For UI work, cover loading, empty, validation, error, disabled, and success states plus responsive and accessible behavior.
4. Keep orchestration in components and reusable behavior in services, helpers, pipes, or shared components according to local precedent. Avoid moving domain calculations into templates or presentation components.
5. Reuse Bootstrap, ng-bootstrap, Font Awesome, the appropriate shared layer, and existing style layers. Keep feature-specific styles with the component; add global styles only for a genuinely cross-feature rule.
6. Add meaningful behavior tests. Replace or remove creation-only tests that do not verify the changed behavior.

## Validate

- Use `validate-web-and-electron` and `npm run validate:agent -- --mode plan` to select the final risk-based matrix.
- Prefer focused affected specs first, followed by `npx tsc -p tsconfig.app.json --noEmit` for app TypeScript changes and `npm run build-prod` for production Angular UI/routing/template/style changes.
- Add browser tests only when IndexedDB, Web Workers, File APIs, or native browser APIs are exercised.
- Add Electron build/manual validation only when Electron preload, IPC, filesystem, dialog, shell, updater, Electron environment/config, or explicit desktop release behavior is touched.
- Perform a focused manual pass for interaction states, keyboard operation, responsive layout, charts, and printing when applicable.

## Guardrails

- Do not introduce a new design system or Angular architecture as part of a feature issue.
- Do not assume a browser-only API is available in tests or Electron without checking the existing abstraction.
- Do not change a persisted model, calculation contract, file format, or IPC channel silently; use the matching repository skill.
- Stop for maintainer direction when requirements leave navigation, workflow, destructive behavior, or compatibility policy materially undecided.

Complete with a summary of the user-visible behavior, affected routes/components, tests, builds, and any manual checks.
