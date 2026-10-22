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

Implemented with a combined account inventory and shared Simple/Summary/Detailed cards on both dashboards. Scope headers, workspace insets, title/action placement, and browse returns follow Analysis. Account reports open a minimal saved-configuration landing; account report workbench stages remain phase 4. Both scopes support create, copy, rename, and delete through the existing command boundary. Single-facility workspaces retain explicit Account Reports access and existing hidden analysis references without report-entry reconciliation. Report content remains pending independently of setup status.

## Phase 4 — Account report workbench

- [ ] Apply the shared workbench structure to account reports.
- [ ] Preserve account-specific settings and analysis references.
- [ ] Support single-facility workflows through the existing hidden account-analysis pairing.
- [ ] Provide integration points for individual account report migrations.

**Completion checkpoint:** account report issues can add their content without rebuilding common workflow infrastructure or requiring redundant analysis setup.

## Phase 5 — Shared workflow wrapup

- [ ] Audit the remaining acceptance criteria in [#2790](https://github.com/ORNL-AMO/VERIFI/issues/2790).
- [ ] Connect available analysis Used By references and report status destinations.
- [ ] Verify navigation, ownership, saved-report compatibility, and lifecycle behavior.
- [ ] Complete accessibility, theme, responsive, and practical Electron-window checks.
- [ ] Record remaining report-specific work under its owning issues.

**Completion checkpoint:** the shared Reports foundation satisfies #2790, with unfinished report content explicitly tracked elsewhere.

## Boundaries and working rules

- Complete and review one phase before starting the next.
- Allow lifecycle actions for existing report types while clearly marking unfinished settings and previews.
- Include focused validation and documentation in each implementation phase.
- Preserve persisted records, GUID relationships, backups, and v0 compatibility.
- Keep report-specific content in its individual migration issue.
- Keep export infrastructure in [#2791](https://github.com/ORNL-AMO/VERIFI/issues/2791) and final cross-report output verification in [#2806](https://github.com/ORNL-AMO/VERIFI/issues/2806).
