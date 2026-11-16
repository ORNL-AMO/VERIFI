# V1 saved visualization persistence

This reference owns storage, command, copy, backup, and recovery contracts. Definition meaning belongs to the [foundation](v1-visualization-foundation.md), editor state to the [workbench](v1-visualization-workbench.md), and utility display overrides to [utility visualizations](v1-utility-visualizations.md).

## Durable ownership and versions

The account-owned `savedVisualizations` IndexedDB store contains GUID, local numeric key, account ownership, record version, saved revision, timestamps, definition payload, and preservation metadata. Definitions store authoritative `facilitySelection`: live All or a nonempty fixed facility GUID set. One configured fixed facility, or one currently available facility for All, derives facility ownership; zero or multiple All facilities and fixed sets of multiple facilities derive account ownership. Missing fixed identities remain repairable intent. Current records omit envelope facility ID; opaque preserved payloads retain that field only as ownership/transfer context. `savedVisualization.ts` follows existing `IdbEntry` factories; decoding/version/backup validation belongs to `data/visualizations/saved-visualization-record.ts`, including serialized backup dates. The domain definition is independent of Angular and IndexedDB.

Keep structural database version, record/definition formats, saved revision, and committed workspace revision distinct. The store has GUID/account/facility indexes. Numeric keys never identify cross-record relationships. Initial record format routing is pure, idempotent, and preservation-oriented; future transformations use the ordered migration boundary, never loading or account selection. Migration/recovery datasets include visualizations. Definitions use one current greenfield schema; superseded definition shapes have no historical decoder or upgrade adapter. Store structure and record/backup envelope versions remain unchanged.

The global backup data version is unchanged. Supported older backups default a missing visualization collection to empty. Older app releases may restore a new backup while omitting visualizations: backward preservation is not guaranteed. Existing rejection of future global data versions remains authoritative.

## Commands and publication recovery

Creation/duplication proposals allocate one stable GUID before submission and retain it across retries. If persistence commits but publication fails, recover by that identity; do not allocate again or replay a mutation. Supported coherent incomplete definitions can save while sources/calculations are unavailable. Malformed or unsupported ordinary edits are rejected. Store serializable intent, never computed results, instances, executable callbacks, navigation, or temporary interaction state.

Update/delete compare expected saved revision atomically with durable revision. Conflicts expose authoritative saved intent without replacing a retained proposal. Account and facility selection are immutable through ordinary updates. A dedicated reviewed `retarget` command retains GUID/local ID/creation date, compares the saved revision, validates target ownership, and recomputes selective pruning against the transaction catalog. Its result must equal the reviewed proposal before one revision increment. Missing or unclassified identities remain repairable; known excluded bindings and item presentation are removed, and exhausted restrictive rules return to setup rather than widening. Readable transferred definitions can repair inclusion while unrelated preservation issues stay protected. Duplication retains selection with independent identity; copying to different facilities requires explicit source review.

The account command queue owns writes, followed by one committed publication. Rejected persistence differs from committed-but-unpublished state. Publication recovery reads committed data without mutation replay; before another queued mutation, recover authoritative state. Acknowledgements cannot restore departed selections or overwrite newer local edits. Failed proposals are protected in the live session; no durable draft journal exists. Autosave, field reconciliation, and leave protection belong to the workbench.

## References and transfer rules

Traverse typed reference paths rather than recursively replacing strings. Include fixed facility inclusion, resource selections, rule anchors, selected series, charge owners, analyses/groups, pinned models, and known optional display references. Definition-local source/series IDs remain local identities.

Analysis groups reference durable meter groups. Model IDs are qualified by analysis/group; charges by meter. Child IDs remain unchanged only when their mapped parent contains the child. Unknown resource kinds block rather than guess. Inspection neither calculates nor substitutes a selected model.

Account transfers include all definitions. Facility exports/extraction include only definitions whose derived owner is that facility, excluding account charts merely referring to it. They pin singleton All to the exported facility before mapping, so importing cannot expand inclusion across the destination account. Account export preserves live All. Selective multi-facility imports gather source mappings before definitions. Imported definitions receive independent GUIDs; mappings never use names or numeric keys.

Missing/excluded sources retain original intent and durable reference blocks so coincident destination records cannot satisfy them, including after repeated transfers. Explicit repair replaces or acknowledges affected intent. Renames preserve identity; ordinary source deletion does not rewrite definitions. Live membership retains its declared behavior. Known utility presentation references use the mapping/dormancy rules in the utility owner.

Unreadable payloads remain opaque and preserved. Transfers lock unreadable records and retain ordered transfer maps; later format recognition does not automatically verify relationships. Re-export retains original payload and context. Contradictory outer identity/ownership, duplicate identities, and malformed preservation metadata reject preparation before replacement deletion or writes.

## Deletion and restore

Account deletion removes owned definitions. Facility deletion removes definitions owned by that facility against the pre-delete catalog in the same native transaction; account definitions retain broken references. A sole-facility All chart is therefore removed with its facility. Selected-facility replacement uses one original ownership catalog across its complete batch. Facility replacement removes existing definitions even when an older incoming backup contains none. Individual source deletion retains definitions for explicit repair.

Restore returns account-scoped totals, locked/repair counts, and reasons. Import workflows retain an accessible attention summary after navigation; facility backup comparisons include visualization differences. Automatic backups use committed workspace revisions and existing serialization/file gateways without new IPC or dialog contracts.

## Validation and remaining boundaries

Fast coverage protects format routing, incomplete/unknown/malformed data, typed mapping, immutability, repeat transfers, collisions, and command outcomes. Native tests protect historical schemas, reopen/isolation, conflicts/rollback, publication-only recovery, cascade/replacement, transfers, old backups, feedback, and automatic serialization. Historical schema fixtures must not derive old store inventories from current configuration. Select checks through [testing policy](testing.md) and the validation planner.

Home storage and widget dependency review remain pending. Production utility rendering/editing and cross-scope visualization review already exist through their owning contracts; persistence does not duplicate their UI state machines.
