---
name: change-indexeddb-persistence
description: Change VERIFI persisted models, IndexedDB stores or indexes, database services, record defaults, data migrations, or backup compatibility. Use whenever existing or newly imported user data may be read, written, upgraded, related, or deleted differently.
---

# Change IndexedDB persistence

1. Read [Domain and persistence](../../../ARCHITECTURE.md#domain-and-persistence) plus the [Implementer](../../../docs/agents/personas.md#implementer) and [Reviewer](../../../docs/agents/personas.md#reviewer) modes.
2. Trace the record through its interface/factory in `src/app/models/idbModels/`, object-store service in `src/app/indexedDB/`, `_dbConfig.ts`, application initialization, selection state, import, export, backup, and delete paths.
3. Distinguish the change type:
   - A record property may require model defaults and an idempotent record migration without changing the structural schema.
   - A new or changed store or index requires `_dbConfig.ts`, an intentional database-version increment, and upgrade coverage.
4. Preserve the difference between local IndexedDB `id` keys and GUID-based domain relationships. Audit account, facility, meter, predictor, analysis, and report references affected by the change.
5. Implement record upgrades in the nearest established migration/defaulting path, such as model factories, `update-db-entry.service.ts`, `db-changes.service.ts`, or a focused migration service. Make the operation safe to run more than once.
6. Preserve older JSON backups and supported import formats. Default missing fields intentionally and avoid destructive rewriting unless the issue explicitly approves it.
7. Update service state after writes using the same observable/`BehaviorSubject` pattern as neighboring services.

## Validate

- Add fast unit tests for pure defaults, transformations, and service decisions.
- Add or extend `*.browser.spec.ts` coverage for real IndexedDB behavior.
- Test a fresh database and representative pre-change records; verify relationships and values survive reopening or reselection.
- Exercise backup import/export when the persisted shape appears in backups.
- Run `npm run test:all:ci`, `npm run build-prod`, and `npm run build-prod-electron` before handoff.

## Guardrails

- Do not increment the database version for an ordinary record property unless the IndexedDB store/index structure changes.
- Do not add a migration that depends on a one-time in-memory state or silently drops unknown data.
- Do not reuse numeric IDs as cross-store identifiers.
- Stop for approval before a destructive or intentionally backward-incompatible migration.

Complete with the old and new shapes, migration trigger, idempotency strategy, compatibility impact, and validation evidence.
