# V1 saved visualization persistence

This reference owns storage, command, copy, backup, and recovery contracts. Definition meaning belongs to the [foundation](v1-visualization-foundation.md), editor state to the [workbench](v1-visualization-workbench.md), and utility display overrides to [utility visualizations](v1-utility-visualizations.md).

## Durable ownership and versions

The account-owned `savedVisualizations` IndexedDB store contains GUID, local numeric key, account/facility ownership, record version, saved revision, timestamps, definition payload, and preservation metadata. Facility-scoped definitions additionally name their owning facility. `savedVisualization.ts` follows existing `IdbEntry` factories; decoding/version/backup validation belongs to `data/visualizations/saved-visualization-record.ts`, including serialized backup dates. The domain definition is independent of Angular and IndexedDB.

Keep structural database version, record/definition formats, saved revision, and committed workspace revision distinct. The store has GUID/account/facility indexes. Numeric keys never identify cross-record relationships. Initial record format routing is pure, idempotent, and preservation-oriented; future transformations use the ordered migration boundary, never loading or account selection. Migration/recovery datasets include visualizations. Current definition version 2 decodes version-1 intent in memory without a read-time write; an actual edit persists the current format.

The global backup data version is unchanged. Supported older backups default a missing visualization collection to empty. Older app releases may restore a new backup while omitting visualizations: backward preservation is not guaranteed. Existing rejection of future global data versions remains authoritative.

## Commands and publication recovery

Creation/duplication proposals allocate one stable GUID before submission and retain it across retries. If persistence commits but publication fails, recover by that identity; do not allocate again or replay a mutation. Supported coherent incomplete definitions can save while sources/calculations are unavailable. Malformed or unsupported ordinary edits are rejected. Store serializable intent, never computed results, instances, executable callbacks, navigation, or temporary interaction state.

Update/delete compare expected saved revision atomically with durable revision. Conflicts expose authoritative saved intent without replacing a retained proposal. Account/scope are immutable for an identity. Same-scope duplication creates independent identity, dates, and revision; cross-scope copying requires the workbench's explicit source review.

The account command queue owns writes, followed by one committed publication. Rejected persistence differs from committed-but-unpublished state. Publication recovery reads committed data without mutation replay; before another queued mutation, recover authoritative state. Acknowledgements cannot restore departed selections or overwrite newer local edits. Failed proposals are protected in the live session; no durable draft journal exists. Autosave, field reconciliation, and leave protection belong to the workbench.

## References and transfer rules

Traverse typed reference paths rather than recursively replacing strings. Include scope, fixed selections, rule anchors, selected series, charge owners, analyses/groups, pinned models, and known optional display references. Definition-local source/series IDs remain local identities.

Analysis groups reference durable meter groups. Model IDs are qualified by analysis/group; charges by meter. Child IDs remain unchanged only when their mapped parent contains the child. Unknown resource kinds block rather than guess. Inspection neither calculates nor substitutes a selected model.

Account transfers include all definitions. Facility exports/extraction/copies include only definitions scoped to that facility, excluding portfolio charts merely referring to it. Selective multi-facility imports gather source mappings before definitions. Imported definitions receive independent GUIDs; mappings never use names or numeric keys.

Missing/excluded sources retain original intent and durable reference blocks so coincident destination records cannot satisfy them, including after repeated transfers. Explicit repair replaces or acknowledges affected intent. Renames preserve identity; ordinary source deletion does not rewrite definitions. Live membership retains its declared behavior. Known utility presentation references use the mapping/dormancy rules in the utility owner.

Unreadable payloads remain opaque and preserved. Transfers lock unreadable records and retain ordered transfer maps; later format recognition does not automatically verify relationships. Re-export retains original payload and context. Contradictory outer identity/ownership, duplicate identities, and malformed preservation metadata reject preparation before replacement deletion or writes.

## Deletion and restore

Account deletion removes owned definitions. Facility deletion removes facility-scoped definitions in the same native transaction; portfolio definitions retain broken references. Facility replacement removes existing definitions even when an older incoming backup contains none. Individual source deletion retains definitions for explicit repair.

Restore returns account-scoped totals, locked/repair counts, and reasons. Import workflows retain an accessible attention summary after navigation; facility backup comparisons include visualization differences. Automatic backups use committed workspace revisions and existing serialization/file gateways without new IPC or dialog contracts.

## Validation and remaining boundaries

Fast coverage protects format routing, incomplete/unknown/malformed data, typed mapping, immutability, repeat transfers, collisions, and command outcomes. Native tests protect historical schemas, reopen/isolation, conflicts/rollback, publication-only recovery, cascade/replacement, transfers, old backups, feedback, and automatic serialization. Historical schema fixtures must not derive old store inventories from current configuration. Select checks through [testing policy](testing.md) and the validation planner.

Home storage and widget dependency review remain pending. Production utility rendering/editing and cross-scope visualization review already exist through their owning contracts; persistence does not duplicate their UI state machines.
