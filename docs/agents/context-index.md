# Agent task router

Choose one row. Read the relevant workflow and affected reference sections, then inspect source and one neighboring implementation. Add another workflow only when its boundary changes. Repository rules already apply; linked documents are conditional references, not a preload list.

| Task | Starting source | Current reference | Workflow |
| --- | --- | --- | --- |
| Production UI or legacy migration | Owning feature under `src/app/v1/` or `src/app/v0/` | [Migration policy](../unified-ux-migration.md); [visual foundation](v1-visual-foundation.md) for presentation; [templates](angular-template-guidance.md) | `implement-angular-feature` |
| Workspace navigation, scope, inventories, or shared chart sheets | `v1/routing/`, `v1/shell/`, resource inventory | [Workspace architecture](../v1-workspace-architecture.md) | `implement-angular-feature` |
| Data Settings, readings, or Weather editing | `v1/data/editing/`, owning workbench | [Data editing](../v1-data-editing-architecture.md) | `implement-angular-feature`; persistence for writes |
| Energy Uses | `v1/data/energy-uses/`, `domain/calculations/energy-footprint/` | [Energy Uses](../v1-energy-uses-architecture.md) | Angular; calculation or persistence only when affected |
| Facility or account Analysis | `v1/analysis/`, `domain/calculations/analysis-calculations/` | [Facility](../v1-facility-analysis-architecture.md) or [account](../v1-account-analysis-architecture.md) architecture | Angular; `change-calculations-and-reports` for results/Workers |
| Reports or file output | `v1/reports/`, `platform/reports/` | [Report architecture](../v1-reports-architecture.md); [remaining migrations](../v1-reports-phases.md) for planning | Angular; calculations or import/export for those contracts |
| Saved visualizations | `domain/visualizations/`, `v1/visualizations/` | [Foundation](../v1-visualization-foundation.md), [persistence](../v1-visualization-persistence.md), [workbench](../v1-visualization-workbench.md), or [utility](../v1-utility-visualizations.md), according to changed contract | Angular, calculation, persistence, or file workflow as affected; facility inclusion changes cross definition/runtime scope, commands, backups, and deletion |
| Visualization/Home planning | Relevant feature | [Remaining phase plan](../v1-visualizations-and-home-plan.md) | Design first; feature workflows for implementation |
| Status, findings, or To-dos | `v1/status/`, shared evaluator | [V1 validation rules](../v1-data-validation-rules.md) | Angular; calculation/persistence when affected |
| Startup, workspace publication, or persistence | `application-lifecycle/`, `data/account-workspace/`, `data/indexedDB/` | [Data workflow](../data-access-and-workspace.md); [migrations](../../src/app/data/indexedDB/data-migrations/README.md) | `change-indexeddb-persistence` |
| Calculations or Workers | `domain/calculations/`, `platform/web-workers/` | [Calculation boundaries](../../ARCHITECTURE.md#calculations-workers-and-reports); owning feature contract | `change-calculations-and-reports` |
| Spreadsheet imports/exports or backups | `data/import/`, `data/backup/`, owning writer | [Import architecture](../v1-data-import-architecture.md); [backup workflow](../data-access-and-workspace.md#backup-workflows-and-services) | `change-data-import-export`; persistence for stored shapes |
| Electron | `main.js`, `preload.js`, `platform/electron/` | [Runtime boundary](../../ARCHITECTURE.md#web-and-electron-boundary) | `validate-web-and-electron` |
| Tests or validation | Changed behavior and neighboring specs | [Testing policy](../testing.md) | `design-and-write-tests` or `validate-web-and-electron` |
| PR preparation or feedback | Pinned target/head comparison | [PR workflow](pr-workflow.md); [creation](github-pr-creation.md) or [review](github-pr-review.md) procedure | `review-code-changes` or `address-pr-review` |
| Release/CI | Caller and reusable workflows | [Release process](../release-process.md) | `validate-web-and-electron` |

Paths in the table are relative to `src/app/` unless explicit. Skills live under [`.agents/skills`](../../.agents/skills). Use the appropriate [task perspective](personas.md) without expanding scope: Investigator for diagnosis, Designer for UX, Implementer for authorized edits, Reviewer for assessment, and Test Engineer for coverage work.

Begin with the lowest-cost valuable check. Native IndexedDB, Workers, File APIs, or browser behavior require the corresponding integration tier. Run the scoped validation planner before final checks; the testing guide determines parent gates. Electron checks require an Electron boundary or explicit desktop release scope.

Use [`ui-iterate`](../../.agents/skills/ui-iterate/SKILL.md) only for an explicitly requested interactive feedback loop. Design-only and investigation-only requests do not authorize implementation; review alone does not authorize publication.
