# UX redesign prototypes

The VERIFI redesign replaces separate Data Management and Data Evaluation modes with one cohesive workspace for data entry, visualization, analysis, and reporting. Prototype work should explore that future experience without changing proven calculations, persisted relationships, backups, imports, exports, or report outputs.

Read the [prototype design foundation](prototype-foundation.md) before creating or changing a prototype screen. It defines the preserved product workflow, welcome-screen content model, visual direction, brand colors, weather-data expectations, and light/dark mode intent for prototype work.

For P1 facility Data sections, also read the [P1 data workbench pattern](p1-data-workbench-pattern.md). It captures the navigation, home/workbench split, scoped editor behavior, and real-data prototype expectations established by the meters workbench.

## Routing

- Each prototype uses a temporary top-level route named `/pN`, such as `/p1`, `/p2`, and `/p3`.
- Add prototype routes under `src/app/ux-prototypes/` and register them through the prototype route export used by `src/app/routing/app-routing.module.ts`.
- Keep existing production routes unchanged. Do not move, rename, or redirect `/welcome`, `/data-evaluation`, `/data-management/:id`, `/manage-accounts`, `/feedback`, or `/privacy` as part of prototype-only work.

## Data

- Use static mock data only for visual prototypes that are not wired to the active workspace.
- P1 facility Data workbench sections use real workspace data from `AccountWorkspaceStore` and persist writable prototype changes through existing workspace command boundaries and handlers.
- Do not read from or write to IndexedDB, weather services, backup services, import/export services, Web Workers, calculation services, or report writers unless the task explicitly changes from a visual prototype into production workflow implementation or the documented P1 Data workbench pattern applies.
- When a prototype needs realistic values, model only the minimum shape needed to render the screen.

## Components

- Keep prototype route components focused on page composition, routing-level state, workspace signal wiring or mock-data assembly, and command orchestration.
- Create prototype-owned child components when a section has its own interaction, repeated structure, dense form content, chart/table presentation, help panel, status summary, or likely reuse across prototype screens.
- Do not pile a complete workflow into a single `pN.component.html`, `pN.component.ts`, or `pN.component.css` file when meaningful component boundaries would make the prototype easier to reason about and iterate.
- Keep prototype child components under the owning prototype folder unless they are deliberately shared by multiple prototypes under `src/app/ux-prototypes/`.
- Preserve the repository's NgModule-based Angular pattern for prototype components unless the surrounding prototype module has deliberately migrated.

## Styling

- Put prototype screens under the `.verifi-prototype` root provided by the prototype shell.
- Use prototype-owned component CSS and the scoped prototype reset/tokens. Do not add prototype styles to `angular.json` or the global `src/styles/` bundle.
- Prefer reusable, prototype-scoped semantic classes and CSS custom properties for surfaces, spacing, typography, status, and actions so the visual direction remains easy to adjust across prototype components.
- Build responsive layouts by default and check mobile, tablet, desktop, and practical Electron window sizes for new prototype patterns.
- Avoid legacy global class names such as `.content`, `.measur-wrapper`, `.breadcrumbs`, data-management classes, report classes, and shared table/form classes unless the task intentionally copies a specific pattern into prototype-owned CSS.
- Inspect neighboring production screens for workflow context, then copy only the pieces that are deliberately part of the new design direction.

## Validation

- Prototype-only work does not need unit tests by default.
- Prefer compile checks such as `npx tsc -p tsconfig.app.json --noEmit` and `npx ngc -p tsconfig.app.json --noEmit`.
- Add focused automated tests only when fixing broken behavior, changing a shared contract, or introducing logic where manual validation is disproportionate.
