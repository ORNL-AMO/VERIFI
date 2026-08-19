# Unified UI/UX Migration Guide

This guide keeps the v0/v1 migration lightweight. Do not create an exhaustive capability register before implementation. Record workflow decisions when a workflow is actively planned, built, deferred, temporarily routed to v0, combined with another workflow, or intentionally retired.

## Source Layout

- `src/app/v0/` contains UI that belongs to the current production experience. Its public routes remain stable; moving source into v0 must not add a `/v0` URL prefix.
- `src/app/v1/` contains the opt-in production unified workspace reached through `/v1`.
- `src/app/ux-prototypes/` contains temporary prototype routes such as `/p1`. Prototype code can inform v1, but production v1 should not depend on prototype-only components unless they are deliberately promoted.
- Shared non-UI logic stays outside v0 and v1 so both experiences can use the same contracts.

The current source tree is transitional. Legacy feature folders may still live outside `src/app/v0/` until they are moved in behavior-preserving batches.

## Shared Contracts

Protect these contracts unless a dedicated issue approves the change and defines compatibility:

- IndexedDB stores, indexes, migrations, and GUID relationships.
- Account workspace state, command boundaries, and committed refresh behavior.
- JSON backups, restore preparation, imports, exports, templates, and generated report files.
- Calculations, validation/status checks, units, rounding, report totals, and Web Worker payloads.
- Electron preload allowlists, IPC channels, file handling, update behavior, and browser fallbacks.
- Persisted models and factories used by both UI versions.

## Workflow Decisions

When a workflow enters v1 planning or implementation, add a short note to its issue or pull request using this template:

```markdown
### Unified UX Migration

- Area:
- v1 disposition: Rebuild | Share logic | Temporary v0 route | Combine | Defer | Retire
- Protected behavior:
- Intentional behavior changes:
- Prototype reference:
- Tests:
```

Use the smallest useful note. The goal is to preserve important decisions, not to maintain a parallel inventory of the application.

## Implementation Rules

- Do not add v0/v1 mode conditionals to legacy components.
- Rebuild v1 UI components in `src/app/v1/` using the unified workspace direction and P1 learnings.
- Reuse services, models, calculations, persistence, backup/import/export logic, Electron boundaries, and workers when they are not tied to legacy presentation behavior.
- Extract shared logic from mixed UI components before sharing it with v1.
- Keep legacy public URLs stable while v0 remains the default experience.
- Use `/v1` as the explicit opt-in entry for production v1 work.

## Validation

- Behavior-preserving shell or directory moves: run `npm run test:ci`, `npm run build-prod`, and `npm run build-prod-electron`.
- Shared logic, persistence, import/export, Worker, or Electron changes: use the validation tier for that contract from `docs/testing.md`.
- v1 workflow changes: add focused behavior tests for the workflow and browser/Electron checks only when the changed behavior crosses those runtime boundaries.
