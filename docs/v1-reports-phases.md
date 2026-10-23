# V1 Reports: phased implementation roadmap

Tracking document for [issue #2790 — Build v1 Reports navigation, dashboards, and report lifecycle](https://github.com/ORNL-AMO/VERIFI/issues/2790).

This document defines the implementation sequence only. Each phase will be planned, implemented, validated, and reviewed separately. Creating this document does not implement any phase.

## Phase 1 — Facility report dashboard

- [x] Enable facility Reports navigation.
- [x] Display saved reports with search, filtering, sorting, and status.
- [x] Support creating, opening, copying, and deleting reports.
- [x] Provide a minimal selected-report landing until the workbench is implemented.
- [x] Clearly identify report-specific content that is pending migration.

**Completion checkpoint:** facility reports can be discovered and managed without losing existing settings.

Phase 1 initially shipped with a limited account Reports landing and facility dashboard links; phase 3 replaces that landing with the combined inventory. The account report inventory and lifecycle actions remain in phase 3. Emission Factors reports are available only when account Other Impacts is enabled; apply the shared rule to account Emission Factors and Better Climate in phase 3.

## Phase 2 — Facility report workbench

- [x] Establish the selected-report layout, header, switching, and return navigation.
- [x] Provide shared Setup, applicable Data Checks, and Report stages.
- [x] Establish integration points for individual report migrations.
- [x] Include save feedback, error recovery, and unsaved-navigation protection.

**Completion checkpoint:** individual facility report issues can supply their settings, checks, and previews within the shared workbench.

## Phase 3 — Account report dashboard

- [x] Enable account Reports navigation and lifecycle actions.
- [x] Connect the portfolio Reports inventory across account and facility scopes.
- [x] Provide a minimal selected-account-report landing.
- [x] Make account-required reports accessible from single-facility workspaces.

**Completion checkpoint:** account and facility reports are discoverable and route to the correct owning workspace.

Implemented with a combined account inventory and shared Simple/Summary/Detailed cards on both dashboards. Scope headers, workspace insets, title/action placement, and browse returns follow Analysis. Account reports open a minimal saved-configuration landing; account report workbench stages are supplied by phase 4. Both scopes support create, copy, rename, and delete through the existing command boundary. Single-facility workspaces retain explicit Account Reports access and existing hidden analysis references without report-entry reconciliation. Report content remains pending independently of setup status.

## Phase 4 — Account report workbench

- [x] Apply the shared workbench structure to account reports.
- [x] Preserve account-specific settings and analysis references.
- [x] Support single-facility workflows through the existing hidden account-analysis pairing.
- [x] Provide integration points for individual account report migrations.

**Completion checkpoint:** account report issues can add their content without rebuilding common workflow infrastructure or requiring redundant analysis setup.

Implemented with shared report header/stage presentation and autosave scheduling, with scope-specific account and facility contexts. Account Setup edits the name and the linked analysis for Better Plants, Performance, Analysis, and Savings. Data Checks applies to Better Plants, Performance, and Savings; other account types use Setup and Report. Checks and previews remain pending integration points. Single-facility choices use facility analyses while retaining account-analysis GUID references: explicit selection or refresh reuses/creates only the required hidden pair and commits it with the report in one transaction. Browsing performs no reconciliation. Dates, report-specific settings, calculations, and output remain with their report migrations.

## Phase 5 — Shared workflow wrapup

- [x] Audit the remaining acceptance criteria in [#2790](https://github.com/ORNL-AMO/VERIFI/issues/2790), with the deferrals below.
- [x] Connect actionable report status destinations to existing common Setup controls and linked analyses.
- [x] Verify navigation, ownership, saved-report compatibility, and lifecycle behavior through automated coverage.
- [x] Cover keyboard/focus, light/dark/high-contrast themes, narrow layouts, and practical renderer widths in Chromium.
- [x] Record report-specific work under its owning issues.
- [ ] Analysis Used By integration — explicitly deferred to a later maintainer update; screens, counts, and links are unchanged.
- [ ] Native Electron interaction/manual screen-reader verification — not exercised by this change.

**Completion checkpoint:** the scoped status-link and foundation-audit work is implemented. Do not describe all of #2790 as complete or automatically close it: Used By integration remains deferred, and native manual validation remains a gap.

Report names open common Setup for either scope. Account report analysis findings open the existing selector; linked-analysis warnings open the owned analysis Setup, using only an existing saved pair for single-facility accounts. Dates, reporting periods, data selection, and facility-report analysis selection stay unavailable until their editors migrate. Mixed name/settings findings offer **Review name** while identifying the remaining settings as pending. One workspace-aware presentation projection serves active findings, Todos, entity findings, discarded warnings, and report-card findings without changing validation or dismissal identities.

### Acceptance audit for #2790

| Acceptance criterion | Evidence and remaining work |
| --- | --- |
| Account/facility navigation and combined inventory | Existing [inventory](../src/app/v1/shared/reports/reports-dashboard/reports-dashboard.component.spec.ts), [route](../src/app/v1/v1.routes.spec.ts), and [browser journey](../src/app/v1/account/reports/account-reports-dashboard/account-reports-dashboard.component.browser.spec.ts) coverage verifies scope ownership, controls, pagination, breadcrumbs, and browse returns. |
| Create, open, copy, rename, delete through command boundaries | Existing [account lifecycle](../src/app/v1/account/reports/account-report-actions.service.browser.spec.ts) and [facility lifecycle](../src/app/v1/facility/reports/facility-report-actions.service.browser.spec.ts) coverage verifies writes, failures, isolation, and reopen behavior. |
| Shared Setup, applicable Data Checks, and Report stages | Account/facility workbench specs cover every supported report type and pending stages; report-specific editors and output remain outside this foundation. |
| Open existing reports without recreation or lost settings | Lifecycle/reopen specs and [setup transactions](../src/app/v1/account/reports/account-report-setup.browser.spec.ts) preserve settings and GUID links. Status browser journeys additionally use real repositories and transactions, assert no navigation writes, and reopen the stored records. |
| Analysis Used By references | Deferred by maintainer direction. Existing informational screens and dependency presentation remain unchanged. |
| Single-facility account-required reports | Existing route/setup coverage and the status browser journeys retain account Reports access and saved hidden-pair GUIDs without navigation reconciliation. |
| Persisted shapes, backups, ownership, and v0 compatibility | No models, schema, migrations, backup formats, calculation contracts, or v0 sources change. Existing lifecycle/setup tests exercise durable GUID relationships; destination tests cover missing/foreign owners, duplicate GUIDs across scopes, and Other Impacts availability. |
| Loading, empty, invalid, disabled, pending, success, error, and unsaved protection | Existing workbench/inventory tests plus status journeys cover these states, pending/failed saves, browser Back, retries/discard, and unchanged pending-content distinctions. |
| Typed forms, shared UI, keyboard/focus, themes, and responsive windows | Existing reactive editors and shared navigation/modal conventions remain. Chromium checks cover status-link keyboard activation, resource focus and scroll restoration, contrast, and 1024/640/390 px layouts. The audit exposed and fixed a shared inventory-grid issue where a previous expanded span retained an implicit second column after narrowing; columns are now measured without stale spans. Native Electron interaction and manual screen-reader checks remain unperformed. |

Validation completed for this change: focused status/report/shell specs, `npm run test:all:ci`, `npx tsc -p tsconfig.app.json --noEmit`, the agent validation planner, `npm run build-prod`, local documentation-link checks, and `git diff --check`. The production build retains existing browser-support, component-style budget, and CommonJS warnings. No Electron runtime boundary changed; native Electron and screen-reader manual checks remain deferred as recorded above.

### Remaining report migrations

Facility report content stays in Data Overview [#2792](https://github.com/ORNL-AMO/VERIFI/issues/2792), Analysis [#2793](https://github.com/ORNL-AMO/VERIFI/issues/2793), Savings [#2794](https://github.com/ORNL-AMO/VERIFI/issues/2794), Modeling [#2795](https://github.com/ORNL-AMO/VERIFI/issues/2795), Cost Savings [#2796](https://github.com/ORNL-AMO/VERIFI/issues/2796), Data Quality [#2797](https://github.com/ORNL-AMO/VERIFI/issues/2797), and Emission Factors [#2798](https://github.com/ORNL-AMO/VERIFI/issues/2798).

Account report content stays in Data Overview [#2799](https://github.com/ORNL-AMO/VERIFI/issues/2799), Savings [#2800](https://github.com/ORNL-AMO/VERIFI/issues/2800), Analysis/Modeling [#2801](https://github.com/ORNL-AMO/VERIFI/issues/2801), Performance [#2802](https://github.com/ORNL-AMO/VERIFI/issues/2802), Emission Factors [#2803](https://github.com/ORNL-AMO/VERIFI/issues/2803), Better Plants [#2804](https://github.com/ORNL-AMO/VERIFI/issues/2804), and Other Impacts [#2805](https://github.com/ORNL-AMO/VERIFI/issues/2805). Printing/export infrastructure stays in #2791 and final output verification in #2806.

## Boundaries and working rules

- Complete and review one phase before starting the next.
- Allow lifecycle actions for existing report types while clearly marking unfinished settings and previews.
- Include focused validation and documentation in each implementation phase.
- Preserve persisted records, GUID relationships, backups, and v0 compatibility.
- Keep report-specific content in its individual migration issue.
- Keep export infrastructure in [#2791](https://github.com/ORNL-AMO/VERIFI/issues/2791) and final cross-report output verification in [#2806](https://github.com/ORNL-AMO/VERIFI/issues/2806).
