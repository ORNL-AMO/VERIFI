# Global Facility Selection and Unified Inventories

## Purpose and delivery

Replace the account-to-facility-dashboard drill-in with one set of inventories controlled by a shared facility choice in the header. Keep item workbenches and distinct facility tools, while making the selected context visible throughout navigation.

This document records the agreed target experience and implementation roadmap. It does not describe shipped behavior or authorize implementing every phase together. Work through each phase separately and update its status and validation evidence when completed.

| Phase | Deliverable | Status |
| --- | --- | --- |
| 1 | Header chooser and shared filtering | Complete |
| 2 | Contextual navigation and workbench journeys | Complete |
| 3 | Shared inventory charts, selection, and creation | Complete |
| 4 | Dashboard retirement and resource-based folders | Not started |
| 5 | Single-facility presentation | Not started |

### Greenfield policy

V1 is still in development and has no current users. Treat its UI and navigation as greenfield: remove superseded screens, routes, helpers, and tests instead of retaining compatibility redirects, adapters, or migrations for earlier v1 UI behavior. Update internal callers to the intended destinations directly. Earlier v1 preferences and transient browsing-state shapes do not require compatibility handling.

This policy does not authorize discarding shared application data or changing v0 behavior. Preserve stored records, GUID relationships, account workspace publication, calculations, imports/exports, backups, report contracts, and Electron boundaries. No new IndexedDB schema, backup format, calculation contract, or IPC is planned. See [protected contracts](unified-ux-migration.md#protected-contracts) and [domain and persistence](../ARCHITECTURE.md#domain-and-persistence).

## Agreed experience

### Header and account access

- Use the GitHub-style account/resource hierarchy: **Account name / All facilities ▾** or **Account name / Facility name ▾**.
- The account name includes its account icon and clears facility scope through guarded navigation. The VERIFI brand returns to the home screen, where users select, create, or import accounts. Remove the header account-switching dropdown. A dedicated account-management screen is outside this effort.
- The facility chooser contains a search field, a permanent **All facilities** choice, and alphabetically ordered facilities with location subtitles and a checkmark on the current selection.
- Search matches name and location. Support keyboard navigation, Escape, outside-click dismissal, focus return, long names, and constrained browser/Electron windows. Distinguish no facilities from no search matches.

### Scope and inventories

- **All facilities** shows combined inventories, including account-owned analyses/reports, and exposes account settings and custom database tools.
- A named facility shows only that facility's items and exposes its item links, meter groups, and facility settings. Account analyses/reports are excluded even when they reference that facility.
- Facility scope applies across Facilities, Meters, Predictors, Analysis, and Reports. Individual inventories retain local search, status, category, type, sorting, and detail controls, but do not duplicate facility selection.
- Clearing local filters retains the header selection. Counts and empty states explain the current scope. Facilities appears in the sidebar at All facilities only. The Data section opens Facilities at All facilities, or scoped Meters when a facility is selected; facility-context sidebars contain scoped resources and tools.
- Inventory and Settings headers share account → selected facility breadcrumbs with account/facility icons. All facilities/account Settings show only the actionable account name; clicking it clears scope while keeping the corresponding inventory or Settings detail. The sidebar does not repeat the account name.
- Account-wide backup actions remain explicitly labeled as account-wide.

### Workbench journeys

- Opening a facility-owned item shows its owning facility in the header. Returning to the originating inventory restores its previous scope, local filters, page, expansion, scroll, and focus. This includes returning to All facilities after drilling into an item.
- Selecting another facility while editing saves or guards pending changes, then opens the corresponding inventory for the new facility. Selecting All facilities opens the combined inventory.
- Cancelled navigation or failed saves leave the current item and context intact. Context changes must not publish a new facility selection before navigation is accepted.
- Selecting a facility in Settings preserves the matching settings detail. Switching from Meter Grouping to All facilities opens Meters. Other facility-only tools return to the corresponding account destination when available.

## Phase 1 — Header chooser and shared filtering

**Status: Complete**

### Changes

- Move facility selection into a header-owned component, reusing the existing themed overlay and typed reactive search behavior. Remove the duplicate sidebar picker and the header account-switching menu.
- Introduce one v1 browsing-scope contract: All facilities or a facility GUID belonging to the active account. Keep it distinct from workbench ownership and durable workspace selection hints; a remembered or first facility must not silently replace All facilities.
- Represent account inventory scope with an optional `facility` query parameter. Missing means All facilities. Internal section navigation carries scope, while reloads and copied URLs reproduce it. Fresh portfolio account entry through home starts at All facilities.
- Apply the shared scope to Facilities, Meters, Predictors, Analysis, and Reports. Remove local facility selectors from Meters and Predictors.
- Under a named facility, hide incompatible account-scope Analysis/Reports controls and prevent remembered account-only filters from silently hiding valid facility items.
- Validate scope against the committed account workspace. An invalid or deleted inventory facility falls back to All facilities with an explanatory message. Keep item ownership validation separate.
- Keep current single-facility account routing during the portfolio phases; minimal routing adaptation lands in Phase 4 and single-facility presentation in Phase 5.

### Phase 1 implementation notes

- The header owns the picker and offers All facilities for every portfolio, including those with one facility. Home remains the account-switching entry point through the VERIFI brand. Clicking the account name clears facility scope.
- `WorkspaceNavigationService` exposes typed inventory/header scopes and a guarded scope-change command. Account inventory scope comes from the URL rather than workspace selection hints; facility routes retain their explicit ownership.
- The minimum guarded workbench/settings switching paths landed in Phase 1 so the global header is usable outside inventories. Phase 2 still owns contextual sidebar/support-panel projections and full per-scope journey restoration.
- Local Meter/Predictor facility controls were removed. Analysis/Report level and type choices respect named-facility scope; comparison options and result demand are also scoped.
- Existing facility dashboards and single-site routing remain active for their later phases. No compatibility redirects were added for the removed picker/menu presentation.

### Acceptance and validation

- Selecting a facility once filters the account inventories consistently when moving between Data, Analysis, and Reports.
- Named-facility Analysis/Reports contain only items owned by that facility. All facilities restores the combined inventory.
- Local filter clearing does not clear facility scope, and selections cannot leak across accounts.
- Test scope projection, query-parameter handling, account isolation, invalid scope, hidden-filter handling, and empty/loading/error states.
- Check dropdown keyboard operation, focus return, search, long names, themes, and narrow layouts. Verify reload and copied-URL behavior.

### Phase 1 follow-up feedback

- Refined the global header alignment and account icon treatment.
- Account-name clicks now clear facility scope; only the VERIFI brand opens Home.
- Explicit Facilities navigation resets to All facilities, while the Data rail preserves a named facility and opens Meters. Other inventory links preserve scope.
- Inventory and Settings page headers share an actionable account breadcrumb and an optional selected-facility breadcrumb, each with its account or facility icon.
- Removed the redundant sidebar account-name label.

Follow-up validation passed: 21 focused fast-test files (232 tests), six Chromium files (41 tests), the application type-check, and the production web build. Chromium covered long breadcrumb/header labels, keyboard focus, responsive layouts, themes, print, and guarded scope/history navigation; the wide and narrow header captures were also visually reviewed. The build retains the existing CSS-budget and CommonJS warnings. Documentation links and whitespace checks passed.

Code-review corrections preserve Analysis creation under a named facility filter: a successful creation releases its completed write state before opening the workbench, and creation category choices use account-wide category availability independently of scoped inventory filters. The empty-inventory branch imports the shared standalone empty state directly. Regression coverage includes empty and energy-only facility inventories, guarded account-analysis creation, and blocked scope changes while creation is pending. Validation passed: nine affected fast-test files (53 tests), two Chromium files (11 tests), application type-check, production web build, documentation links, and whitespace checks. Existing build warnings remain.

### Phase 1 validation evidence

| Check | Result |
| --- | --- |
| Risk-based validation planner | Reviewed the changed UI, routing, browser, and documentation surfaces. |
| Fast suite (`npm run test:ci`) | Passed: 442 files, 2,494 tests. |
| Browser suite (`npm run test:browser:ci`) | Passed: 54 files, 246 tests, including the chooser and scope history checks. |
| Final scope-guard browser regression | Passed after the deleted-facility URL cleanup fix. |
| Application type-check | Passed (`npx tsc -p tsconfig.app.json --noEmit`). |
| Production web build | Passed (`npm run build-prod`); CSS-budget and CommonJS warnings remain in untouched source/dependencies. |
| Browser presentation checks | Passed keyboard/search/focus, Back/Forward cancellation, light/dark/high-contrast palettes, long header names, narrow windows, reduced-motion inventory checks, and print checks. |
| Documentation and whitespace | Roadmap links/anchors and new architecture/migration references validated; `git diff --check` passed. |

Sandbox test/build aborts were resolved by running outside the sandbox. A later fast run hit six five-second timeouts while a production build was running concurrently; the isolated full-suite rerun passed without changing test limits. No Electron-specific runtime boundary changed, so an Electron production build and interactive desktop check were not required. UI evidence above comes from automated Chromium checks; no separate interactive desktop walkthrough was performed.

## Phase 2 — Contextual navigation and workbench journeys

**Status: Complete**

### Changes

- Derive sidebar context from the shared scope and active item ownership rather than account-versus-facility route shape alone.
- Under a named facility, show its meters, predictors/weather stations, analyses, reports, Meter Grouping, Energy Uses, and facility settings; omit the Facilities sidebar item. Inventory parent links open unified filtered inventories; item links retain their workbench destinations.
- Under All facilities, expose account settings and custom fuels, grid factors, and GWPs. Portfolio users choose All facilities to access these account-wide tools.
- Make support-panel counts, findings, and section navigation follow the same effective context while retaining existing section-specific status rules.
- Key filters, pages, detail level, overrides, scroll, and focus by account, inventory kind, and facility scope for session restoration. Existing saved detail preferences seed unvisited scopes. Preserve the originating All facilities journey independently from the facility ownership displayed inside a workbench.
- Centralize guarded context-change navigation and publish context only after successful navigation. Preserve existing autosave, discard, and save-failure protections.
- Preserve upload mapping behavior, pass the selected facility as initial context, and return to the originating inventory. Keep upload mapping query parameters distinct from the new inventory scope parameter.

### Acceptance and validation

- Header, sidebar, content, and support panel agree on the current context, including a filtered inventory rendered on an account route.
- Opening an item from All facilities shows its owning facility. Browser Back restores the original list and focused item; account/facility breadcrumbs open the matching unfiltered/owner-filtered inventory without a new generic Return link.
- Switching facility from each workbench opens the corresponding filtered inventory after pending edits are handled.
- Test successful, cancelled, failed, and rapid navigation; browser Back/Forward; settings transitions; upload returns; and missing focus-target fallback.
- Preserve report-to-analysis and account-to-facility inspection returns without changing report or analysis ownership.

### Phase 2 implementation and validation evidence

- Effective-context projections drive the sidebar, support panel, and Settings entry from committed GUID ownership. Portfolio inventory parent links target account screens with scope; valid single-site routing and the account Reports exception remain intact.
- Account workbench breadcrumbs open the unfiltered matching inventory; facility breadcrumbs open its owner-filtered inventory. Meter groups use Meters, and Browser Back restores the exact source. The account-global last-Data-inventory shortcut and the sidebar account-return link were removed; regular sidebar resource links retain facility scope and breadcrumbs provide account-wide destinations. Specialized report/analysis returns remain unchanged.
- All five inventories use account/inventory/facility session keys. Filters project before view hydration, preserving remembered pages, detail, overrides, scroll, and focus across scope switches. Existing saved display preferences seed unseen scopes.
- Upload entry carries initial facility context and a scoped source return URL through the existing mapping/session boundaries. Completion accepts only existing validated account/facility destinations.

| Check | Result |
| --- | --- |
| Risk-based validation planner | Reviewed the complete Phase 2 diff. |
| Fast suite (`npm run test:ci`) | Passed: 443 files, 2,509 tests. |
| Chromium suite (`npm run test:browser:ci`) | Passed: 54 files, 248 tests. Includes query-only Back/Forward restoration, focus/deletion fallback, keyboard, themes, narrow windows, reduced motion, print, guarded workbench creation/exits, and import journeys. |
| Application type-check | Passed (`npx tsc -p tsconfig.app.json --noEmit`). |
| Production web build | Passed (`npm run build-prod`); existing untouched CSS-budget and dependency CommonJS warnings remain. |
| Documentation and whitespace | Updated roadmap, architecture, and migration links/anchors validated; `git diff --check` passed. |

No Electron boundary changed; no Electron production build or separate interactive desktop walkthrough was performed. Automated UI evidence comes from Chromium. Shared persisted data and v0 contracts are unchanged.

Phase 2 presentation follow-up: unified facility ownership headers across Meter/Predictor/Analysis/Report cards, stronger ownership colors, border-aligned inner corners, and concise Analysis/Reports page titles. Facility header links now filter the current inventory through guarded scope navigation, with filtered inventory URLs for native modified-click navigation; card titles retain workbench drill-in. Focused validation passed: 66 fast-spec files / 450 tests, four Chromium files / 25 tests, application type-check, production web build, and visual inspection of narrow cards with long facility names. Chromium covers corner settings, all palettes and contrast modes, keyboard menus, inventory journeys, reduced motion, and print. Existing CSS-budget and dependency warnings remain. Facility portfolio cards open unified Meters filtered to their facility; their expanded resource links open scoped Meters/Predictors. Card header filtering follow-up passed 46 focused fast-spec files / 376 tests and four Chromium files / 36 tests, plus application type-check and production web build. Guarded owner-link tests cover each resource, modified clicks, cancellation, and navigation failure; browser tests cover in-place Analysis/Reports filtering. Facility portfolio/sidebar follow-up passed 34 focused fast-spec files / 285 tests, two Chromium files / 15 tests, application type-check, and production web build. This includes guarded facility-card title/resource navigation, omission of Facilities in facility context, and browse restoration.

Review fixes: synchronized the meter-creation and facility meter-dashboard Chromium navigation fixtures. Upload now captures and accepts only inventory/workbench return destinations, using the existing fallback for Home, Settings, custom database, or import workflow origins while retaining facility mapping context. Validation passed: 444 fast-spec files / 2,536 tests, 55 Chromium files / 251 tests, application type-check, production web build, and documentation/whitespace checks. Existing build warnings remain.

## Phase 3 — Shared inventory capabilities

**Status: Complete**

### Changes

- Unified Meters and Predictors offer the existing chart dock and bottom sheet at All facilities and named facilities. Controls remain visible; empty sources, unavailable calculations, and disabled actions explain their state.
- Meter charts offer **Facility totals**, **Meter groups** (default), and **Individual meters**. Facility-qualified group/meter labels distinguish owners; each facility has an **Unassigned** series for ungrouped meters. Duplicate labels retain separate GUID identities.
- Meter and Predictor charts follow the current inventory filters across every page, without a separate source selector. Meter grouping tooltips describe totals as belonging to matching meters.
- Account energy/water units and site/source settings apply at All facilities; named facilities use their settings. Units remain visible in the chart coverage label. The shared canonical calendarization result is projected once for the chosen source; no per-facility calculation jobs or formula changes are introduced. Metric eligibility, zeros, gaps, conversions, and existing saved precision are preserved.
- Predictors retain individual saved histories, units, duplicate readings, and gaps. A facility-grouped trace panel selects individual histories by default; an explicit multiple-predictor mode compares raw saved values on one scale, ignoring units. Charts never generate or fetch weather data.
- Unified chart sheets are nonmodal so the header chooser stays accessible. Charts stay open across facility-scope changes and restore destination-scope grouping, metric/visibility, zoom, and Predictor single/multiple mode in session memory. Bulk selection clears. Inventory filters determine chart demand.
- Meters and Predictors share bulk selection across inventory pages. Filter or scope changes clear it. Deletion presents one confirmation grouped by facility, with reading counts and predictor-analysis consequences.
- Account batch commands validate explicit ownership and reviewed snapshots inside one native transaction, roll back the whole selection on failure, and publish one committed workspace reload. Existing single-facility handler contracts remain intact.
- Named scope prefills Meter/Predictor creation. All facilities requires an explicit facility choice, including one-facility portfolios. Named Analysis/Report creation offers facility-owned items; All facilities retains existing ownership choices.
- Preserve weather-station navigation, Meter Grouping, Analysis comparison, Report lifecycle actions, Upload, and contextual Data Validation access. Retain old dashboards and current single-facility routing throughout this phase.

### Acceptance and validation

- Exercise all meter groupings and sources across multiple facilities, duplicate names, unassigned meters, mixed units/bases, missing months, zeros, negative values, and filtered subsets. Group totals match the corresponding individual series.
- Verify chart scope preferences, loading/errors, keyboard navigation, paginated search, narrow layouts, themes, reduced motion, downloads, and print behavior through focused projection/component and Chromium checks.
- Test atomic cross-facility deletion with real IndexedDB: success and reopening, stale snapshots, foreign ownership, dependency cleanup, and rollback of earlier writes when a later item fails. Verify one command boundary per reviewed selection.
- Exercise named-scope creation handoffs and pending-save navigation protections; retain shared Analysis/Reports regressions.
- Run affected tests, the validation planner, full fast/browser suites, application type-check, and production web build. For this pass, Electron testing is explicitly excluded by the user because no Electron boundary changes.

### Phase 3 validation evidence

Completed 2026-10-28. Dashboard removal, routing retirement, folder moves, and single-facility presentation remain outside this pass.

| Check | Result |
| --- | --- |
| `npm run validate:agent -- --mode plan` | Passed; affected unit, type-check, and native-browser checks selected |
| `npm run test:all:ci` | Passed after final review fix: 448 fast-spec files / 2,585 tests; 56 Chromium files / 262 tests |
| `npx tsc -p tsconfig.app.json --noEmit` | Passed |
| `npm run build-prod` | Passed; existing Browserslist, stylesheet budget, and CommonJS dependency warnings remain |
| Chart interaction and presentation | Passed automated and visual checks for scope changes with the header accessible, matching-filter projections, facility-grouped traces, single/multiple Predictor histories, keyboard access, themes/high contrast, 390-pixel layouts, reduced motion, and print suppression |
| Atomic deletion | Passed native IndexedDB success/reopen, stale preview, foreign ownership, dependency update, and rollback checks; one command boundary per reviewed selection |
| Documentation and whitespace | 205 local link targets/heading anchors validated; `git diff --check` passed |
| Electron testing | Excluded by explicit user instruction for this pass; Electron boundaries are unchanged |

The narrow-window check caught chart canvas overflow; the shared chart grid now constrains its column so the canvas resizes to the available width. Obsolete creation expectations and incomplete overlay/focus fixtures were corrected before the final complete suite passed. Shared record shapes, GUID relationships, schema version, calculations, import/backup formats, and v0 command contracts remain unchanged; no migration trigger or migration is needed.

### Inventory selection UI follow-up

- The quiet **Select meters** and **Select predictors** toggles sit before Upload in their page headers, uses an unchecked/checked square icon, and matches the other header actions in height. Selection actions appear in a centered, themed panel; **Select all** retains matching-page eligibility behavior.
- The routed inventory owns selection state; the header delegates its toggle and derives availability from the inventory projection, avoiding reads of unbound child inputs during route activation. Cancelling or toggling off clears selection; chart demand continues to follow inventory filters.
- Predictor dashboard parity validation: 31 focused fast tests across four files and 12 Chromium inventory checks passed, including the shared header toggle for both resources, cross-page selection, cancellation, pending-state/empty-scope guards, route changes, themes, and narrow layouts. Application type-check, production web build, documentation links, and whitespace checks passed; the narrow Predictor dashboard was visually reviewed. Existing build warnings remain; Electron validation stays excluded.
- Batch validation: 30 focused fast tests across four files and 13 Chromium tests across two files passed, along with the application type-check and production web build. Chromium covers header order, button sizing, keyboard toggling, checked icons, selection across pages, cancellation, pending commands, resource changes, empty facility scope, themes/contrast, and 390-pixel layouts. The full-suite evidence above predates this UI-only follow-up. Electron testing remains excluded.

### Meter chart UI follow-up

- Removed the visible context heading/divider, Meter chart source controls and summary, and series search. Energy/Water/Cost and Meter groups/Facility totals/Individual meters now share a right-aligned toolbar with chart actions and dividers between groups. Lines connect data points with straight segments.
- Meter charts follow current inventory filters across all pages. Predictors now follow this same filtering contract and use the shared trace panel described below.
- Energy, Water, and Cost choices appear only when the matching meters provide finite monthly samples for that metric; zero and negative values remain valid data. A sole metric displays automatically without metric toggles or their leading divider. Unavailable remembered choices fall back to an available metric, and hiding traces does not remove metric choices. Loading, failure, and no-data states remain distinct.
- Metric availability validation passed: 35 focused fast tests, four Chromium checks, application type-check, and production web build. Coverage includes all metric combinations, empty/non-finite histories, valid zeros, automatic fallback after filtering, restored controls, and Predictor regressions. Desktop layout was reviewed; existing build and Chromium ResizeObserver warnings remain. Electron validation is excluded.
- A shell-owned backdrop covers routed content below the actual header boundary. Routed content becomes inert while Meter charts are open; the facility chooser and chart portal remain interactive. Dismissal clears the backdrop/inert state and restores focus after rendering. Print suppresses the backdrop and chart sheet. Other portal owners clear workspace blocking by default.
- Validation: focused component and Chromium checks protect simplified controls, projection through current filters, straight-line options with three monthly points, toolbar alignment/separators, header facility switching, background inertness, focus return, themes, 390-pixel layouts, print, and modal comparison/Predictor regressions. Passed: 21 focused fast tests across four files, 15 Chromium tests across three files, the application type-check, production web build, documentation links, and whitespace checks. Desktop and narrow screenshots were reviewed. Existing build warnings remain; Electron testing stays excluded.

### Facility-grouped trace browser

- Unified Meter charts now use a collapsible panel on the right with independent scrolling, facility headings, short trace labels, visible counts, and master/facility/trace checkboxes. One-facility views and facility-total charts use flat lists without repeated owner headings. Duplicate facility/trace names remain distinguishable by GUID.
- Double-clicking a trace or facility name isolates it; Enter/Space on a focused name performs the same action. Repeating isolation restores all traces in the current chart. Collapsing a facility preserves visible lines and checkbox state. Hover/focus highlights an already-visible line without changing values or zoom.
- Narrow layouts open the browser as a drawer with focus containment, Escape/backdrop dismissal, and focus return. Panel and facility-collapse preferences remain session-only and restore independently per scope.
- The trace panel fills the remaining height below chart controls, with its own scrolling list. Chevron and close controls use plain icons with keyboard focus outlines. The bottom sheet opts into a bounded flex body for Meter charts; other sheets retain their existing layout.
- Calculations, shared records, Worker inputs/results, imports, and backup formats are unchanged. Predictors retain saved-history selection. Old facility dashboards are retained for Phase 4.
- Validation passed: 56 focused tests across five fast-spec files, four Chromium tests across two files, application type-check, and production web build. Coverage includes 24 meters/two facilities, duplicate names, checkbox counts, double-click/keyboard isolation and restoration, paging removal, independent scrolling, scope preferences, hover styling without value/zoom changes, theme contrast, drawer focus/Escape/backdrop behavior, and Predictor regressions. Desktop and 390-pixel drawer screenshots were reviewed after chart animations finished. Documentation links and whitespace checks passed. Existing build warnings remain; Electron testing stays excluded. The height/icon follow-up passed 17 focused tests and four Chromium tests, type-check and web build, with panel-bottom alignment, unboxed controls, and refreshed desktop/narrow screenshots verified.

### Predictor chart consistency follow-up

- Unified Predictor charts use the same full-height facility-grouped trace panel, right-aligned actions, straight lines, header-accessible backdrop, mobile drawer, plain disclosure/close icons, download/zoom, and print behavior as Meters. Removed the chart heading, source selector/summary, history search, and paginated tabs.
- Single-history mode is the default. Radio choices and name activation select one predictor with its saved unit; unavailable selections fall back to an available history. Empty histories remain selectable and show an explicit empty state.
- Predictor chart titles and trace labels keep GUIDs internal. Repeated names across facilities need no type suffix; duplicates within one facility use station/type details and a simple ordinal only when those details also match. Record and trace identities remain GUID-based. Label regression validation passed: 22 focused tests, four Chromium checks, and application type-check; existing Chromium ResizeObserver warnings remain.
- **Multiple predictors** enables checkbox selection, facility/master toggles, and double-click or keyboard isolation. **Units ignored** explicitly marks a shared raw-value scale; original units stay in labels. No unit conversion, normalization, summation, or weather fetching occurs. Month/occurrence alignment preserves duplicate records, zeros, negatives, and missing values.
- Both resources follow all matching inventory pages, independent of bulk selection. Mode, selected history, multi-trace visibility, facility collapse, panel state, and zoom remain session-only and restore per account/resource/scope. Switching back to single mode preserves the prior history even if it is hidden in multiple mode.
- Phase 3 review fix: duplicate readings no longer introduce false gaps in other predictors. Explicit alignment padding is omitted from each rendered series while saved null samples still break its line. Category positions, duplicates, raw values, tooltip/value labels, and accessible gap descriptions remain intact. Both new fast regressions failed before the fix and passed afterward; the Chromium regression verifies rendered series, retained gaps, tooltips, and accessible descriptions. Final review has no remaining actionable findings.
- Shared data, calculations, Worker contracts, imports, backups, v0, and retained facility dashboards are unchanged. Phases 4–5 remain Not started.
- Validation: 50 focused fast tests across six files and four Chromium checks passed, covering 24 mixed-unit predictors across two facilities, single/multiple selection, raw values, duplicate/gap preservation, scope memory, themes, narrow-drawer focus/Escape, backdrop cleanup, print, and retained dashboard/Meter regressions. Desktop and narrow screenshots were reviewed; application type-check, production web build, documentation links, and whitespace checks passed. Existing build and Chromium ResizeObserver warnings remain. Electron validation stays excluded.

### Navigation consistency follow-up

- The Data rail preserves effective facility ownership/scope and opens unified Meters for that facility. At All facilities it retains the Facilities portfolio destination; remembered facility hints do not determine the destination.
- Choosing a facility from the Facilities portfolio opens the filtered Meters inventory, matching facility-card entry. Choosing All facilities there keeps the Facilities portfolio. Other resource inventories retain their destination when scope changes.
- Existing guarded navigation handles saves, cancellation, failure, and pending transitions before changing the URL or header context. Browser Back restores the originating Facilities portfolio; current single-facility routing remains unchanged.
- Validation passed: 90 focused fast tests across three files, two Chromium history checks, application type-check, production web build, documentation links/anchors, and whitespace checks. Coverage includes selected and All-facility Data entry, facility-owned workbench exits, chooser destinations, cancellation/failure, independent Predictor navigation, and Back/Forward. Existing web-build warnings remain; no Electron validation was required.

### Account sidebar Recents follow-up

- At All facilities, Analysis and Reports retain their account items grouped by type and add **Recents** for up to five recently opened facility-owned items per section. Item names are primary; a smaller facility icon and label sit beneath them, with full accessible names and title text for truncated labels.
- History records successful workbench entry, including direct URLs after workspace readiness. Revisits move an item to the top without duplicates; cancelled or failed navigation, inventories, and account workbenches do not add entries. Links use canonical owning-facility workbenches and existing leave guards.
- History remains session-only and independent per account/resource. Names and ownership resolve from the committed workspace; deleted records/facilities and unavailable report types are omitted. Named-facility sidebars keep their existing resource/stage navigation. No stored-record, backup, schema, calculation, or Electron changes are introduced.
- Validation passed: 35 focused fast tests across six files and three Chromium checks across two files, plus application type-check, production web build, documentation links/anchors, and whitespace checks. Existing web-build warnings remain; Electron validation is excluded. Coverage includes recency/capping/deduplication, initial readiness, account isolation, live names/deletions, hidden report types, guarded navigation, unchanged account groups, keyboard entry, secondary label hierarchy/contrast, long-name truncation, and narrow layouts. Desktop Analysis and narrow Reports screenshots were reviewed.

## Phase 4 — Dashboard retirement and resource-based folders

**Status: Not started**

### Changes

- Adapt single-facility routing before deletion: unified Meters, Predictors, and Analysis inventories automatically use the sole facility. Preserve hidden analysis pairing and direct workbench entry.
- Preserve the single-facility Reports exception: account-backed reports remain accessible rather than being excluded by a facility-only filter.
- After capability parity passes, delete obsolete facility Meters, Predictors, Analysis, and Reports dashboards, their routes, wrappers, providers, and superseded tests. Add no compatibility redirects.
- Update internal links, status destinations, breadcrumbs, Upload fallbacks/returns, and navigation helpers to use unified inventories. Retain facility-owned workbench, grouping, settings, and tool routes.
- Organize resource UI under feature roots such as `v1/data/{facilities,meters,predictors,energy-uses,custom-database}`, `v1/analysis`, and `v1/reports`. Place inventories and workbenches with their resource; retain account/facility subdivisions where workflows genuinely differ.
- Move feature modules, projections, actions, and tests with their owners. Keep `shared` for cross-feature presentation and infrastructure. Leave unrelated Home, Settings, and Imports reorganization outside this cleanup.
- Perform folder moves after dashboard deletion in separately reviewable commits. Update imports, documentation links, and architectural entry points together; leave no compatibility re-exports. Keep current inventory URLs unless removing an obsolete dashboard route.

### Acceptance and validation

- No internal caller, route, module, or test references a deleted dashboard or former folder location.
- Unified inventories preserve direct workbench entry, guarded navigation, Back/Forward restoration, status links, Upload returns/fallbacks, hidden analysis pairing, and single-facility report access.
- Run focused routing/module tests, full fast/browser suites, application type-check, and production web build. Check both portfolio and single-facility accounts before retiring their old destinations.
- Update roadmap, architecture, migration notes, and task context index with final feature entry points and validation evidence.

## Phase 5 — Single-facility presentation

**Status: Not started**

### Changes

- Complete the previously planned single-facility presentation using shared screens. Remove redundant account/facility choices and duplicate identity while preserving supported custom data, settings, backups, Upload, and reports.
- Preserve underlying account ownership, hidden analysis pairs, invalid-state recovery, and conversion to a portfolio.
- Remove remaining obsolete single-site presentation branches. A converted account regains portfolio navigation and scope choices without losing records or relationships.

### Acceptance and validation

- A valid single-facility account has no redundant scope choice or duplicate account workflow, while all supported settings, custom data, reports, and backups remain accessible.
- Test hidden analysis pairing, account-backed reports, settings, direct item entry, invalid single-site states, and conversion to a portfolio.
- Verify that conversion restores portfolio navigation without losing records or relationships; run focused and full validation appropriate to the changed boundaries.

## Validation and documentation policy

For each implementation phase, use the [risk-based testing policy](testing.md#what-a-change-requires) and the [validation skill](../.agents/skills/validate-web-and-electron/SKILL.md). Start with affected behavior tests, run `npm run validate:agent -- --mode plan`, and complete the selected checks. TypeScript changes require the application type-check; production UI/routing changes require the production web build under the repository policy. Use native-browser coverage for history, focus/overlay geometry, charts, and browser-dependent behavior. Add Electron-specific builds and manual checks when a changed runtime boundary requires them.

Check light, dark, and high-contrast themes, keyboard access, narrow browser/Electron windows, reduced motion, and printing where relevant. Record results and any remaining gaps with the completed phase. The initial roadmap-only change required document/link review. Each implemented phase requires the applicable application validation above.

As phases land, update the relevant [UI architecture](../ARCHITECTURE.md#ui-architecture) and [migration workflow notes](unified-ux-migration.md#workflow-decision-note) to describe the final behavior. Update stable task routing or repeatable workflow guidance only when those contracts actually change. Preserve the [workspace data-access rules](data-access-and-workspace.md) throughout implementation.
