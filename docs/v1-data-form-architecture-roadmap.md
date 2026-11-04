# V1 Data form architecture: evaluation and roadmap

This evaluation covers Meter Settings and bill editing, Standard Predictor Settings and readings, and Weather station Setup and readings. The initialization repair and the follow-up architecture work are separate: the repair preserves saved meter setup values and moves Weather Setup to typed reactive controls so saved output types render correctly. The typed Meter Settings value contract, pure record mapping, source defaults for creation and explicit source changes, and import-editor controls are now implemented. The shared editing lifecycle, Settings reconciliation and group workflow, and reading draft preservation below remain planned.

The initialization repair also applies [source-specific meter defaults](../src/app/v1/shared/meter-settings/meter-source-defaults.ts) in `MeterActionsService.createMeter` before persistence. New records therefore reach Settings with the correct scope, collection unit, energy unit, heat capacity, and site-to-source factor. Saved hydration, copying, and import editing preserve their supplied values. Native creation-to-Settings regressions cover all seven sources, pristine rendering, no additional writes on opening or refresh, and database reopening.

## Current findings

The existing boundaries are sound: committed workspace records are the durable source of truth; feature builders and mappers translate editable copies; commands own persistence; Weather changes retain their reviewed, atomic multi-record workflow. Keep those boundaries. The main inconsistency is how individual editors initialize, refresh, protect, and save their transient state.

| Finding | Evidence and impact |
| --- | --- |
| Hydration and user transitions were mixed | [Meter Settings](../src/app/v1/data/meters/meter-workbench/settings/meter-workbench-settings.component.ts) applied the source-change rule after building a saved meter form, replacing compatible saved units with defaults. The initialization repair separates saved-record hydration from explicit source/fuel/unit transitions. |
| Weather Setup maintained a second form model | [Weather Setup](../src/app/v1/data/predictors/weather-predictor-workbench/setup/weather-predictor-setup.component.ts) used signal values and manual native-control synchronization. The initialization repair replaces that model with typed controls and a typed definitions array; the remaining Weather Readings controls are follow-up work. |
| Settings draft protection differs | Meter Settings clears its pending autosave on destruction without registering a draft or guarding its route; [Standard Predictor Settings](../src/app/v1/data/predictors/predictor-workbench/settings/predictor-workbench-settings.component.ts) registers dirty/saving state and has a route guard. A meter edit can be lost when navigation occurs before its debounce expires. |
| Autosave acknowledgement differs | Meter Settings allows typing during a save and unconditionally marks the form pristine after that save, even if another edit occurred. Standard Predictor Settings disables controls during saves. The meter path needs snapshot acknowledgement and serialization to preserve later edits. |
| Refresh policy is inconsistent | Both Settings editors retain their form for the same resource GUID, including when pristine committed data changes. The [meter bill editor](../src/app/v1/data/meters/meter-workbench/readings/meter-reading-bill-slideout/meter-reading-bill-slideout.component.ts) and [predictor reading editor](../src/app/v1/data/predictors/predictor-workbench/readings/predictor-reading-editor/predictor-reading-editor.component.ts) instead rebuild on resource or reading-list reference changes, including while dirty. These are stale-view and draft-loss risks. |
| Form typing and stable row identity are incomplete | Meter bill builders still expose untyped groups and arrays. [Weather month editing](../src/app/v1/data/predictors/weather-predictor-workbench/readings/weather-reading-month-editor/weather-reading-month-editor.component.ts) uses manual value maps and initializes values from positional cells; column reordering can associate a value with the wrong predictor. |

The shared [Settings draft lifecycle](../src/app/v1/shared/settings/settings-detail.base.ts) already compares saved snapshots, protects pending saves, and refreshes pristine forms. The [Report autosave controller](../src/app/v1/reports/shared/editing/report-autosave-controller.ts) adds serialized persistence, edit versions, and stale-completion protection. Use those semantics as precedents; Data must not depend on Report-specific editing code.

The saved-emissions-scope regression also exposes an existing catalog issue: the [global warming potential options](../src/app/data/models/globalWarmingPotentials.ts) assign `102` to both fossil and non-fossil methane. The meter selector tracks options by that value and emits a duplicate-key warning. Audit option identity, calculation lookup, and older-record compatibility in a separate catalog fix; changing persisted identifiers requires the calculation and persistence workflows rather than a form-only correction.

## Ordered work packages

### 1. Share the Settings editor lifecycle

Introduce a small Data-owned lifecycle controller shared by Meter Settings and Standard Predictor Settings. Feature adapters supply typed form snapshots, normalization, validation, silent hydration, availability, and persistence commands. The controller owns saved-baseline comparison, save state, scheduling, retry/discard, and cleanup; source/fuel/unit rules and persisted record mapping remain feature-owned.

- Retain the 650 ms text-edit debounce and immediate-save intents. Keep typing enabled during the editor's own save; read-only and unrelated pending operations still restrict availability.
- Permit one running persistence command. Coalesce later edits into the latest pending valid snapshot; honor the latest debounce deadline, or an explicit immediate-save request, before starting it.
- Capture editor identity, generation, and submitted snapshot for every save. A successful command acknowledges that snapshot only; later edits remain dirty and queued. A completion for a destroyed or replaced editor cannot update its state.
- Deduplicate normalized snapshots. Hydration, enable/disable changes, and dynamic array reconstruction use `emitEvent: false` and never schedule persistence, downstream status evaluation, calendarization, hourly-weather retrieval, or recalculation. Synchronous form validators and existing station metadata verification still initialize normally.
- Retain invalid and failed drafts with actionable feedback. Invalid drafts do not persist; failures require retry or a new valid edit. Discard cancels queued work and restores the latest committed record, and is unavailable during a running save.

**Completion:** both Settings editors pass the same lifecycle contract tests while keeping their existing domain commands and field-specific behavior.

### 2. Make draft protection and refresh consistent

Register Settings and reading drafts with the existing unsaved-changes service and protect tab, resource, account/facility, browser-history, and direct routed navigation. Use the existing guard and navigation boundaries; cover reused routes whose parameter changes do not destroy their component.

- Keep the chosen navigation policy: confirm discard for dirty drafts, including pending debounce, invalid, or failed drafts; block navigation while saving. Do not silently save on ordinary navigation. Accepted discard clears queued timers before leaving; cancelled discard preserves the draft.
- Key Settings sessions by account GUID, facility GUID, and resource GUID. Reading sessions also include add/edit mode and reading GUID, or a transient creation identity; Weather sessions include station-group ownership and month where applicable.
- Refresh a pristine session from a new committed snapshot. Preserve dirty/failed state when its identity is unchanged; update validation dependencies and presentation metadata without replacing values. A permitted identity change starts a fresh session and cancels old scheduled work.
- Protect meter bill navigation as well as slideout close. Preserve child ownership of editor dirtiness and expose only the minimum draft-protection capability needed by the route owner.

**Completion:** no navigation path drops a draft without the selected confirmation policy, and unrelated workspace publication cannot erase an in-progress edit.

### 3. Complete typed forms and GUID mapping

- Give Meter Settings, charge arrays, and meter bill forms explicit control types. Carry those types through builders, rules, child inputs, and mappers; preserve disabled values with `getRawValue()` and map empty `null` values to optional domain fields at the command boundary.
- Convert Weather Readings range controls, month editing, and weather-station selector search/preview controls to typed reactive forms. Preserve range review, default ranges, manual overrides, calculated-value availability, and explicit Save behavior. Weather regeneration remains a reviewed workflow, not ordinary Settings autosave.
- Match month cells and calculated values by predictor GUID, and charge controls and presentation metadata by charge GUID. Array positions may determine rendering order but never cross-record relationships. Keep stable control identities when ordering or validation dependencies change.

**Completion:** reordered inputs preserve predictor/charge ownership, zero values, disabled values, and optional fields without changing storage or calculation contracts.

### 4. Enforce and document the completed contract

Extend the [form architecture guard](../src/app/v1/v1-form-architecture.spec.ts) to each migrated Data form as its manual bindings are removed. Do not expand a rule to unmigrated templates and then hide their failures with an unexplained allowlist. Add narrowly targeted checks for any remaining repeatable violation that behavior tests cannot protect cheaply.

Update [UI architecture](../ARCHITECTURE.md#ui-architecture) and the [Data workbench norms](unified-ux-migration.md#production-v1-data-workbench-architecture-norms) when each package lands. Record implementation and validation evidence here without describing planned behavior as current. No new schema, migration, backup shape, or v0 workflow is required by this roadmap.

## Acceptance and validation

- Protect saved dekatherm and all supported Weather output types in rendered controls; form hydration on opening, refreshing, or discarding must not issue a write, hourly-weather retrieval, preview, or recalculation. Preserve existing station metadata verification.
- With deferred persistence, edit again during a save: assert one running command, correct acknowledgement of the submitted snapshot, and eventual persistence of the later edit. Cover failure/retry, invalid input, no-op changes, immediate-save requests, destruction, and identity switches with deterministic timers.
- Verify pristine refresh and dirty preservation for Settings and reading editors, including validation-list changes, missing resources, and account/facility/resource ownership changes. Assert actual mapped command values and user-visible state.
- Exercise accepted/cancelled discard, tab and resource switches, reused route parameters, browser Back, and navigation during a save. Verify Weather review/cancel/commit and manual overrides retain their existing behavior.
- Add reordered predictor-column and charge-array cases plus zero, optional, and disabled-control round trips. Keep calculation values, GUIDs, and current atomic command boundaries unchanged.

Use focused pure or Angular TestBed specs for builders, lifecycle, templates, and guards. Add a focused Chromium journey for real native-select rendering or routed interaction when fast tests cannot reproduce the boundary; native persistence tests are required only if command behavior changes. Before handoff, run the [validation planner](../.agents/skills/validate-web-and-electron/SKILL.md), app type-check, and production web build as selected by the changed files. Electron validation is required only if an Electron boundary changes.

### Initial repair validation

- The combined focused fast suite passes 64 tests across Meter Settings, shared meter form rules, Weather Setup, station selection, and form architecture enforcement.
- The focused Chromium check passes all seven saved Weather selections, real type/name edits, keyboard focus, and narrow layout.
- The app type-check and production web build pass. Existing browser-support, stylesheet-budget, dependency-format, and duplicate GWP option warnings remain; no storage or Electron boundary changed.
- The shared autosave, navigation, refresh, remaining typed-form, and GUID-mapping packages above remain follow-up work.

## Settings lifecycle adoption

Meter and Standard Predictor Settings now use the shared Data editing session for serialized autosave, submitted-value acknowledgement, nonconflicting committed refreshes, and explicit conflict review. Angular owns the session lifetime and shared navigation registration; Settings remain editable during their own saves, confirm draft discard, and block navigation while persistence runs. Meter source and group changes are validated together, with a compatible-group selector above Meter Reading Settings. Queued feature actions recheck current ownership and reconcile current records before existing atomic persistence. Reading and Weather lifecycle work remains in the following changes.

Settings review corrections validate charge types against the merged source without replacing retained rows, register meter deletion with shared navigation/unload protection, and keep the Predictor outlet mounted after a saved record disappears. Hydration distinguishes reconciliation from reset so Standard Predictor typing retains normalized-equivalent raw text through acknowledgements and refreshes, while discard and identity changes replace it. Persisted shapes and GUID relationships remain unchanged.

Review validation passes 162 focused unit tests, 21 focused Chromium checks, and the full suite of 3,211 unit tests and 334 Chromium tests. The app type-check and both production builds pass. Native checks cover typing/caret retention, disabled charge selections, explicit remapping, atomic rejection, and reopening; routed coverage verifies retained missing-record drafts and navigation protection.
