---
name: implement-angular-feature
description: Implement or modify VERIFI Angular features, routes, components, services, templates, styles, and user interaction states. Use for user-facing Angular work and UI/UX implementation; do not use for calculation-only, persistence-only, import/export-only, or Electron-main-process-only changes.
---

# Implement an Angular feature

1. Read [`AGENTS.md`](../../../AGENTS.md), the relevant section of [`ARCHITECTURE.md`](../../../ARCHITECTURE.md), and the Implementer mode in [`docs/agents/personas.md`](../../../docs/agents/personas.md). Add the Designer mode for user-facing work.
2. Trace the current workflow through `src/app/routing/`, its feature module, component, services, and shared dependencies. Inspect at least one neighboring screen that solves a similar problem.
3. Define the behavior and state transitions before editing. For UI work, cover loading, empty, validation, error, disabled, and success states plus responsive and accessible behavior.
4. Preserve the repository's NgModule-based, non-standalone component pattern unless the surrounding feature has deliberately migrated. Register declarations, imports, providers, and routes in the nearest existing module.
5. Keep orchestration in components and reusable behavior in services, helpers, pipes, or shared components according to local precedent. Avoid moving domain calculations into templates or presentation components.
6. Reuse Bootstrap, ng-bootstrap, Font Awesome, shared components, and existing style layers. Keep feature-specific styles with the component; add global styles only for a genuinely cross-feature rule.
7. Add meaningful behavior tests. Replace or remove creation-only tests that do not verify the changed behavior.

## Validate

- Run `npm run test:ci` for ordinary component, service, pipe, and utility behavior.
- Run `npm run test:browser:ci` when the feature uses IndexedDB, Web Workers, or native browser APIs.
- Run `npm run build-prod` for web-facing changes.
- Also run `npm run build-prod-electron` when shared renderer behavior, routing, files, or desktop presentation can be affected.
- Perform a focused manual pass for interaction states, keyboard operation, responsive layout, charts, and printing when applicable.

## Guardrails

- Do not introduce a new design system or Angular architecture as part of a feature issue.
- Do not assume a browser-only API is available in tests or Electron without checking the existing abstraction.
- Do not change a persisted model, calculation contract, file format, or IPC channel silently; use the matching repository skill.
- Stop for maintainer direction when requirements leave navigation, workflow, destructive behavior, or compatibility policy materially undecided.

Complete with a summary of the user-visible behavior, affected routes/components, tests, builds, and any manual checks.
