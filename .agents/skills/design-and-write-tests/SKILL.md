---
name: design-and-write-tests
description: Design, implement, or review meaningful VERIFI tests and regression coverage. Use for test strategy, choosing between fast Vitest, Angular TestBed, Chromium integration, Electron/manual checks, investigating flaky tests, evaluating coverage gaps, or making tests the primary deliverable.
---

# Design and write VERIFI tests

1. Read [Test layers](../../../docs/testing.md#test-layers), [what a change requires](../../../docs/testing.md#what-a-change-requires), and the [Test Engineer](../../../docs/agents/personas.md#test-engineer) mode. Add the affected subsystem skill.
2. State the observable behavior, plausible regression, affected contract, and why the failure matters before selecting assertions.
3. Choose the lowest adequate layer:
   - Use a fast `*.spec.ts` for pure logic, service decisions, forms, guards, pipes, or jsdom-supported component behavior.
   - Use `TestBed` only when dependency injection, templates, lifecycle, forms, routing, or Angular-created signals are part of the contract.
   - Use `*.browser.spec.ts` for real IndexedDB, Workers, File APIs, structured cloning, or another native browser dependency.
   - Use focused Electron/manual evidence for operating-system integration that the existing automated tiers cannot represent.
4. Inspect neighboring production code and specs. Reuse a real, cheap collaborator when it increases confidence; mock nondeterministic or external boundaries with the smallest realistic interface.
5. Build minimal deterministic fixtures. For a defect, reproduce the failure in a regression test before or alongside the fix when feasible.
6. Assert public results, persisted shapes, state transitions, rendered output, emitted values, error handling, and cleanup. Do not add creation-only tests, arbitrary sleeps, real network calls, retry-based flake suppression, or assertions coupled to private implementation.
7. Clean up databases, Workers, subscriptions, listeners, mocks, timers, TestBed state, and changed global values.
8. Run the focused spec during iteration, then its required parent suite. Use `validate-web-and-electron` for the final matrix.

Complete with the behavior protected, selected tier and rationale, focused and parent-gate results, manual evidence, intentional gaps, and linked follow-up work.
