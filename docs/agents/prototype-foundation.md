# VERIFI prototype design foundation

Use this guide as the shared foundation for VERIFI redesign prototypes. It is not a production design system and does not replace source code, architecture notes, or task-specific skills. It defines the product frame, preserved workflows, visual direction, responsive behavior, and content expectations that prototype agents should carry forward.

## Product frame

VERIFI is utility data tracking software for manufacturing companies. It helps users organize company-level and facility-level utility data, evaluate performance, and create reports from established analyses.

The application is already mature. Prototypes should improve the user experience without redefining VERIFI's data model, calculations, persisted relationships, imports, backups, reports, or web/Electron delivery model. Current architecture remains the source of truth for runtime boundaries, persistence, file flows, calculations, and report behavior.

## Preserved workflow

Prototype concepts should reflect the established VERIFI flow:

1. Set up a company account.
2. Add facilities under the account.
3. Add utility meters and predictors at the facility level.
4. Incorporate weather data for weather-based predictors.
5. Group meters for analysis and reporting.
6. Create facility-level analyses for each facility.
7. Roll up facility analyses into account-level analyses to evaluate overall performance.
8. Create reports at both the facility and account level from completed analyses.
9. Track facility energy-use equipment and evaluate where energy is going.
10. Import data from the Excel template or restore/share `.json` backup files.

Designs may reorganize how the workflow is presented, but they must preserve the domain relationships and the practical sequence users need to complete.

## UX principles

- Treat data entry, visualization, analysis, and reporting as one cohesive workspace instead of two disconnected modes.
- Keep the same core capabilities and domain language unless a task explicitly asks to explore naming.
- Use existing production components, forms, tables, help text, validation states, and neighboring workflow screens as content references. For example, a redesigned meter form should preserve the established meter fields, options, required states, units, and actions even when the layout changes.
- Make setup progress, validation status, next actions, and blocked work visible without requiring users to hunt through separate screens.
- Design for dense industrial data: long facility names, wide tables, unit-bearing values, charts, reports, and multi-facility portfolios.
- Provide an intentional help pattern for dense guidance, especially calculation explanations, validation details, weather-data context, and reporting assumptions.
- Include loading, empty, validation, warning, error, disabled, and success states when a prototype introduces an interaction pattern.
- Preserve import, backup, weather data, calculation, Worker, and report contracts unless the task explicitly moves from visual prototype into production workflow implementation.
- Favor practical task completion over marketing-style presentation. The first screen should feel like the entry point to a working application.

## Visual direction

Use the existing VERIFI colors as required brand anchors:

| Role | Color |
| --- | --- |
| Orange accent | `#ff6000` |
| Green brand/energy | `#145a32` |
| Blue brand/navigation | `#2c386b` |

Use "industrial chic" as the design inspiration: professional, durable, precise, modern manufacturing-oriented, and confident without becoming decorative. Good prototype surfaces should feel like they belong in a utility analytics tool used repeatedly by engineers, energy managers, and plant staff.

Apply that direction through:

- restrained surfaces, clear grid structure, crisp dividers, and compact controls;
- strong information hierarchy for accounts, facilities, meters, predictors, analyses, reports, and status;
- measured use of orange for priority actions or attention, green for completion/performance/energy cues, and blue for navigation or structural framing;
- Bootstrap, ng-bootstrap, Font Awesome, Plotly, and existing Angular template conventions where practical;
- accessible contrast, semantic labels, visible focus states, keyboard operation, and responsive behavior for browser and Electron windows.

Prototype styling must remain scoped under `.verifi-prototype`. Use semantic tokens for surfaces, text, borders, focus, actions, status, and chart accents so light and dark mode can share the same component structure. Do not hard-code one-off colors inside individual prototype components when a shared token would express the same purpose.

Dark mode support is a foundation requirement for prototype direction. A prototype does not need a working theme switch unless requested, but color choices, contrast, shadows, borders, charts, and state indicators should be planned so both light and dark palettes are viable.

## Responsive design

Prototype screens must be responsive by default. Design the same workflow to work in the browser and Electron window without assuming a fixed desktop canvas.

Use responsive layouts that:

- start from the smallest practical viewport, then enhance for larger screens;
- keep primary actions, workspace context, validation status, and navigation reachable without horizontal scrolling;
- let dense tables, charts, and comparison views use deliberate overflow, pinned context, pagination, tabs, or stacked summaries instead of shrinking text until it becomes unreadable;
- use CSS grid, flexbox, Bootstrap responsive utilities, and stable min/max constraints rather than fixed pixel layouts;
- preserve readable line lengths, comfortable touch targets, visible focus, and clear form labels at narrow widths;
- avoid overlapping text, clipped controls, layout jumps, and cards nested inside cards as content wraps;
- account for Electron window constraints, including shorter heights and resizable windows.

When a prototype introduces a new layout pattern, check at mobile, tablet, and desktop widths. For data-heavy screens, also check the smallest supported Electron-sized window and document any intentional horizontal scroll region.

## Help content

VERIFI includes areas where help text needs to explain calculations, data requirements, units, weather data, validation, reports, and workflow consequences. Prototype designs should make room for this content without overwhelming the main task surface.

Use help patterns that:

- keep short hints close to the relevant field, chart, calculation, or status;
- place longer explanations in expandable panels, side panels, popovers, modals, or dedicated help regions;
- support dense technical content with headings, lists, examples, units, and links to related workflow steps;
- remain accessible by keyboard and screen reader, with clear labels and focus behavior;
- avoid hiding blocking errors or required setup guidance behind hover-only interactions.

## Welcome screen foundation

The redesigned welcome screen should preserve the current content while presenting it with a more professional application-entry feel. It is the launch point into an account, not the place where users do the main VERIFI work.

Keep these content elements:

- VERIFI name and a concise utility tracking and analysis value statement.
- Primary getting-started actions:
  - create a new account;
  - upload an account backup;
  - load an example account.
- Account portfolio entry points when accounts already exist, making it clear that selecting an account opens the workspace where setup, data management, analysis, reporting, imports, and equipment tracking happen.
- ORNL Industrial Resources and in-application help references.
- Email list subscription.
- Contact and feedback information.

The first viewport should make the user's next best action obvious. Existing users should quickly return to a recent account. New users should understand that setup begins by creating or importing an account; after entering that account, they add facilities, meters, predictors, analyses, reports, and other account-scoped data.

## Prototype mock data

Use static mock data by default and colocate it with the prototype that consumes it. Mock only the minimum shape needed to render the screen. Use the existing models under `src/app/models/idbModels/` as references so prototype data includes the relevant account, facility, meter, predictor, analysis, report, weather, and GUID relationship fields without inventing incompatible shapes.

When prototyping established workflows, inspect the existing production component for that workflow before drafting new content. Reuse its fields, labels, options, helper text, validation messages, empty states, and actions as the default content source, then improve the hierarchy, grouping, and interaction design in the prototype.

Use realistic manufacturing examples that include:

- account and facility names;
- facility, meter, predictor, weather data, analysis, and report counts;
- current setup/status indicators;
- recent activity or modified dates when useful;
- representative utility, production, and weather-related values with units.

Do not read from or write to IndexedDB, weather services, backup services, import/export services, Web Workers, calculation services, or report writers unless the task explicitly changes from prototype exploration to production implementation.
