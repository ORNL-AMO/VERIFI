# Agent documentation

This directory indexes the repository context used by coding agents and human contributors. The content is portable: agents that discover repository skills can load them automatically, and other agents can follow the same links from `AGENTS.md`.

## Choose the right layer

| Layer | Purpose | Location |
| --- | --- | --- |
| Persistent guidance | Rules, commands, source routing, and review expectations that apply to every task | [`AGENTS.md`](../../AGENTS.md) |
| Architecture | Current runtime boundaries, modules, persistence, calculations, file flows, and invariants | [`ARCHITECTURE.md`](../../ARCHITECTURE.md) |
| Data workflow | Practical examples for workspace reads, selections, persistence, transactions, and committed refreshes | [`data-access-and-workspace.md`](../data-access-and-workspace.md) |
| Task context | Minimal entrypoints, document sections, modes, skills, risks, and initial validation | [`context-index.md`](context-index.md) |
| Prototype foundation | Shared product, workflow, visual, welcome-screen, and theming guidance for redesign prototypes | [`prototype-foundation.md`](prototype-foundation.md) |
| P1 data workbench pattern | Facility Data navigation, home/workbench layout, scoped editors, and real-data prototype guidance | [`p1-data-workbench-pattern.md`](p1-data-workbench-pattern.md) |
| Task modes | Implementer, Investigator, Reviewer, Test Engineer, and Designer checklists | [`personas.md`](personas.md) |
| Skills | Repeatable task workflows loaded only when relevant | [`.agents/skills`](../../.agents/skills) |

Executable configuration and source code remain authoritative for volatile facts. These documents explain how to find and safely change that source.

## Start a task

Use the [task context index](context-index.md) to select entrypoints, exact sections, mode, skill, cross-boundary triggers, and initial validation.

## Maintenance

- Keep `AGENTS.md` small and limited to durable repository-wide guidance.
- Put descriptive system context in `ARCHITECTURE.md`.
- Put workflow steps in the matching skill instead of duplicating them here.
- Keep `context-index.md` limited to durable routing and starting points, not implementation inventories.
- Update `personas.md` only when a task mode's responsibilities change.
- Prefer source links over copied inventories or version numbers.
- Validate relative links, commands, and paths in the same pull request.

When an agent makes a recurring wrong assumption, identify the narrowest layer that would have prevented it and update that source.
