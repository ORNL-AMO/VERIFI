# v1 visual foundation

Use this note with issue #2553 when building the production v1 workspace. It turns the useful P1 prototype visual work into a lightweight living foundation. It is not a complete production design system, and it should grow only as real v1 workflows are implemented.

The source code, [UI architecture](../../ARCHITECTURE.md#ui-architecture), [prototype design foundation](prototype-foundation.md), [P1 selected prototype baseline](p1-selected-prototype-baseline.md), and [P1 walkthrough feedback](p1-prototype-walkthrough-feedback.md) remain supporting sources of truth.

## Acceptance framing

Issue #2553 is satisfied by defining the visual and interaction defaults that keep v1 cohesive while leaving detailed component behavior to each workflow issue or pull request.

- Visual foundation means shared direction, tokens, interaction patterns, and maintenance rules, not a complete component catalog.
- Common controls are defined by role and expected behavior first. Concrete production components should be added as v1 workflows need them.
- P1 remains the visual reference. Production v1 should rebuild patterns under `src/app/v1/` rather than importing prototype-only components.
- Future workflow work should update this note only when a pattern becomes durable across v1.

## Brand and tokens

Use VERIFI's existing colors as semantic anchors:

| Role | Color | Use |
| --- | --- | --- |
| Primary action and VERIFI accent | `#ff6000` | Primary calls to action, attention, selected priority work |
| Account context and energy/completion | `#145a32` | Account-level cues, success, completion, energy-positive states |
| Facility context and navigation | `#2c386b` | Facility-level cues, structural navigation, selected facility work |

Define production v1 styling through semantic token categories instead of one-off component colors. Durable v1 foundation styles live in V1-owned scoped CSS under `src/app/v1/styles/`; every production foundation selector must be rooted under `.v1-root` or use a `v1-*` class so the legacy v0 UI can coexist unchanged.

- Background, surface, panel, muted surface, border, divider, shadow, and backdrop.
- Text, muted text, inverse text, link, focus, disabled, and placeholder.
- Primary, account, facility, success, warning, danger, info, and neutral status.
- Spacing, radius, elevation, table row, form field, drawer width, and shell column sizing.
- Chart series, chart grid, chart annotation, and chart status colors.

Typography should stay practical and dense. Use readable application-scale headings, compact labels, strong numeric hierarchy for metrics, and no viewport-scaled font sizes. Keep letter spacing at normal except for small uppercase labels where the pattern already exists and remains readable.

## Shell and context

Production v1 should use the P1 workspace structure as the starting point:

- Persistent labeled primary navigation.
- Contextual secondary navigation for section details and selected records.
- Main workspace content area.
- Right support panel for help, todos, results, and details.
- Header or top workspace area that keeps active account and facility context visible.

Account and facility context must be visually distinct. Use text labels plus structural and color cues, not color alone. Account context should use the account/green cue; facility context should use the facility/blue cue. Multi-facility accounts need a clear facility switcher, and single-facility accounts should still keep account-level work reachable.

## Controls and states

Standardize these common controls as they appear in v1:

- Buttons: primary, secondary, quiet, destructive, icon-only, and icon-with-label.
- Segmented controls: mutually exclusive layout, mode, or scope choices.
- Tabs: major task areas inside a page, workbench, or support panel.
- Tables and dense rows: sortable or filterable data with stable status and action placement.
- Forms: explicit labels, helper text where useful, inline validation, disabled and pending states.
- Chips and badges: compact status, count, context, and required/optional labels.
- Alerts and status rows: visible warning, error, success, loading, empty, blocked, and pending states.
- Support panel content: help, todos, results, and details with consistent tab behavior.

Use Font Awesome or established repository icon conventions for symbolic buttons. Icon-only controls need accessible labels and visible focus. Do not rely on hover-only help for required instructions or blocking validation.

Button color should communicate the action's consequence, not decorative emphasis. Use orange primary buttons only for the main recommended or commit action in a local decision area. Use blue secondary buttons for navigation, workspace movement, opening details, switching contexts, or facility-structured actions. Use green success buttons only for success continuation, completion, account-context confirmation, or energy-positive states. Use red danger buttons only for destructive actions such as delete, remove, reset, discard, overwrite, or other data-loss paths. Use quiet or ghost buttons for cancel, close, skip, external/support links, optional utilities, and alternate actions that should not compete with the primary path.

Keep one filled orange button per section, card group, or dialog footer. Icon-only buttons should stay neutral unless they are destructive or actively selected. Disabled buttons should not rely on color to explain state; pair the disabled state with labels, helper text, validation, or status copy where the reason is not obvious.

## Drawers and modals

Use contextual slideout drawers for meaningful form and data-entry work:

- Add or edit account, facility, meter, predictor, energy-use, event, analysis, report, import, and setup content.
- Dense forms where users benefit from keeping workspace context or help visible.
- Scoped editors inside a workbench, especially when the right support panel should remain useful.
- Multi-step setup or import flows that are too heavy for a confirmation modal.

Keep drawers scoped to the active workspace or workbench when possible. Use full-viewport drawer behavior only on narrow screens or when the workflow must block the shell. Drawer headers should name the object and action, bodies should scroll independently when needed, and footers should keep primary and cancel actions stable.

Use modals for simple blocking choices:

- Destructive confirmations.
- Route guards for unsaved changes.
- Short yes/no or choose-one decisions.
- Small confirmations where no form workflow is required.

Avoid large form workflows in global modals unless the workflow must block the whole application. Destructive modals must name what will be deleted and use explicit action labels.

## Theme policy

Keep light mode, dark mode, and user-selectable appearance options. Theme options were a strong positive signal in the P1 walkthrough.

Promote a small production-ready theme set first:

- Default
- Steel
- Blueprint
- Neon
- Aurora
- Forest

Neon and Aurora are supported as experimental v1 palettes. Every theme must be built from semantic tokens, pass contrast checks in light and dark mode, and work with tables, charts, forms, drawers, modals, and status colors.

Corner-style and high-contrast options are v1 appearance settings. Palette-matched background patterns are supported for the promoted theme set: Default and Blueprint use Blueprint grid, Steel uses Machined hatch, Neon uses Neon grid, Aurora uses Aurora flow, and Forest uses Topographic contours. Backgrounds remain secondary and must never reduce readability or status clarity. Glow effects remain a prototype-only reference until a production issue explicitly promotes them.

## Accessibility and responsive expectations

Every durable v1 pattern should support:

- Keyboard access and predictable focus order.
- Visible focus for buttons, links, tabs, menus, drawers, modals, and table actions.
- Semantic labels for icon controls, context switchers, status, and dialogs.
- Accessible contrast in light and dark mode.
- Screen-reader-visible status for loading, saving, errors, empty states, and completed actions.
- Responsive behavior for browser widths and Electron windows.
- Stable table, chart, and form layouts with deliberate overflow when data is wide.

When a drawer or modal opens, move focus into it and return focus to the opener on close when practical. Keep blocking errors visible without requiring hover, hidden tabs, or closed support panels.

## Maintenance

Maintain this foundation just-in-time:

- Add or revise a pattern only when production v1 uses it in a real workflow.
- Link to the workflow issue or pull request when a durable decision is made.
- Keep volatile implementation details in source rather than duplicating them here.
- Do not copy a full inventory of components, routes, screens, or states.
- Do not change data, persistence, imports, exports, calculations, reports, Workers, or Electron behavior as part of visual foundation work.

When a production pattern becomes broadly reused, consider extracting it into `src/app/v1/` UI structure or a version-neutral shared helper only if it is free of v0 and prototype presentation assumptions.

## Validation expectations

For this documentation baseline, validate links and paths in the same change. TypeScript or build checks are not required unless the documentation adds source examples that need compilation.

For the first production v1 shell that applies this foundation, add focused tests for theme class application, context indicators, support panel state, drawer open and close behavior, and confirmation modal behavior. Manual review should include light and dark themes, keyboard focus, contrast, drawer sizing, mobile and Electron window behavior, long labels, and visible error and status states.
