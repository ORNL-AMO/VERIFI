# V1 Home persistence

The [Home specification](v1-home-dashboard-spec.md) owns the accepted experience. This reference owns the implementing persistence contracts; the [delivery phases](v1-home-dashboard-plan.md) track pending work. UI, runtime reporting resolution, rendering, summary adapters and complete starter recipes remain Home3–Home6 work.

## Records and compatibility

Structural IndexedDB version 22 adds `homeDashboards` and `homeOwners`, each with local numeric keys and GUID/account/facility indexes. Existing stores and records are preserved. Both new stores start empty; startup and hydration never seed templates. Record/payload format 1, saved revision, structural database version and committed workspace revision are separate contracts. Global data version stays unchanged: no existing record needs rewriting. Migration/recovery datasets retain both Home collections, including unknown payloads.

Dashboards have explicit account ownership and optional exact facility ownership. Ownership never derives from linked chart inclusion. Layouts store ordered, independently identified widgets, Half/Full sizes, typed settings, explicit display inheritance/overrides and saved dashboard defaults. Chart widgets contain same-account saved visualization GUIDs. They never embed independent definitions, computed values or browsing state. Notes are plain text; shortcuts use typed internal areas/owner/resource identities rather than arbitrary URLs.

Each store has its own record model/factory and persistence-only repository, following the existing per-store pattern. Their common envelope shares ownership, revision and preservation contracts; application commands retain responsibility for cross-store atomicity.

Owner records retain initialization, saved sidebar order, selected default and deleted starter identities. An initialized empty set is durable intent. Invalid/hidden defaults resolve in saved visible order without hydration writes. Single-facility presentation selects the sole owned facility only for a valid flagged account; portfolios retain account ownership even with one facility. No Home contract creates source data or hidden account analysis pairs.

Template provenance records template/revision, original automatic status, a layout baseline, linked starter-chart revision baselines and sticky customization protection. Unsupported record/payload formats retain opaque JSON and remain unavailable. Envelopes validate identities, revisions, dates and preservation metadata independently of payload decoding. Ordinary supported writes must pass the strict current grammar.

Older backups without Home collections remain supported. New Home collections are optional additions to the existing envelope; older releases may omit them on restore, so backward preservation by those releases is not guaranteed. Home graph transfer and command integration are delivered by the remaining Home2 slices before activation.

## Reporting bindings

Existing `analysisGuid` targets remain exact. Result sources may instead declare `reporting: { kind: 'reporting', owner: { kind, guid }, category }`, with account/facility owner and energy/water category. Rules cannot also pin an analysis or group. Model sources remain exact. Grouped serialization retains the rule unchanged; runtime resolution and editor support belong to Home4 and no latest-modified fallback is introduced.

Account rules remap only with their owning account; facility rules use the verified facility namespace. Missing mappings remain durably blocked across repeated transfers, even if a destination identity coincides later. The selected reporting analysis is runtime evidence, never a saved substitution for the rule. The existing [visualization persistence contract](v1-visualization-persistence.md) continues to own chart record/deletion/transfer behavior.
