# Unified UI/UX migration policy

Use this policy when moving a remaining legacy workflow into production v1. For ordinary v1 maintenance, start with the [task router](agents/context-index.md) and the owning current contract. Implemented v1 screens, shared controls, styles, and the [visual foundation](agents/v1-visual-foundation.md) are the design references.

## Boundaries

Root routing opens `/v1`; `/welcome` and the existing Data Management/Evaluation URLs remain legacy entry points. Separate v0/v1 presentation and route shells. Production v1 never imports `@v0/*`. Rebuild presentation locally and reuse neutral contracts through `@shared/*`, `@data/*`, `@domain/*`, and `@platform/*`. Keep feature folders and ordinary domain names rather than version-prefixed components or broad type buckets.

UI migration does not incidentally change persisted records, GUID relationships, database schema, backup/import formats, calculation meaning, Worker payloads, report values, or Electron IPC. An explicitly authorized change to one of those contracts requires its subsystem workflow, all consumers, compatibility evidence, and appropriate tests. User data remains durable across both UIs.

## Decide a remaining workflow

Inspect its reachable v0 route and neighboring screens before describing parity. Source is the current-state inventory; do not build exhaustive screen/route registers. Record only the decision needed in the owning issue or current feature reference:

- Workflow and reachable v0 entry point.
- User purpose, account/facility/resource ownership, and important actions.
- Disposition: rebuild presentation, reuse neutral logic, explicitly link to v0, combine, defer, or retire.
- Fields, units, validation, help, results, and side effects that must survive.
- Data/file/calculation/Worker/runtime contracts touched and required evidence.
- Unresolved product decisions, acceptance gaps, and their owning issues.

Do not infer low usage or authorize retirement from an old implementation. A deferred feature remains explicit pending scope rather than invented results or a silent v0 fallback. V1 findings with unavailable fixes follow the [validation policy](v1-data-validation-rules.md).

## Current owners

- [Workspace architecture](v1-workspace-architecture.md): scope, navigation, shared inventories/charts, Settings, and single-facility presentation.
- [Data editing](v1-data-editing-architecture.md): typed forms, autosave, reconciliation, drafts, and Weather review.
- [Energy Uses](v1-energy-uses-architecture.md): equipment/group workflow, annual projections, import/export, and remaining acceptance.
- [Facility](v1-facility-analysis-architecture.md) and [account](v1-account-analysis-architecture.md) Analysis: calculation orchestration, result identity, and hidden pairs.
- [Reports](v1-reports-architecture.md): feature runtime, analysis checks, presentation, and output extension; [remaining work](v1-reports-phases.md).
- Visualization [foundation](v1-visualization-foundation.md), [persistence](v1-visualization-persistence.md), [workbench](v1-visualization-workbench.md), and [utility providers](v1-utility-visualizations.md); [remaining Visualization/Home work](v1-visualizations-and-home-plan.md).
- [Data workflow](data-access-and-workspace.md), [imports](v1-data-import-architecture.md), and [architecture](../ARCHITECTURE.md): neutral transactions, compatibility, and runtime boundaries.

## Validation and maintenance

Protect changed behavior at the lowest useful tier under the [testing guide](testing.md). Use focused checks during iteration and the scoped validation planner before handoff. Run web checks for production routing/UI; add native browser or Electron checks when their boundaries change. Pre-PR gates remain distinct from routine iteration. Record failed or missing checks rather than treating historical results as current evidence.

Each current contract has one owner. Update it and link to it; keep delivery sequencing and evidence in issues/PRs. On completion, convert a plan to current requirements or delete it after preserving unique invariants and unresolved acceptance. Git retains historical decisions. Do not append old branch stacks, superseded screen designs, chronological test counts, or repeated workflow inventories to current references.
