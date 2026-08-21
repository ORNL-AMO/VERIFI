# P1 selected prototype baseline

Use this note with issue #2557 as the selected P1 direction for production v1 work. It translates the first walkthrough feedback into a lightweight implementation baseline. It does not require a complete prototype of every screen before building.

The source code, [Unified UI/UX migration guide](../unified-ux-migration.md), [Unified UI/UX current-state notes](../unified-ux-current-state.md), [UX redesign prototypes](ux-prototypes.md), [prototype design foundation](prototype-foundation.md), [v1 visual foundation](v1-visual-foundation.md), [P1 data workbench pattern](p1-data-workbench-pattern.md), and [P1 walkthrough feedback](p1-prototype-walkthrough-feedback.md) remain the supporting sources of truth.

## Acceptance framing

Issue #2557 is satisfied by establishing the stable production baseline and moving into implementation. Screen-level details should be decided as each v1 workflow is rebuilt, bridged, deferred, combined, or retired.

- Final navigation map means the high-level workspace navigation, route pattern, and context model, not a complete route inventory.
- Representative approved screens means the current P1 examples are the approved reference set, not a requirement to prototype every production screen.
- Legacy capabilities to reuse, rewrite, or retire are documented by category now. Workflow-specific decisions are recorded just-in-time in the relevant issue or pull request.
- Second-phase stakeholder feedback should review the first usable production v1 slice, not another full prototype cycle.

## Production baseline

P1 is the selected baseline for the unified workspace. Production v1 should keep the current VERIFI capabilities and contracts while presenting data entry, visualization, analysis, reporting, settings, imports, and backups as one workspace.

The stable primary navigation model is:

- Home
- Data
- Visualization
- Analysis
- Reports
- Settings
- Imports & Backup

Production v1 should use these route patterns unless a workflow issue records a specific exception:

- `/v1`
- `/v1/workspace/account/:section/:detail/:panelTab`
- `/v1/workspace/facility/:facilityGuid/:section/:detail/:panelTab`

Omitted or invalid detail and panel values should redirect to canonical defaults. Account and facility routes should keep deep links stable enough for implementation, testing, and stakeholder review while the opt-in v1 experience matures.

## Context behavior

Production v1 must make account-level and facility-level context immediately visible. The account context is for portfolio setup, account-wide settings, imports and backups, account reports, and multi-facility coordination. Facility context is for facility data, meters, predictors, energy uses, events, visualizations, facility analyses, facility reports, and facility settings.

Use stronger visual distinction than the first P1 walkthrough provided. Carry forward these requirements:

- Keep the active account and facility names visible in the shell.
- Make the context switcher clear enough for multi-facility accounts.
- Separate persistent navigation from the active work area with stronger structure.
- Preserve direct access back to account-level work even when a facility is selected.
- Consider facility-specific cues, such as location or logo content, when a workflow has useful real data for them.

For single-facility accounts, v1 should default users into the facility workflow where possible because that was the strongest positive signal from the walkthrough. Account-level tasks remain reachable through explicit navigation, especially account settings, imports and backups, account reports, and account-level setup.

## Representative approved screens

The approved reference set is the current P1 prototype direction:

- Welcome screen with create account, upload backup, load example, and existing account entry points.
- Account Home with overview, todo list, goal progress, setup status, portfolio readiness, and next actions.
- Facility Home with equivalent overview, todo list, goal progress, readiness, and facility-specific status.
- Facility Data workbench, especially the meters home and selected meter workbench pattern.
- Facility Analysis dashboard and workbench patterns for setup, references, regression, results, comparison, and visible errors.
- Settings and theme direction, including light and dark mode viability and user-selectable visual options.

These screens are enough to start production implementation. New v1 screens should inspect the related v0 workflow for field, validation, help, and side-effect parity, then apply the selected P1 layout and interaction patterns.

## Layout and interaction rules

Use these common rules as production v1 defaults:

- Use persistent labeled navigation rather than icon-only navigation.
- Use contextual secondary navigation for section details and selected records.
- Keep a right-side support panel pattern for help, todos, results, and details when it improves task completion.
- Keep setup progress, validation status, next actions, blocked work, and errors visible.
- Make important controls visually prominent, especially tabs, switches, meter and analysis group controls, and error states.
- Reduce deep nesting and long explanatory text in the main work area.
- Preserve dark-mode viability and theme options while bringing back more VERIFI character than the first P1 walkthrough.
- Design for dense industrial data, long names, wide tables, charts, units, responsive browser layouts, and Electron window sizes.
- Cover loading, empty, validation, error, disabled, and success states as each workflow is implemented.

## Initial v1 component and route breakdown

Production v1 should be built under `src/app/v1/`. Do not import prototype-only P1 components into production v1 unless a later issue deliberately promotes them.

Start with:

- production workspace shell;
- account and facility context switcher;
- primary rail;
- section navigation;
- right support panel;
- placeholder workflow outlet pages;
- workflow pages added one at a time.

Use P1 as a reference for composition and behavior, but rebuild production components in v1. Shared, version-neutral logic belongs in shared data, domain, platform, and helper layers only when it is not coupled to v0 or prototype presentation.

## Legacy capability disposition

Use this default policy until a workflow-specific issue records a different decision:

- Reuse shared data, domain, persistence, backup, import, export, report, Worker, Electron, model, and calculation contracts.
- Rewrite v1 UI shell, page, navigation, support panel, and workflow presentation components.
- Share extracted helpers only when they are version-neutral and free of legacy presentation assumptions.
- Temporarily link or route to v0 for workflows that are not yet rebuilt.
- Defer low-priority workflows by documenting the workflow note, not by creating placeholder inventories.
- Retire legacy UI only when the workflow issue or pull request explicitly records the retirement.

No IndexedDB, backup, import/export, calculation, Worker, report, or Electron contract changes are part of this baseline issue.

## Implementation backlog

Build v1 in thin production slices:

1. Workspace shell with account/facility context, primary navigation, secondary navigation, right support panel, canonical routing, and placeholder workflow outlets.
2. Account and facility Home with overview, todo list, and goal progress using real workspace state where appropriate.
3. First facility Data workflow using the P1 meter workbench as the reference pattern.
4. Facility Analysis dashboard and workbench enough to validate the navigation and context model against real workflow pressure.

For each slice, add the smallest useful workflow note using `docs/unified-ux-current-state.md` and `docs/unified-ux-migration.md`.

## Stakeholder review

Run the next stakeholder review after the first usable production v1 slice exists. Focus that review on:

- account versus facility context clarity;
- single-facility workflow speed and clarity;
- whether the interface has enough VERIFI character;
- visibility of important controls and error states;
- visibility of backup account and last-backup information;
- whether the production implementation direction still feels right.

This replaces a broad second prototype phase unless maintainers explicitly request one.

## Validation expectations

For this documentation baseline, validate links and paths in the same change. Run TypeScript compilation only when documentation adds route-linked code examples that need source verification.

For production v1 shell work, add focused component tests for context switching, canonical routing, panel state, and single-facility redirects. For workflow implementation, add focused tests for changed behavior and add browser tests only when IndexedDB, File APIs, or Workers are directly exercised. Run production web and Electron builds before handing off a production v1 slice.
