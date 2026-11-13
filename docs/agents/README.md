# Agent documentation

Start with [repository rules](../../AGENTS.md), then choose one [task-router](context-index.md) entry. Read only the affected contract and workflow sections. [Architecture](../../ARCHITECTURE.md) maps system boundaries; current feature references own behavior, and [skills](../../.agents/skills) own repeatable procedure.

| Need | Owner |
| --- | --- |
| Workspace/scope/navigation/inventories | [Workspace architecture](../v1-workspace-architecture.md) |
| Forms, drafts, autosave/reconciliation | [Data editing](../v1-data-editing-architecture.md) |
| Reads, commands, transactions, backups | [Data workflow](../data-access-and-workspace.md) |
| Remaining legacy migration | [Migration policy](../unified-ux-migration.md) |
| Shared visual patterns | [Visual foundation](v1-visual-foundation.md) and [templates](angular-template-guidance.md) |
| Test evidence and runtime selection | [Testing guide](../testing.md) |
| PR preparation/publication/review | [PR workflow](pr-workflow.md), [creation](github-pr-creation.md), [fresh review](local-fresh-review.md), and [review publication](github-pr-review.md) |
| Task perspectives | [Modes](personas.md) |

Follow the router for Analysis, Reports, Energy Uses, Imports, Visualizations, and Home rather than loading every feature reference. Plans contain pending decisions/scope; current references contain implemented contracts; historical implementation evidence belongs in Git/PRs. Convert or delete a completed plan after preserving unique invariants and open acceptance. Do not create a parallel archive or copied component inventory.

Update the narrowest owner when behavior changes and repair every incoming link when moving a document. Run `npm run docs:check` for links, headings, shared-entry limits, and sizes. The checker validates local references, not remote issue state or factual correctness; inspect source and commands separately. Source examples inside fenced blocks are not treated as live links.
