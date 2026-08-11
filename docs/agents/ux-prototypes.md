# UX redesign prototypes

The VERIFI redesign replaces separate Data Management and Data Evaluation modes with one cohesive workspace for data entry, visualization, analysis, and reporting. Prototype work should explore that future experience without changing proven calculations, persisted relationships, backups, imports, exports, or report outputs.

## Routing

- Each prototype uses a temporary top-level route named `/pN`, such as `/p1`, `/p2`, and `/p3`.
- Add prototype routes under `src/app/ux-prototypes/` and register them through the prototype route export used by `src/app/routing/app-routing.module.ts`.
- Keep existing production routes unchanged. Do not move, rename, or redirect `/welcome`, `/data-evaluation`, `/data-management/:id`, `/manage-accounts`, `/feedback`, or `/privacy` as part of prototype-only work.

## Data

- Use static mock data by default and colocate it with the prototype that consumes it.
- Do not read from or write to IndexedDB, backup services, import/export services, Web Workers, calculation services, or report writers unless the task explicitly changes from a visual prototype into production workflow implementation.
- When a prototype needs realistic values, model only the minimum shape needed to render the screen.

## Styling

- Put prototype screens under the `.verifi-prototype` root provided by the prototype shell.
- Use prototype-owned component CSS and the scoped prototype reset/tokens. Do not add prototype styles to `angular.json` or the global `src/styles/` bundle.
- Avoid legacy global class names such as `.content`, `.measur-wrapper`, `.breadcrumbs`, data-management classes, report classes, and shared table/form classes unless the task intentionally copies a specific pattern into prototype-owned CSS.
- Inspect neighboring production screens for workflow context, then copy only the pieces that are deliberately part of the new design direction.

## Validation

- Prototypes do not need dedicated tests. Just ensure project can build without errors.
