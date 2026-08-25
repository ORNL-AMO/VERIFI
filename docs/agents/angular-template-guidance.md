# Angular template guidance

Use this guide for production Angular templates, especially `src/app/v1/` work. It complements the [UI architecture](../../ARCHITECTURE.md#ui-architecture), the `implement-angular-feature` skill, and neighboring source code.

## Signal reads

Read signals directly in templates when the expression is simple and used once. Signal reads and computed signal reads are ordinary Angular template expressions; keep them obvious and close to the UI they drive.

When the same object-valued signal is read multiple times in the same template view, prefer a local `@let` alias near the first use:

```html
@let settings = appearance.settings();

<section
  [class.v1-palette-steel]="settings.palette === 'steel'"
  [class.v1-palette-blueprint]="settings.palette === 'blueprint'">
</section>
```

This is a readability and template-maintenance convention, not a performance workaround. Angular keeps `@let` values up to date with their expression, and the expression is re-evaluated with the template. Do not use `@let` as a replacement for reusable derived state.

Use descriptive local names such as `settings`, `account`, `facility`, or `selectedMeter`. Avoid leading underscores for template aliases; they read like unused or private values.

## Derived state

Use `computed()` in the component or service when derived state:

- is shared across multiple bindings, methods, components, or tests;
- filters, sorts, maps, reduces, allocates new objects, or performs non-trivial branching;
- names a reusable UI condition such as `isCompact`, `hasSquareCorners`, or `canSave`;
- protects a contract that should be tested outside the template.

Keep domain calculations, persistence decisions, file-format decisions, and cross-workflow rules out of templates. Templates should compose already-prepared presentation state and invoke explicit commands.

## Template expressions

Avoid repeated calls to ordinary component methods from templates. If a value is derived from reactive state, expose a signal or computed signal. If a value is a pure display transform, prefer an existing pipe or a small helper used outside hot repeated bindings.

Use `@let` inside the view that owns the repeated expression. Remember that control-flow blocks create nested views; declare the alias at the smallest useful scope that still covers all consumers.

Do not add `@let` for every single signal read. A template full of aliases can be harder to scan than direct bindings.

## Review expectations

Reviewers should treat repeated object signal reads as a maintainability issue when an alias would make the template clearer. This is usually non-blocking unless the repeated expression does meaningful work, allocates values, calls an ordinary method, or obscures a user-visible state.

Good review guidance:

- Suggest `@let settings = appearance.settings();` when several bindings read `appearance.settings().palette`, `appearance.settings().density`, or similar fields in one view.
- Suggest `computed()` when the template repeats a condition with business meaning or non-trivial derivation.
- Flag ordinary method calls in repeated bindings, loops, or conditionals when they could run often or produce unstable values.
- Avoid churn comments for one-off direct signal reads.

References: Angular's [`@let` guide](https://angular.dev/guide/templates/variables), [`@let` API](https://angular.dev/api/core/%40let), and [`computed` API](https://angular.dev/api/core/computed).
