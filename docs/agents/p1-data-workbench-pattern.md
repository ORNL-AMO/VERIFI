# P1 data workbench pattern

Use this guide when extending the P1 facility Data section beyond meters, especially for predictors, energy uses, and events. Source code remains authoritative; this document captures the intended UX pattern so future sections feel like one workspace instead of separate tools.

## Goals

- Keep the Data section navigation compact as object counts grow.
- Give each facility-scoped data object a home view for scanning, adding, filtering, and choosing records.
- Give each selected record a focused workbench for setup, data entry, validation, and related actions.
- Keep long help content visible while forms, editors, and destructive confirmations are open.
- Preserve existing production data rules, labels, validation, disabled states, side effects, and write paths.

## Navigation Pattern

The Data nav should use progressive disclosure under the parent link.

- Keep the durable Data destinations as top-level items: Meters, Predictors, Energy Uses, and Events.
- Put object-specific child links directly under the active parent item. Do not create a separate "shortcuts" section for the same list.
- Open the child list by default when the user is on that parent destination, including both the parent home and a selected record workbench.
- Keep sibling object lists closed or absent by default. For example, do not show meter children when the active Data detail is Predictors.
- Provide an explicit chevron or expand toggle on parent items with children.
- Allow hover to temporarily expose the child list, but do not rely on hover as the only access path.
- Keep the parent link usable as the section home. For example, Meters goes to the meter card grid; child meter links go to a meter workbench.
- Show compact status and count metadata on parent and child rows. Avoid multi-line descriptions in the left nav.

Recommended route shape:

- Parent home: `/p1/workspace/facility/:facilityGuid/data/:detail/help`
- Selected record: same route plus query state, such as `?meter=:meterGuid`
- Future sections should prefer equivalent query keys such as `?predictor=`, `?energyUse=`, or `?event=` unless source code establishes a better convention.

## Home View Pattern

Each Data destination should start with a facility-scoped home view.

- Use a compact summary bar with facility context, record count, issue count, and primary add/import actions.
- Use searchable, filterable cards or dense rows for the record list.
- Make cards clickable to open the selected record workbench.
- Keep home-level management that affects the full facility on the home view, not inside an individual record. Meter Analysis Groups are the model for this: groups are facility-scoped, while a meter workbench only edits that meter's group assignment.
- Include empty, loading, read-only, pending, and error states.

## Selected Record Workbench

The selected record workbench should replace the home grid when a record query parameter is active.

- Keep the header focused on record identity, status, latest data, and primary actions.
- Use tabs for major record-scoped tasks. Do not add tabs for facility-scoped management.
- Put record assignment to facility-scoped structures inside Setup when it is truly a property of the record.
- Keep destructive actions close to the record they affect and use explicit confirmation text for data that will also be deleted.
- Return to the home view by clearing the selected record query parameter.

Meters currently use this pattern:

- Home: meter cards and Analysis Groups management.
- Workbench: Setup, Readings, Monthly Data.
- Setup: includes Analysis Group Assignment because `groupId` is a meter property.

Predictors, Energy Uses, and Events should use the same hierarchy where it fits: home for facility-level management; workbench tabs for selected-record tasks.

## Editors And Help

When a form needs a popout or drawer, scope it to the workbench content area instead of the full application viewport.

- Keep the right help panel visible while popout forms are open.
- Use full-screen behavior only at narrow widths where the help panel is already not side-by-side.
- Return focus to the control that opened the editor when it closes.
- Keep form labels, validation, disabled states, warnings, and production field sets intact even when restyling the surface.
- Avoid putting large editors in global modals unless the workflow truly needs to block the whole shell.

## Data And Writes

P1 facility Data workbench sections use real IndexedDB workspace data by default.

- Read facility-scoped data from `AccountWorkspaceStore` signals such as selected facility, facility meters, facility predictors, and related facility data.
- Persist changes through `WorkspaceCommandBoundary` and the existing command handlers for the entity.
- Clone records before editing. Do not mutate workspace signal values directly.
- Preserve GUID relationships. Do not confuse IndexedDB numeric `id` fields with cross-record GUIDs.
- Do not change IndexedDB schema, migration, import/export, calculation, report, Worker, or Electron IPC contracts for prototype UI work unless the user explicitly asks for that scope.

## Component Boundaries

Use prototype-owned components under the owning P1 page rather than importing production/shared UI templates for the main experience.

Recommended component shape:

- route/page component: workspace orchestration, selected query state, command calls, and editor state;
- home/index component: search, filters, card/list selection, empty states;
- setup form component: record metadata, validation, save/copy/delete actions;
- data table component: readings, predictor data, event history, or equipment rows as applicable;
- popout editor component: add/edit forms scoped to the workbench;
- facility-level manager component: group or categorization management that affects multiple records.

Reuse existing services, models, factories, handlers, pipes, and calculations. Reimplement the visual surfaces in prototype-owned templates and styles when the prototype is exploring a new look.

## Validation

For prototype-only work, compile checks are usually enough unless a change fixes broken behavior or crosses a runtime boundary.

- Run `npx tsc -p tsconfig.app.json --noEmit`.
- Run `npx ngc -p tsconfig.app.json --noEmit`.
- Manually check small Electron window, tablet, and desktop sizes for nav expansion, long names, focus order, empty states, disabled writes, and scoped popouts.
- Do not add unit tests by default for prototype-only iterations.
- Add focused automated tests only when fixing broken behavior, changing a shared contract, or introducing logic where manual validation is not a good fit.
