# VIS5 source development plan

Development guide for [VIS5 #2906](https://github.com/ORNL-AMO/VERIFI/issues/2906), under the [Visualizations and Home plan](v1-visualizations-and-home-plan.md). Work through predictors and saved weather first, then Energy Uses, then analysis results and saved models. Each slice is a separate development chat with its own acceptance checkpoint.

P1–P4 and E1 are complete under their agreed focused acceptance. Later slices remain planned work; their outlines do not establish source support.

## Working one chat at a time

1. Select the next unfinished slice. Read its starting references and inspect current source and neighboring tests; source remains authoritative if this plan has drifted.
2. Refine that slice before editing: settle supported settings, quality/period semantics, integration points, acceptance, and validation. Resolve material design questions with the user. Later source milestones remain outlines until reached.
3. Implement and validate only the agreed slice. Shared changes necessary for that slice are included; subsequent source/chart capabilities are not.
4. Update the checklist and continuation section with the next slice, unresolved decisions, blockers, and outstanding acceptance. Use **In progress**, **Blocked**, or **Complete** as appropriate; check a box only when its acceptance is satisfied.
5. Stop at the slice boundary. Do not automatically start the next slice or source family.

Completed behavior belongs in the owning feature references, not a growing implementation inventory here. Keep detailed execution evidence in Git and PRs. Condense completed slices after preserving unique invariants and remaining acceptance; retire this plan when its work is complete. Follow the repository PR workflow when a chat includes PR preparation.

## Scope and shared boundaries

- Use existing unstacked line/bar rendering, item appearance controls, typed Add/workbench decisions, autosave, and navigation/recovery behavior. Keep Dashboard catalogs and summaries calculation-free; request calculation work only for active previews/embeddings.
- Save source intent and durable resource identities, never generated result rows or chart instances. Preserve existing stored data, GUID relationships, supported backups, and v0 behavior. Review every affected reference/transfer consumer if a source requires contract changes.
- Keep observations, saved weather, annual estimates, carried-forward values, modeled values, and savings distinguishable. Missing, partial, excluded, invalid, padding, and real zero must retain their meanings.
- Reject unsupported unit transformations, periods, fiscal intervals, or source/chart settings with useful explanations. Never silently retarget sources, invent observations, resample annual estimates into months, or treat stale analysis as current.
- Broader time-series/comparison features remain VIS6; scatter/correlation/heatmap work remains VIS7; composition/treemap/flow work remains VIS8; capture remains VIS9. Home and custom report authoring remain outside VIS5. Cross-source combinations in P3 use existing time-series capability only.
- Outstanding VIS4 production-shell review/QA remains tracked in the parent plan; completing a VIS5 slice does not close it.

## Slice checklist

- [x] **P1 — Saved predictor selection: Complete**
- [x] **P2 — Weather and quality hardening: Complete**
- [x] **P3 — Compatible combinations: Complete**
- [x] **P4 — Predictor acceptance: Complete**
- [x] **E1 — Equipment history: Complete**
- [ ] **E2 — Groups and facilities: In progress**
- [ ] **E3 — Energy Uses acceptance: Not started**
- [ ] **A1 — Facility analysis results: Not started**
- [ ] **A2 — Account analysis results: Not started**
- [ ] **A3 — Saved models: Not started**
- [ ] **A4 — Analysis acceptance: Not started**

## Predictors and saved weather

Finish P1–P4 before starting Energy Uses. These are working checkpoints within one source family, not separate source categories for standard predictors and weather.

### P1 Saved predictor selection

**Outcome:** Select saved Standard or Weather predictors and complete Add → save → preview → reopen → edit with monthly line/bar charts. Current meaning belongs to [predictor observations](v1-visualization-foundation.md#predictor-observations); interaction belongs to [predictor setup](v1-visualization-workbench.md#predictor-setup).

**Agreed boundaries:** Multiple exact selections, aggregation `none`, no comparison or conversion. Traces default to the left axis with individual axis controls; mixed-unit axes omit the unit label while each trace retains its own units. Include empty and retired histories. Omit Math/Conversion placeholders from new selection. Month/year inputs support all history, inclusive fixed months, and rolling completed months; rolling years mean twelve-month blocks. Duplicate months become explained gaps retaining every conflicting reading's identity and amount. Finite warned/negative/overridden values remain visible. Use saved weather only, with inline provenance/quality explanations and no retrieval or source writes. Mixed configurations remain saveable but unavailable for rendering. Reuse existing saved contracts and workbench protections.

**Acceptance:** The saved journey, selection/appearance edits, empty/missing/unsupported states, month controls, keyboard access, and complete accessible values work without changing source records. Focus validation on this slice and directly affected shared paths; broader regressions and release validation belong to PR review and CI/CD.

### P2 Weather and quality hardening

**Outcome:** Saved weather context and omitted-input evidence are retained without routine chart warning noise. Existing selected-predictor data/status findings appear in the workbench header. Current behavior belongs to [predictor observations](v1-visualization-foundation.md#predictor-observations) and [predictor setup](v1-visualization-workbench.md#predictor-setup).

**Agreed boundaries:** Reuse existing status rules, preferences, dismissals, and full-history scope. Preserve saved units and all seven weather-measure fallbacks; missing context never blocks finite values. Group omissions while retaining each reading's identity, date, amount, and flags. Duplicates remain explained gaps. Viewing never retrieves/regenerates weather, writes source records, or adds calculation demand. No saved-format change or additional source/chart capability.

**Acceptance:** Focused projection, header, shared presentation, and native saved-workbench checks cover weather variants, invalid histories, grouped evidence, status lifecycle, and keyboard/themed/narrow presentation. Broader regression/release validation remains with PR review and CI/CD.

### P3 Compatible combinations

**Outcome:** Complete P1's multiple-exact-predictor support with explicit All Predictors and compatible monthly meter/predictor rendering. Current behavior belongs to [predictor observations](v1-visualization-foundation.md#predictor-observations), [predictor setup](v1-visualization-workbench.md#predictor-setup), and [utility visualizations](v1-utility-visualizations.md).

**Agreed boundaries:** All follows future Standard/Weather predictors within included facilities without a filter builder or exclusions. Individual picks remain fixed; deselection leaves All. Existing appearance and drafts survive compatible mode changes, and automatic membership changes retain dormant GUID overrides. Support one calendarized utility configuration with one predictor configuration in monthly unstacked line/bar charts without comparison. Keep independent source measures, values, and units; add no predictor conversion or cross-source totals. New traces start left; mixed-unit axes omit unit labels. Share one whole-month window and latest eligible anchor across both categories. Valid empty selections contribute gaps while usable siblings render; missing bindings/errors still require repair. Keep saved formats and meter-only behavior unchanged.

**Acceptance:** Focused selection, creation/editor, projection/date, compatibility, and preview-lifecycle checks cover agreed combinations and unavailable states. Native save/reopen journeys cover live additions and mixed date/axis edits, keyboard access, themed narrow layouts, accessible values, and calculation-session reuse. Broader regressions and release validation remain with PR review and CI/CD.

### P4 Predictor acceptance

**Outcome:** The predictor/weather milestone is complete under focused acceptance. Current identity, transfer, and recovery behavior belongs to [persistence](v1-visualization-persistence.md), [predictor observations](v1-visualization-foundation.md#predictor-observations), and [workbench recovery](v1-visualization-workbench.md#repair-and-deleted-draft-recovery).

**Accepted invariants:** Fixed identities never retarget by name. All membership can leave and return without rewriting saved intent or losing dormant appearance. Reviewed facility changes and copies retain compatible configuration; predictor resource/provider presentation selectors use verified GUID mappings, keeping unknown, blocked, and foreign identities dormant across repeated transfers. Standard/Weather values, provenance, units, and quality evidence survive account/facility backups. Protected drafts survive rejected saves, conflicts, navigation cancellation, and deletion; copy/Save as new retain one proposal identity and recover committed publication without replaying creation. No saved-format migration, weather retrieval, or source-writing preview behavior was introduced.

**Acceptance:** Focused reference, scope, presentation, backup, and recovery checks plus native save/restore/preview journeys pass. Restored charts retain accessible values and were inspected in wide/narrow, light/dark, and print layouts. Broader regression/release validation remains with PR review and CI/CD. VIS4 production-shell acceptance remains separately tracked.

## Energy Uses

E1 is complete. The requested Meter-style selection refinement also delivers E2 group selection; facility projections and remaining E2 acceptance are still pending. Start with [Energy Uses architecture](v1-energy-uses-architecture.md), its [annual projection](../src/app/domain/calculations/energy-footprint/energy-use-projection.ts), and the visualization contracts. Reuse existing projections/calculations; unsupported measures need explicit explanations rather than new formulas.

### E1 Equipment history

**Outcome:** Exact saved equipment selections render independent annual consumption traces in yearly, unstacked line/bar charts. Current projection meaning belongs to [equipment annual history](v1-visualization-foundation.md#equipment-annual-history), editing to [equipment history setup](v1-visualization-workbench.md#equipment-history-setup), and presentation identity to [persistence](v1-visualization-persistence.md#references-and-transfer-rules).

**Agreed boundaries:** Latest saved fiscal year is the default; selected equipment’s saved consumption/operating-condition years define latest/all-history bounds, including intervening years. Pinned years may explicitly project beyond those bounds. Reuse source occurrence precedence, original year/unit/override evidence, carry-forward, retirement, known partial totals and explicit later history. Require matching actual fiscal intervals. Follow facility/account owner energy units or pin compatible energy units. Keep exact identities and appearance through saved edits and verified mappings. No history writes, consumption recalculation, monthly resampling, live All resource selection, source-level traces, mixed sources, facility projections, composition or capture. The later requested selector refinement adds group/type/linked-group traces as described in E2.

**Acceptance:** Focused projection, selection/editor, reference/transfer mapping, preview-lifecycle and existing Energy Uses regressions pass. Native save/reopen/edit and keyboard journeys preserve annual records without meter calculation demand; chart/control presentation was inspected in wide/light, narrow/dark and print media. Broader native backup/recovery acceptance remains E3; regression/release gates remain with PR review and CI/CD.

### E2 Groups and facilities

**Current delivery:** The requested Meter-style Select by flow supports Energy use group, Equipment, Equipment type and Linked meter group in Add and the workbench. Groups/types have one combined annual trace using current matching equipment; exact Equipment mode remains independent traces. Preserve empty selections as gaps, partial coverage, source occurrence evidence, typed group namespaces and duplicate-link deduplication. Linked groups can share equipment; overlapping contribution identities produce a comparison notice instead of a combined total. Source records remain unchanged. Focused selection, saved journeys and account/facility backup round trips cover these modes.

**Remaining outcome and boundaries:** Refine facility projections and the remaining composed group/facility acceptance, including actual fiscal intervals, compatible units, orphan/empty groups and scope changes. Do not treat selection-mode delivery as completed facility rollup support. Keep Energy Use groups distinct from utility meter-group links. Composition, hierarchy/flow editing and capture stay in later phases.

**Remaining acceptance:** Verify pending facility projections against existing results, fiscal compatibility, cross-facility membership and nonoverlapping totals. Retain the selector refinement’s existing checks rather than duplicating them.

### E3 Energy Uses acceptance

**Outcome and boundaries:** Verify source loss/repair, facility changes, save/reopen, and transfers using the [persistence](v1-visualization-persistence.md) and workbench contracts.

**Acceptance and validation:** Complete annual-source journeys preserve estimates and carry-forward meaning without rewriting history. Add native persistence/backup coverage and focused visual/accessibility review; update current references before A1.

## Analysis and saved model outline

Refine these slices after E3. Start with [facility analysis architecture](v1-facility-analysis-architecture.md), [account analysis architecture](v1-account-analysis-architecture.md), and their current result coordinators. Reuse authoritative validation, dependency closure, calculations, fingerprints, and cancellation; Dashboard browsing must not request full results.

### A1 Facility analysis results

**Outcome and boundaries:** Bind a named saved facility analysis and applicable group; project supported existing monthly/annual measures. Keep analysis baseline/adjustment/banking rules authoritative and independent of visualization date filtering.

**Acceptance and validation:** Only current, valid matching results render. Distinguish actual, calculated, improvement, savings, and losses. Test readiness, periods, gaps, errors, input freshness, and active-preview demand; include native coverage for changed Worker lifecycle/contracts.

### A2 Account analysis results

**Outcome and boundaries:** Add saved account-analysis projections with their existing selected-facility, skip, dependency, readiness, and fiscal-period rules. Do not silently recompute an account analysis over visualization-filtered membership; make incompatible inclusion unavailable.

**Acceptance and validation:** Results match authoritative account calculations and retained source scope. Test facility selections, dependencies, fiscal compatibility, cancellation, account switching, and save/reopen.

### A3 Saved models

**Outcome and boundaries:** Support model mode using durable analysis/group/model identity. Permit supported actual/modeled/residual projections from saved models; exclude unsaved regression candidates. Never fall back to the currently selected or another model.

**Acceptance and validation:** Pinned models reopen consistently; missing models require repair. Test model identity, deletion, changed inputs, supported comparison-model bindings, and transfer/reference handling.

### A4 Analysis acceptance

**Outcome and boundaries:** Verify freshness, invalidity, timeout/error/retry, cancellation, changed inputs, reference loss, and the saved journey across supported analysis/model modes. Follow the persistence and workbench recovery contracts.

**Acceptance and validation:** Stale/obsolete results cannot appear current, and only active consumers demand calculations. Complete focused and native Worker/persistence journeys plus visual/accessibility review. Preserve formulas, stored analyses, and existing report behavior; update current references before marking VIS5 ready for issue acceptance.

## Validation for development chats

Use the [testing policy](testing.md) and [validation workflow](../.agents/skills/validate-web-and-electron/SKILL.md). Select focused checks for each slice, then run `npm run validate:agent -- --mode plan -- <files...>` with only that chat's changed files before final validation. Use focused native browser coverage for changed IndexedDB/Worker behavior and app type-checking for changed TypeScript contracts. Defer full suites, production builds, and broad release validation to PR review and CI/CD unless a concrete integration risk requires an additional check. Select Electron checks only for affected boundaries or explicit desktop release scope.

Do not defer deterministic source tests to acceptance slices or VIS10. Acceptance slices cover composed journeys and remaining risks; each earlier slice still needs evidence for its own behavior. Disclose failed/unperformed checks and keep outstanding acceptance open. Documentation-only upkeep needs link checks and `npm run docs:check`, without unrelated application tests/builds.

## Continuation

- **Next slice:** Remaining E2 — facility projections and composed acceptance. No facility rollups were implemented in the selector refinement.
- **Current state:** P1–P4 and E1 are complete under focused acceptance. Equipment visualizations reuse the neutral annual projection; the foundation, workbench, Energy Uses architecture and persistence references own current behavior. The subsequent requested selector refinement implements four selection modes and combined group/type traces; E2 remains in progress.
- **Decisions for the next chat:** Refine remaining E2 facility totals and composed acceptance against existing results. Preserve the implemented group/type/linked-group selection meaning, owner/pinned units and actual fiscal-period compatibility. Keep Energy Use groups distinct from utility meter-group links; bulk current resource selection does not establish live All resource support.
- **Blockers:** None identified. Later slices require refinement when reached.
- **Outstanding acceptance:** E2–E3 and analysis/model checkpoints remain open. Broader native equipment backup/recovery journeys belong to E3. Broader regression/release validation remains with PR review and CI/CD. VIS4 production-shell QA remains separately tracked in the parent plan. Native OS print-dialog checks were not performed.

To start the next chat: “Use `docs/v1-visualization-sources-plan.md` and work on E2 only. Inspect existing group/facility annual results, refine membership, units and fiscal-period behavior, implement and validate the agreed slice, update the handoff, and stop before E3.”
