# VIS5 source development plan

Development guide for [VIS5 #2906](https://github.com/ORNL-AMO/VERIFI/issues/2906), under the [Visualizations and Home plan](v1-visualizations-and-home-plan.md). Work through predictors and saved weather first, then Energy Uses, then analysis results and saved models. Each slice is a separate development chat with its own acceptance checkpoint.

P1 and P2 are complete under their agreed focused acceptance. Later slices remain planned work; their outlines do not establish source support.

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
- [ ] **P3 — Compatible combinations: Not started**
- [ ] **P4 — Predictor acceptance: Not started**
- [ ] **E1 — Equipment history: Not started**
- [ ] **E2 — Groups and facilities: Not started**
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

**Outcome:** Chart multiple predictors and compatible predictor/utility combinations using existing monthly line/bar capability.

**Start with:** P1/P2, [utility visualizations](v1-utility-visualizations.md), [runtime contracts](v1-visualization-foundation.md#runtime-boundaries), and [preview registration](../src/app/v1/visualizations/preview/preview-registry.ts). Inspect the utility date-context resolver and time-series presenter rather than introducing a second date boundary.

**Work and boundaries:**

- Add live predictor selection rules to the implemented multiple-exact-predictor selection; refine rule filters and saved-contract implications in P3. Preserve compatible siblings and independent incomplete drafts when decisions change.
- Establish one calendar date/latest eligible observation anchor across participating sources. Lagging sources retain gaps; each provider must use the shared context.
- Preserve the implemented predictor shared-axis policy and per-trace units. Settle cross-source compatibility before enabling meter/predictor rendering; no unit conversion or aggregation is implied.
- Keep aggregation disabled without authoritative quantity semantics. Do not imply duplicate occurrence pairing or a valid combined total merely because dates match.
- Cancel obsolete work and reject results after relevant source, date, definition, workspace, or account changes.

**Acceptance:** Supported multi-predictor and predictor/utility charts save and reopen with correct dates, units, axes, and quality. Incompatible units, alignment, or periods explain unavailability. Unsupported aggregation and duplicate pairing never fabricate values.

**Validation:** Pure compatibility/date-anchor tests and focused editor/preview lifecycle tests. Cover lagging histories, real-zero anchors, incompatible axes, rapid changes, and account switching; use native coverage where Worker demand/lifecycle changes.

### P4 Predictor acceptance

**Outcome:** Close the predictor/weather milestone before starting E1.

**Start with:** P1–P3, [persistence/transfer contracts](v1-visualization-persistence.md), and [workbench recovery](v1-visualization-workbench.md#repair-and-deleted-draft-recovery).

**Work and boundaries:** Verify renames, deletion and repair, reviewed facility inclusion changes, copy/backup/restore, and appearance-reference remapping. Verify incomplete drafts, rejected saves, retry, conflicts, and committed-publication recovery. Address predictor-related gaps without expanding into later charts/capture.

**Acceptance:** Required bindings never silently retarget; protected drafts survive recovery; transferred references remain verified or explicitly repairable. Complete saved journeys pass human review, including keyboard/focus, labels, themes, narrow layouts, accessible values, and printing. Update the appropriate current references.

**Validation:** Focused regression cases plus native storage/transfer/reopen journeys. Record any unmet acceptance in continuation and keep P4 open until resolved.

## Energy Uses outline

Refine these slices after P4. Start with [Energy Uses architecture](v1-energy-uses-architecture.md), its [annual projection](../src/app/v1/data/energy-uses/models/energy-use-projection.models.ts), and the visualization contracts. Reuse existing projections/calculations; unsupported measures need explicit explanations rather than new formulas.

### E1 Equipment history

**Outcome and boundaries:** Select saved equipment and project existing annual values into yearly line/bar charts. Preserve explicit-year precedence, source occurrence identity, carry-forward provenance, retirement, and unavailable/invalid newer data. Keep latest saved/pinned fiscal-year behavior explicit. Never create history while viewing or fabricate monthly observations.

**Acceptance and validation:** Match the authoritative annual projection, including source year/unit and partial coverage. Test explicit versus carried-forward values, invalid/ambiguous rows, retirement, zero, fiscal intervals, and unchanged annual records.

### E2 Groups and facilities

**Outcome and boundaries:** Add group/facility projections with explicit membership, compatible units, actual fiscal periods, and nonoverlapping contribution identities. Keep Energy Use groups distinct from utility meter-group links. Composition, hierarchy/flow editing, and capture stay in later phases.

**Acceptance and validation:** Projections match existing results; partial coverage stays visible and incompatible fiscal rollups are unavailable. Test membership, orphan/empty groups, double counting, unit differences, and same-label/different-interval years.

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

- **Next slice:** P3 — Compatible combinations.
- **Current state:** P1 and P2 are complete. Current behavior is owned by the foundation and workbench references linked above.
- **Decisions for the next chat:** Refine live predictor rules and compatible meter/predictor rendering, shared date anchors, and cross-source units against the implemented behavior. Math/Conversion support is excluded.
- **Blockers:** None identified. Later slices require refinement when reached.
- **Outstanding acceptance:** P3/P4 and later source checkpoints remain open. Broader regression/release validation remains with PR review and CI/CD. VIS4 production-shell QA remains separately tracked in the parent plan.

To start the next chat: “Use `docs/v1-visualization-sources-plan.md` and work on P3 only. Inspect current source, refine compatible combinations and live-rule behavior, implement and validate the agreed slice, update the handoff, and stop before P4.”
