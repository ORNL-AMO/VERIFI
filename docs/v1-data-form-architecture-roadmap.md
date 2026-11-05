# V1 Data form architecture

Meter and Predictor workbenches use typed editable copies of committed workspace records. Feature adapters own defaults, validation, normalization, dependency rules, and record mapping. Shared Data editing code owns scheduling, acknowledgement, reconciliation, and draft protection. Domain command handlers remain the persistence boundary; Weather regeneration retains explicit preview, review, and atomic commit.

## Typed values and explicit defaults

- Meter Settings, charge definitions, bills, and bill charges have explicit control and value contracts. Shared form sections and import editing use the same builders and mappers.
- Record projection, editable-value normalization, and persistence mapping are separate. Equality never invokes calculations or a persistence mapper. `getRawValue()` retains disabled controls; optional empty controls map explicitly to optional domain values.
- Meter account numbers accept existing numeric identifiers and text identifiers, including leading zeros and letters. Editing and supported file round trips preserve their actual scalar type and value.
- New meter creation and genuine source transitions apply explicit source defaults. Saved hydration, copying, and import editing preserve saved setup values. Existing records are never repaired from facility defaults merely by opening a form.
- Meter Settings edits the source and group as one coherent setup. The group selector sits in the right column above Meter Reading Settings and offers compatible groups owned by the current facility plus Ungrouped. A source transition retains the selected group and pauses autosave with an inline explanation if they are incompatible; the user explicitly chooses a replacement before either value is saved. Queued commands recheck current group ownership and compatibility. Ungrouped maps to the existing optional `groupId` shape, without a migration or reading changes.

## Shared Settings lifecycle

[`SettingsEditSession`](../src/app/v1/data/editing/settings-edit-session.ts) serves Meter, Standard Predictor, and Energy Use Settings through typed feature adapters. It has no dependency on Report editing code.

- Construct the controller through `injectSettingsEditSession(adapter)` in an Angular injection context. Angular host destruction owns its effects, subscriptions, pending timers, and draft registration; callers do not manually dispose the controller.
- A session is keyed by account, facility, resource, and generation. One deduplicated form-change stream applies dependent rules before final snapshot delivery.
- Text edits use a 650 ms deadline; immediate intents and explicit saves become due immediately. There is one running save and one coalesced latest draft. Later typing, including a reversion, remains pending until its own values are acknowledged.
- Success acknowledges only the submitted snapshot. Invalid values do not write. Failures retain editable values and require retry or another valid edit. Obsolete callbacks cannot change a replacement session.
- Optional `ownerId` metadata belongs only to command requests and pending workspace operations. It distinguishes an editor's own save/reload from unrelated pending work and is never stored in records or backups. Settings remains editable during its own operation; unrelated operations retain their availability restrictions.
- Settings actions resolve ownership and current records inside the queued persistence callback. They reconcile the submitted edit with current values before applying feature mappings and building dependent updates. Existing native transactions and one committed publication per command remain intact.

## Reconciliation and conflict review

[`draft-reconciliation`](../src/app/v1/data/editing/draft-reconciliation.ts) compares the saved baseline, local values, and latest committed values. Pristine editors synchronize silently; dirty editors accept changes to untouched fields without changing their save deadline. Unchanged projections do not rebuild controls or take focus.

- Coupled setup fields are one merge group, preventing incompatible combinations of source, units, and dependent settings. Weather type, base, and generated-name rules stay coherent. Independent metadata fields merge separately.
- Collections match by GUID, not position. Independent additions and untouched deletions merge; editing an item that was removed produces a conflict. Saved presentation order is accepted unless the local draft actually reordered existing items.
- Conflicts retain the draft and pause persistence. The shared conflict review renders through `ModalPortalService`, `TemplatePortal`, and `ConfirmationDialogComponent`. Each group requires an explicit local/saved choice; cancellation remains available before choices are complete. A changed saved snapshot invalidates an open review.
- Reconciliation advances the baseline for independently merged fields and rows while retaining the original baseline of unresolved conflicts. Further saved publications can therefore merge without turning previously accepted values into local edits.
- Execution-time reconciliation rechecks decisions against the latest committed record. Choosing a local deleted item never silently recreates a missing domain target. Missing resources, ownership changes, and changed bill units disable saving while retaining relevant draft information for review or discard.

## Navigation and child ownership

[`registerDataDraft`](../src/app/v1/data/editing/register-data-draft.ts) accepts reactive dirty/blocked signals and a discard callback, with registration cleanup owned by the Angular host. Data editors deliberately omit the optional navigation-flush callback used by other workflows. The existing navigation service owns one shared, conditional `beforeunload` listener for these registrations; it attaches only while at least one Data draft or pending operation requires protection.

- Application navigation confirms before discarding dirty, invalid, conflicted, or failed drafts and blocks while persistence is running. Discard cancels queued work synchronously and restores the latest saved values.
- Editable route leaves use the existing deactivation guard with ancestor-parameter checking, including reused meter, predictor, station-group, account, and facility routes. Query/fragment-only changes preserve the current identity and draft.
- Browser reload/close uses the browser's native confirmation; unload never writes or discards. Existing Settings and Report navigation-flush behavior is unaffected.
- Reading children own their controls and dirtiness. Routed owners expose only the capabilities needed for navigation and pending commands. Closing or replacing an editor protects that editor's draft without discarding unrelated range edits. Save and Add Another starts a fresh session.

## Reading and Weather forms

Energy Use Settings maps editable setup into the latest committed equipment record. Metadata-only edits preserve annual history; capacity, quantity, and unit changes recalculate only affected non-overridden values with the existing footprint calculation. Confirmed meter-group selections determine utilities using the group's meter sources, with no overlapping utility sources across selected groups. Links and utility configuration update as one form change after any required saved-history review; retained sources keep their values and history. Manual utility selection is available without meter-group links. Source setup and meter links reconcile as one coupled group. Source rows have no persisted GUID, so unambiguous rows match by source type; repeated imported source types remain preserved and block ambiguous configuration edits. Removing a saved source requires current history review through the shared shell portal. Creation explicitly initializes one fiscal year without requiring readings and atomically creates a named group and its first item when needed. Hydration never applies group-derived changes.

- Meter bills and Standard Predictor readings retain controls across same-identity publications, update contextual validators silently, and reconcile current saved fields. Deleted edit targets cannot be recreated by saving. Changes that alter the interpretation of entered bill amounts require explicit reload/discard.
- Weather Setup keeps typed station/range controls and definition groups. Owner identity includes account and facility even when two facilities use the same station. Saved rows match predictor GUIDs; new local rows retain draft identity.
- Control and group validators own Weather field validity, including dependent base temperatures and date ranges. Submit readiness combines that validity with permissions and workflow state. Dirty-state signals follow Angular form-state events, independently of editable-value snapshots.
- Weather Readings separates editable range controls from view preferences. Paging/filtering is not unsaved domain data. Month editors use predictor-GUID-keyed amount/override controls, preserve manual overrides and zero values, and refresh source values only where overrides are absent.
- Asynchronous lookups, calculations, and previews check owner, editor/request identity, input fingerprints, and lifetime before publishing. A committed revision invalidates an obsolete reviewed preview. Search remains explicit; ordinary saved-station metadata verification is preserved.
- Feature-specific validators, Weather command payloads, future-month behavior, and reviewed atomic commits remain feature-owned. Hydration and enable/disable changes do not schedule persistence or weather calculation work.

## Enforcement and validation

The [form architecture guard](../src/app/v1/v1-form-architecture.spec.ts) covers migrated Settings, bill/reading editors, Weather workbenches, station search, and conflict review. It rejects manual editable value/change synchronization in those surfaces. Table-only presentation preferences outside these migrated forms retain their existing ownership.

Protect this architecture with combined regression runs: normalized values and file compatibility; queued edits/reversions and canonical acknowledgement; nonconflicting merges and conflict choices; own/unrelated pending work; missing targets; route reuse and discard; GUID reordering; manual overrides; and obsolete asynchronous results. Run focused specs together to catch shared-bundle initialization behavior as well as isolated component behavior. Use Chromium for native controls, focus, routing, and real IndexedDB rollback/reopen checks.

The [native creation-to-Settings regression](../src/app/v1/data/meters/meter-workbench/settings/meter-creation-settings.browser.spec.ts) persists all seven meter sources through the real creation command, reloads their saved records into Settings, and verifies scope, units, site-to-source factors, pristine hydration, no additional writes, and database reopening. Creation defaults ship with the initialization repair so each stacked change remains safe independently.

Use the [validation workflow](../.agents/skills/validate-web-and-electron/SKILL.md) to select checks. The completed stack is verified with the full test suite, app type-check, and both production builds, including the inherited source defaults and shared value contracts. No IndexedDB schema or data-version migration is introduced.

Validation completed for this implementation:

| Check | Result |
| --- | --- |
| `npm run validate:agent -- --mode plan` | Completed; selected focused specs, app type-check, browser suite, and production web build. Both production targets were also checked for the shared value/default changes. |
| `npx tsc -p tsconfig.app.json --noEmit` | Passed. |
| `npm run test:all:ci` | Passed after syncing the merged stack and fixing retained charges: 3,295 unit tests in 507 files and 337 Chromium tests in 71 files. |
| `npm run build-prod` | Passed. |
| `npm run build-prod-electron` | Passed. |

The regression set includes numeric/text account-number import, edit, export, and backup preservation; queued latest-record updates and native IndexedDB rollback/reopen; sequential saved publications during unresolved conflicts; accepted/cancelled route reuse and history navigation; keyboard focus, native dropdowns, and narrow layouts. The Angular lifecycle simplification adds conditional shared-listener ownership, independent registration cleanup, destroyed-host save cancellation and stale-completion protection, form-state transitions without value changes, and validator/readiness consistency. Source/group coverage includes changing gas in an Energy group to water, explicit reassignment or Ungrouped, preserved readings, filtered native options, current group revalidation, and persisted source/group values after reopening. Production builds retain warnings from unchanged stylesheet budgets, browser targets, and CommonJS dependencies. The earlier focused-test exit 134 did not recur with the required execution permissions.

## Inherited stack review corrections

Settings review corrections validate charge types against the merged source without replacing retained rows, register meter deletion with shared navigation/unload protection, and keep the Predictor outlet mounted after a saved record disappears. Hydration distinguishes reconciliation from reset so Standard Predictor typing retains normalized-equivalent raw text through acknowledgements and refreshes, while discard and identity changes replace it. Persisted shapes and GUID relationships remain unchanged.

Review validation passes 162 focused unit tests, 21 focused Chromium checks, and the full suite of 3,211 unit tests and 334 Chromium tests. The app type-check and both production builds pass. Native checks cover typing/caret retention, disabled charge selections, explicit remapping, atomic rejection, and reopening; routed coverage verifies retained missing-record drafts and navigation protection.

## Reading editor review corrections

Meter bills retain their last actual saved snapshot when the reading disappears, preserving dirty state, discard confirmation, and unload protection. Charge context includes each existing definition's GUID and type: changed or removed definitions block edited bills and queued saves, while additions, renames, and reordering remain compatible. Affected drafts retain their original units until explicitly reloaded. The Predictor workbench outlet fix inherited from Settings also retains dirty reading editors when their predictor disappears; routed regression coverage verifies the disabled form and navigation/unload protection.

The Weather stack sync retains those fixes. Bill editors also let users explicitly accept saved charge removals after a local conflict choice, dropping only those charge rows while preserving unrelated edits and any remaining unit-context block. Form validation and queued writes reject charge GUIDs without current meter definitions. This does not change persisted shapes or clean up historical records on opening.

## Deferred emissions catalog correction

The [global warming potential catalog](../src/app/data/models/globalWarmingPotentials.ts) assigns `102` to both fossil and non-fossil methane, producing a duplicate option key. This catalog correction remains separate from the form architecture work.

The later plan must preserve current saved `102` calculations as non-fossil, give fossil methane a distinct identity, protect existing custom-factor references, and handle collisions during local migration and backup restoration. It must explicitly address data-version compatibility before implementation; simply renumbering a built-in option is unsafe.
