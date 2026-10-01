# Data migrations

VERIFI uses data migrations to upgrade the shape and values of persisted records without changing the IndexedDB object-store schema. The same ordered migration registry upgrades both local IndexedDB data during startup and JSON backups during preparation.

## Decide whether a data migration is required

Add a data migration when an existing persisted record may need a new default, renamed property, normalized value, relationship update, or conversion into another supported record shape.

Do not add a data migration solely for a new or changed object store or index. Structural changes belong in [`../_dbConfig.ts`](../_dbConfig.ts), require an intentional IndexedDB database-version increment, and need schema upgrade coverage. A change can require both mechanisms when it alters the schema and existing records.

Before implementation, document:

- The old and new persisted shapes.
- Which collections and GUID relationships are affected.
- How an already-current record is recognized.
- How the transform remains idempotent.
- Whether JSON backups contain the same shape.
- Compatibility consequences for older VERIFI releases.

Once data is upgraded, an older VERIFI release will reject it as a future data version. Treat every `CURRENT_DATA_VERSION` increment as a compatibility decision.

## Add the next migration

If the current version is `N`, add exactly one `N → N + 1` step. Registry validation requires migrations to start at zero, advance one version at a time, remain contiguous and unique, and end at `CURRENT_DATA_VERSION`.

1. Add `version-n-to-n-plus-one.migration.ts` and a neighboring fast unit spec.
2. Implement a pure `DataMigration` using the complete canonical `MigrationData` dataset.
3. Add the migration to `DATA_MIGRATIONS` in [`data-migration.registry.ts`](data-migration.registry.ts).
4. Increment `CURRENT_DATA_VERSION` in [`data-migration.models.ts`](data-migration.models.ts).
5. If a new persisted collection is involved, add it to `MigrationData`, `emptyMigrationData()`, the runner's `COLLECTION_STORES`, and the backup adapters before using it in a migration.
6. Update factories and new JSON exports so newly created data carries the new current version and already has the current defaults.
7. Verify local startup and backup preparation both exercise the new registry step.

Use this shape as a starting point:

```ts
import { DataMigration, MigrationCollectionName, MigrationData } from './data-migration.models';

export const VERSION_N_TO_N_PLUS_ONE_MIGRATION: DataMigration = {
  fromVersion: N,
  toVersion: N + 1,
  description: 'Describe the persisted-data change.',
  affectedStores: ['accounts'],
  migrate(input: MigrationData) {
    const data = structuredClone(input);
    const changed = new Set<MigrationCollectionName>();

    data.accounts.forEach(account => {
      if (account.somePersistedProperty === undefined) {
        account.somePersistedProperty = 'default';
        changed.add('accounts');
      }
    });

    return {
      data,
      changedCollections: [...changed]
    };
  }
};
```

Replace `N` with numeric literals in the real migration and use the repository's established filename and constant naming pattern.

## Migration rules

- Treat the input as immutable. Clone before changing records and preserve unknown properties so supported older backups and marker fields remain readable.
- Keep the transform deterministic. Do not inject Angular services or depend on application state, selection state, the current time, locale-sensitive parsing, or random identifiers.
- Make the transform idempotent. Running it again against its own output must produce equal data and an empty `changedCollections` result.
- Return only collections whose persisted contents changed. The runner reconciles only those collections.
- Retain each existing record's numeric `id`; it is the local IndexedDB key. Use GUIDs for every cross-record and cross-store relationship.
- Give a newly created record no numeric `id`; the transaction runner will add it and IndexedDB will assign the local key.
- To intentionally remove a record, omit it from the transformed collection and mark that collection changed. Confirm the deletion is approved and relationship-safe.
- Include every store that can change in `affectedStores`. The version and all affected records are committed atomically for each migration step.
- Do not repair optional UI selection or report-inclusion references unless the issue explicitly places them in scope.
- Do not move migration behavior into startup loading, account selection, or import code. Those paths must rely on the registry and preparation services.

`affectedStores` documents the migration contract. The current local runner opens the full canonical migration store set so it can construct `MigrationData`; do not depend on that implementation detail when declaring a migration's actual write scope.

## Local data and backup behavior

[`data-migration-runner.service.ts`](data-migration-runner.service.ts) runs before persisted application state is published. Each version step reads the canonical dataset, applies the pure transform, reconciles changed collections, and updates application metadata in one native transaction. A failed request rolls back both the records and the version, and a later call may retry.

[`../../backup/backup-preparation.service.ts`](../../backup/backup-preparation.service.ts) clones an external backup, validates its envelope and version, defaults supported missing collections, runs the same registry, and validates core GUID relationships before import code can remap GUIDs, delete replacement data, or write records.

Keep `BackupFile.dataVersion` optional because supported legacy backups are unversioned and are treated as version zero. New account and facility exports must always write `CURRENT_DATA_VERSION`. Never mutate the parsed backup object during preparation or GUID remapping.

## Required tests

For the pure migration, cover:

- Every affected record family and important old-shape variant.
- Already-current input as a no-op.
- A second run as a no-op.
- Source immutability and unknown-property preservation.
- Date, unit, empty-value, and relationship boundaries relevant to the transform.
- Creation and intentional deletion of records, when applicable.

For the registry and real IndexedDB runner, cover:

- Registry contiguity through the new current version.
- Fresh, legacy, current, invalid-version, and future-version databases.
- Atomic commit, forced rollback, unchanged version after failure, retry, and reopen.
- Numeric ID retention and GUID relationship preservation.
- A realistically large affected dataset when migration cost could be material.

For JSON backups, cover legacy unversioned and current account/facility files, missing supported collections, migration failures, core relationship failures, source immutability, and every affected restore entry point.

Run the focused specs while developing. Before handoff, run:

```bash
npm run test:all:ci
npm run build-prod
npm run build-prod-electron
```

In the handoff, state the old and new shapes, trigger, idempotency strategy, compatibility impact, and validation evidence.
