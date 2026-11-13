# V1 Data editing architecture

Current reference for Meter, Standard Predictor, Energy Use, and Weather editing. Feature adapters own typed values, defaults, validation, normalization, dependencies, and record mapping. Shared code under [`v1/data/editing`](../src/app/v1/data/editing/) owns scheduling, acknowledgement, reconciliation, and draft protection; command handlers own persistence. [Energy Uses architecture](v1-energy-uses-architecture.md) owns its screen and annual-history contract. Reports and account/facility Settings retain their own editing lifecycles.

## Values, defaults, and mapping

Separate committed-record projection, editable-value normalization, equality, and persistence mapping. Equality never invokes calculations or a persistence mapper. Explicit typed control/value contracts cover Settings, charge definitions, bills, and bill charges; shared sections and import editing reuse their builders/mappers. `getRawValue()` preserves disabled values and optional empty controls map explicitly to optional domain values. Meter account numbers retain numeric or text type, including leading zeros and letters, through editing and supported file round trips.

Apply explicit meter defaults only for creation or actual source transitions. Hydration, copying, and import editing preserve saved setup instead of repairing it from facility defaults. Source/group selection is one coherent setup: retain an incompatible group after a source transition and pause autosave with an explanation until the user explicitly selects a compatible owned group or Ungrouped. Queue execution rechecks compatibility/ownership. Ungrouped retains the optional `groupId` shape and does not change readings.

## Settings session

[`SettingsEditSession`](../src/app/v1/data/editing/settings-edit-session.ts) serves Meter, Standard Predictor, and Energy Use adapters independently of Report editing. Construct it using `injectSettingsEditSession(adapter)` in an Angular injection context; host destruction releases effects, subscriptions, timers, and draft registration.

Key sessions by account, facility, resource, and generation. A deduplicated change stream applies dependent rules before snapshot delivery. Text uses a 650 ms deadline, immediate intents/explicit saves are due immediately, and one running save coalesces the latest draft. Typing or reversion during a write remains pending until acknowledgement is reconciled against the submitted snapshot. Invalid values never write; failures retain editable values for retry or another valid edit, and obsolete callbacks cannot affect a replacement session. Optional `ownerId` is command/pending-operation metadata only, never a persisted or backup field: keep Settings editable during its own save/reload while unrelated operations retain their availability restrictions. Commands resolve latest records at execution and preserve native atomic writes and one committed publication.

## Reconciliation and conflict review

[`draft-reconciliation`](../src/app/v1/data/editing/draft-reconciliation.ts) compares baseline, local values, and current committed values. Pristine forms hydrate silently; dirty forms accept untouched-field changes without shortening their save deadline. Unchanged projections do not rebuild controls or steal focus.

- Merge coupled source/unit/dependency fields as one group; independent metadata merges separately. Weather type/base/generated-name rules remain coherent.
- Match rows by GUID, not position. Accept independent additions, untouched deletions, and saved order unless the local draft reordered existing rows. An edited remotely removed row conflicts.
- Pause persistence while retaining conflicts/drafts. Shell-portal review uses `ModalPortalService`, `TemplatePortal`, and `ConfirmationDialogComponent`; offer only adapter-supported explicit choices, allow cancellation, and invalidate review when saved evidence changes. Some history-deletion conflicts may only accept saved deletion.
- Advance baselines for accepted independent merges while retaining unresolved baselines. Reconcile again at execution. A local choice never silently recreates a deleted domain target.
- Hydrate all merged fields even while other conflicts remain. Error-provided saved values remain authoritative for review/discard until another saved publication. Clearing a conflict resumes pending autosave without shortening newer typing's deadline.
- Distinguish reconciliation from reset hydration. Preserve normalized-equivalent raw Predictor text/caret during acknowledgement/refresh; reset, identity changes, discard, and genuinely different saved choices replace it.

Validate merged meter charges without silently changing retained rows. Changed source/unit/charge interpretation blocks saving until explicit correction or reload. A rejected write differs from `WorkspaceWriteError.persistenceCommitted`: committed publication recovery must not replay mutation. Preserve draft protection and the latest actual saved snapshot through repeated recovery.

## Navigation and lifetime

[`registerDataDraft`](../src/app/v1/data/editing/register-data-draft.ts) registers reactive dirty/blocked signals plus discard, with host-owned cleanup and no navigation-flush callback. The shared unsaved-changes service owns one conditional `beforeunload` listener; editors add no private listener.

Navigation confirms discard for dirty, invalid, failed, or conflicted values and blocks pending persistence, including deletion. Discard synchronously cancels queued work and restores authoritative saved values. Route guards check ancestor identity through reused resource/account/facility routes; query/fragment-only changes keep the same draft. Reload/close uses native confirmation without saving or discarding. Existing Settings/Report flush behavior is separate.

Children own controls, dirtiness, and local interaction state; owners expose only needed navigation/command capabilities. Replacing one reading editor protects its draft without losing unrelated range edits; Save and Add Another starts a new session. Keep routed editors mounted if saved targets disappear, retaining drafts and the last actual saved snapshot with saving disabled. Async work checks owner, editor/request identity, input fingerprints, and destruction before presenting results.

## Readings, Weather, and annual editing

Meter bills and Predictor readings retain controls across same-identity committed updates and refresh contextual validators silently. Bill interpretation tracks units plus existing charge GUID/type: additions, renames, and reordering are compatible, while removed/changed definitions block entered edits and queued saves. Explicit saved-charge removal can be accepted independently of other edits, including after a local conflict choice; it never bypasses a remaining unit block. Validation/commands reject charge GUIDs absent from current definitions.

Weather Setup has typed station/range controls and definition groups; identity includes account/facility even for the same station. Saved rows match predictor GUIDs and new rows keep local draft identity. Angular control/group validators own base-temperature/date validity; readiness adds permission/workflow checks. Form-state events drive pristine/dirty independently of value snapshots. Weather Readings separates range edits from paging/filter preferences; month controls are predictor-GUID keyed and retain manual overrides/zero while source refresh fills only unoverridden values. Committed revision changes invalidate reviewed previews. Search is explicit, ordinary saved-station verification remains, and hydration/enable-disable never schedules persistence or generation. Preview/review and atomic Weather commit remain explicit feature-owned operations.

Energy Use combines settings/all fiscal years in one form. Reconcile annual conditions by year and consumption by unambiguous source/year; retain imported duplicate buckets and unrelated/sparse history. Derived consumption stays outside equality. Metadata edits preserve history; capacity/quantity/unit changes recalculate only affected non-overridden values. Copy/preview share an amount projection: pending inputs copy their current calculated result, unchanged inputs keep stored amounts, and copied snapshots include units for later conversion. Silent hydration clears omitted optional calculator fields. The [feature reference](v1-energy-uses-architecture.md) owns reviewed source/year edits and meter-link identity.

## Derived Weather station workbenches

Weather predictors route to the Weather workbench before a standard Predictor editor is created. Creation hands off included Weather types/range through allowlisted query values captured once per account/facility creation identity; query-only changes never replace an edited draft, and no Weather record is written until reviewed commit. A station group is derived from the owning facility's saved Weather predictors sharing a nonempty `weatherStationId`; it is not a persisted group record. Group membership/source/reading/analysis-reference reconciliation commits in one transaction and publishes once.

Station Readings derives a month-by-output matrix. Range review atomically reconciles calculated readings for every included output; adding a month calculates all outputs, while explicit per-output overrides remain manual records. A displayed month edit/deletion reconciles all affected reading records atomically. New-station Setup retains the initial range until creation supplies a Readings tab. If both new range fields are blank, station confirmation fills 24 inclusive calendar months ending in the previous complete month. Future range months remain refreshable calculated zeroes without source-gap warnings; remote source requests stop at the current month. The neutral weather boundary owns cancellable lookup/retrieval/response validation, not station selection or persistence.

## Validation and outstanding work

The [form architecture guard](../src/app/v1/v1-form-architecture.spec.ts) protects migrated typed-form surfaces. The [native creation-to-Settings regression](../src/app/v1/data/meters/meter-workbench/settings/meter-creation-settings.browser.spec.ts) covers all meter sources through real save/reopen with pristine hydration and no entry writes. Protect queued reversions, acknowledgement/conflict sequences, missing targets, GUID reordering, native controls/focus, reuse/discard, rollback/reopen, and stale async work. Run related focused specs together to expose shared-bundle issues, then use [testing policy](testing.md) and the [validation workflow](../.agents/skills/validate-web-and-electron/SKILL.md).

The [GWP catalog](../src/app/data/models/globalWarmingPotentials.ts) still assigns `102` to fossil and non-fossil methane. A separate correction must preserve saved `102` calculations as non-fossil, assign fossil methane a distinct identity, preserve custom references, and handle migration/restore collisions with explicit data-version compatibility. Simply renumbering an option is unsafe.
