# V1 Saved Visualization Persistence

This implements [Vis2 / #2903](https://github.com/ORNL-AMO/VERIFI/issues/2903) in the [Visualizations and Home plan](v1-visualizations-and-home-plan.md). It extends the [Vis1 definition contract](v1-visualization-foundation.md), without enabling the Visualizations destination or building its editor.

## Durable ownership and versions

`savedVisualizations` is an account-owned IndexedDB store. A facility-scoped record additionally declares its owning facility. The envelope holds the GUID, local numeric key, ownership, record version, saved revision, timestamps, definition payload, and any preservation metadata. The domain definition remains independent of Angular and IndexedDB.

Three versions have different purposes: record/definition versions describe durable formats, the saved revision protects an individual definition from stale writes, and the workspace revision identifies committed application state. Numeric IndexedDB keys never identify sources or cross-record relationships.

The structural database version advances to create the store and its GUID/account/facility indexes. Existing source records are unchanged. The initial record format has no historical transformation; its pure version router is idempotent and preserves unsupported data. Future record transformations belong to the existing ordered migration boundary, not loading or account selection. Migration and recovery datasets include the new collection.

**Compatibility decision:** the global backup data version does not increase. Supported older backups default a missing visualization collection to empty. Older VERIFI releases may restore new backup files while omitting visualizations. This is an accepted portability limitation, not a guarantee of backwards preservation. Existing rejection of future global data versions remains intact.

## Commands and recovery

Feature callers prepare creation/duplication proposals before submitting them through the workspace command boundary. The proposal owns a stable new GUID across retries. A committed creation followed by failed publication is recovered by that identity; Retry must not allocate another identity.

Supported, coherent incomplete definitions are saveable, including definitions whose sources or calculations are unavailable. Malformed or unsupported ordinary edits are rejected. Only serializable intent is stored: no generated results, ECharts instances, callbacks, navigation, hover or zoom.

Update and delete compare the expected saved revision atomically with the stored revision. Conflicts return authoritative saved intent without replacing the caller's proposal. Account and scope are immutable for an existing identity. Same-scope duplication creates independent identity, dates and revision while retaining intent. Cross-scope duplication and its explicit source review belong to Vis3.

Writes are queued by the existing account command boundary, followed by one committed publication. Publication failure is distinct from persistence rejection. Recovery requests publication and reads committed data; it never replays the mutation. Acknowledgements do not restore a departed selection or overwrite later local input. Failed proposals are protected within the live session; no durable draft journal is introduced.

Vis3 owns autosave debounce, editor field state, saved-versus-local conflict review, guarded navigation, and the repair interface. The command/read contracts expose enough information for those behaviors without implementing a second editor state machine here.

## References and transfer rules

References are traversed by typed paths, never by recursively replacing matching strings. Scope, fixed selections, rule anchors, selected series, charge owners, analyses/groups and pinned models participate. Definition-local source and series IDs are unchanged.

Analysis group references identify their durable meter group. Model IDs are qualified by analysis and group; charge GUIDs are qualified by meter. Their child IDs may remain unchanged only when their owning imported resource contains the corresponding child. Resource kinds that cannot be classified are blocked rather than guessed. Reference inspection does not run calculations or substitute a currently selected model.

Account transfers include all definitions. Facility exports, extraction and copies include only definitions scoped to that facility, regardless of portfolio charts referring to it. Selective multi-facility imports accumulate all source mappings before importing definitions. Every imported definition receives independent identity; source mappings use GUIDs, not names or local keys.

A missing or excluded source retains its original intent and a durable reference block. Destination records cannot satisfy that reference accidentally, including after another export/import. Repair must explicitly replace or acknowledge the affected source intent. Source renames leave identity intact; ordinary source deletion does not rewrite saved definitions. Rule-based membership retains its intentionally changing semantics.

Unreadable payloads are preserved, not normalized or discarded. A transferred unreadable record is locked and retains ordered transfer maps. Recognizing its format in a later app does not automatically verify its relationships. Re-export preserves the original payload and transfer context. Invalid or contradictory outer identity/ownership, duplicate saved identities, and malformed preservation metadata reject preparation before replacement deletion or writes.

## Deletion and restore feedback

Account deletion removes all owned visualizations. Facility deletion removes definitions scoped to that facility in the same native transaction. Portfolio definitions retain broken fixed references. Facility replacement is complete replacement: existing facility definitions are removed even if the incoming older backup contains none. Removing individual sources retains saved definitions for repair.

Restore returns structured account-scoped totals, locked counts, repair counts and reasons. Existing import workflows show a persistent accessible summary when attention is required, including after navigation. Facility backup comparisons include visualization differences. This does not add a library route or repair controls.

Automatic backups continue using committed workspace revisions and the existing serializer/file gateway. No IPC or file-dialog contract changes.

## Local delivery stack and acceptance

| Branch | Owns | Prerequisite |
| --- | --- | --- |
| `codex/vis2-contracts` | This specification, envelope/read contracts, typed references, version routing and fast contract tests | `unified-ux` with Vis1 |
| `codex/vis2-storage` | Store/index/schema upgrade, repositories, workspace and migration/recovery collection | Contracts |
| `codex/vis2-commands` | CRUD, stable proposals, conflict checking, reference inspection and publication recovery | Storage |
| `codex/vis2-portability` | Backup collection, preparation, GUID mapping, isolation, round trips and summaries | Commands |
| `codex/vis2-lifecycle` | Cascade/replacement integration, visible feedback, combined acceptance and handoff | Portability |

Each branch targets its predecessor; the first targets `unified-ux`. Each slice owns its tests. Parallel work uses pinned interfaces and disjoint file ownership, with one integrator controlling shared contracts and transaction orchestration. Each PR follows the [two-stage review workflow](agents/pr-workflow.md), includes both review records and non-closing `Connects #2903`; implementation does not authorize publication or merge.

Fast tests cover mapping/version routing, malformed and unsupported data, incomplete intent, source immutability, repeated transfers, collisions, and command outcomes. Chromium tests cover genuine historical schemas, reopen, account isolation, atomic conflicts/rollback, publication recovery without replay, cascade deletion/replacement, representative account/facility/selective transfers and old backups. A historical schema fixture must not derive the old store inventory from the current configuration.

Final validation uses the repository validation planner, app type-check, full tests, production web and Electron builds, accessible restore feedback, and automatic-backup serialization through the existing gateway. The final handoff records actual results and gaps. Home storage, widget dependency review, rendering, providers, calculation changes and cross-scope duplication remain downstream work.
