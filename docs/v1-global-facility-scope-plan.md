# Global Facility Selection and Unified Inventories

## Purpose and delivery

Replace the account-to-facility-dashboard drill-in with one set of inventories controlled by a shared facility choice in the header. Keep item workbenches and distinct facility tools, while making the selected context visible throughout navigation.

This document records the agreed target experience and implementation roadmap. It does not describe shipped behavior or authorize implementing every phase together. Work through each phase separately and update its status and validation evidence when completed.

| Phase | Deliverable | Status |
| --- | --- | --- |
| 1 | Header chooser and shared filtering | Complete |
| 2 | Contextual navigation and workbench journeys | Complete |
| 3 | Unified inventories and removal of facility dashboards | Not started |
| 4 | Shared screens for single-facility accounts | Not started |

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
- Clearing local filters retains the header selection. Counts and empty states explain the current scope. Facilities appears in the sidebar at All facilities only. The Data section opens Facilities at All facilities; facility-context sidebars contain scoped resources and tools.
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
- Keep current single-facility account routing during the portfolio phases; the shared single-facility presentation lands in Phase 4.

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
- Facilities navigation resets to All facilities, while other inventory links preserve scope.
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

## Phase 3 — Unified inventories and removal of facility dashboards

**Status: Not started**

### Changes

- Preserve facility meter/predictor charts, bulk selection/deletion, creation, upload, and validation shortcuts within unified inventories when a named facility is selected. Reuse existing projections and command handlers.
- Retain grouping, weather-station navigation, analysis comparison, and report lifecycle behavior. Scope changes clear transient selections and comparison/chart sessions as appropriate so they cannot act on hidden items from the previous scope.
- Prefill creation with the selected facility. Facility-scoped Analysis/Report creation offers facility-owned items; All facilities retains existing scope choices.
- After capability parity is verified, delete superseded facility Meters, Predictors, Analysis, and Reports inventory/dashboard components and routes. Do not redirect their former URLs.
- Update all internal links, breadcrumbs, status destinations, upload returns, and navigation helpers to target the unified workflow directly. Remove obsolete tests and replace their expectations with the new behavior.
- Retain item workbenches, Meter Grouping, settings, and distinct facility tools. Home overview redesign and implementation of unfinished Energy Uses functionality are outside this effort.

### Acceptance and validation

- Portfolio users browse one inventory per resource, with no intermediate facility inventory dashboard.
- Existing facility charts, bulk operations, item creation, comparison, and report actions remain available in the appropriate selected-facility context.
- No internal caller targets a deleted dashboard route, and no compatibility redirect or unused dashboard presentation remains.
- Test capability parity, contextual creation, scope changes during transient actions, ownership checks, and direct workbench entry.
- Use browser checks for chart behavior, bulk-action confirmations, guarded exits, upload returns, and the complete inventory-to-workbench journey. Confirm calculations and command semantics remain unchanged.

## Phase 4 — Shared screens for single-facility accounts

**Status: Not started**

### Changes

- Route valid single-facility accounts through the same inventory components, automatically scoped to their sole facility.
- Hide redundant account identity, All facilities, facility management, and account-analysis choices. Show the facility/company identity once in the header.
- Present custom database tools, combined settings, upload, backups, and supported reports with facility-oriented labels. This is a presentation change; retain their underlying ownership.
- Preserve account records, hidden analysis pairs, and account-backed reports without exposing duplicate account workflows or hiding supported reports.
- Remove superseded single-site v1 redirects and presentation branches. Preserve invalid-state recovery and conversion to a portfolio; a converted account regains portfolio scope choices and account-level navigation.

### Acceptance and validation

- Single- and multi-facility accounts share inventory screens, with navigation adapted to their capabilities.
- A valid single-facility account has no redundant scope choice or duplicate account workflow, while all supported settings, custom data, reports, and backups remain accessible.
- Test hidden analysis pairing, account-backed reports, settings, direct item entry, invalid single-site states, and conversion to a portfolio.
- Verify that conversion restores portfolio navigation without losing records or relationships.

## Validation and documentation policy

For each implementation phase, use the [risk-based testing policy](testing.md#what-a-change-requires) and the [validation skill](../.agents/skills/validate-web-and-electron/SKILL.md). Start with affected behavior tests, run `npm run validate:agent -- --mode plan`, and complete the selected checks. TypeScript changes require the application type-check; production UI/routing changes require the production web build under the repository policy. Use native-browser coverage for history, focus/overlay geometry, charts, and browser-dependent behavior. Add Electron-specific builds and manual checks when a changed runtime boundary requires them.

Check light, dark, and high-contrast themes, keyboard access, narrow browser/Electron windows, reduced motion, and printing where relevant. Record results and any remaining gaps with the completed phase. The initial roadmap-only change required document/link review. Each implemented phase requires the applicable application validation above.

As phases land, update the relevant [UI architecture](../ARCHITECTURE.md#ui-architecture) and [migration workflow notes](unified-ux-migration.md#workflow-decision-note) to describe the final behavior. Update stable task routing or repeatable workflow guidance only when those contracts actually change. Preserve the [workspace data-access rules](data-access-and-workspace.md) throughout implementation.
