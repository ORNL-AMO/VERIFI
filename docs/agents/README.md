# Agent documentation

This directory indexes the repository context used by coding agents and human contributors. The content is portable: agents that discover repository skills can load them automatically, and other agents can follow the same links from `AGENTS.md`.

## Choose the right layer

| Layer | Purpose | Location |
| --- | --- | --- |
| Persistent guidance | Rules, commands, source routing, and review expectations that apply to every task | [`AGENTS.md`](../../AGENTS.md) |
| Architecture | Current runtime boundaries, modules, persistence, calculations, file flows, and invariants | [`ARCHITECTURE.md`](../../ARCHITECTURE.md) |
| Task modes | Implementer, Investigator, Reviewer, and Designer checklists | [`personas.md`](personas.md) |
| Skills | Repeatable task workflows loaded only when relevant | [`.agents/skills`](../../.agents/skills) |

Executable configuration and source code remain authoritative for volatile facts. These documents explain how to find and safely change that source.

## Task lookup

| Task | Mode | Skill |
| --- | --- | --- |
| Angular feature or UI implementation | Implementer, plus Designer for UI/UX | `implement-angular-feature` |
| UI/UX design or review without code | Designer | Read the task-mode guide; no implementation skill is required |
| IndexedDB model, store, index, or migration | Implementer and Reviewer | `change-indexeddb-persistence` |
| Calculation, Worker, analysis, or report | Implementer and Reviewer | `change-calculations-and-reports` |
| Spreadsheet, structured file, or backup flow | Implementer and Reviewer | `change-data-import-export` |
| Defect diagnosis | Investigator | Add the skill for the affected subsystem |
| Cross-runtime verification | Reviewer or Implementer | `validate-web-and-electron` |

## Maintenance

- Keep `AGENTS.md` small and limited to durable repository-wide guidance.
- Put descriptive system context in `ARCHITECTURE.md`.
- Put workflow steps in the matching skill instead of duplicating them here.
- Update `personas.md` only when a task mode's responsibilities change.
- Prefer source links over copied inventories or version numbers.
- Validate relative links, commands, and paths in the same pull request.

When an agent makes a recurring wrong assumption, identify the narrowest layer that would have prevented it and update that source.
