---
name: change-calculations-and-reports
description: Change VERIFI calculations, conversions, validation/status checks, analyses, Web Worker computation contracts, dashboards, or report values and exports. Use when formulas, units, aggregation, calculation inputs or outputs, Worker messages, or report totals may change.
---

# Change calculations and reports

1. Read [Calculations, Workers, and reports](../../../ARCHITECTURE.md#calculations-workers-and-reports) plus the [Implementer](../../../docs/agents/personas.md#implementer) and [Reviewer](../../../docs/agents/personas.md#reviewer) modes.
2. Locate the pure calculation under `src/app/calculations/` or `src/app/shared/shared-analysis/calculations/`. Trace every caller, relevant model, Worker, dashboard, report component, and file writer before editing.
3. State the formula, units, aggregation level, date boundaries, missing-data behavior, and rounding policy. Preserve full precision until the existing presentation boundary unless the domain rule says otherwise.
4. Keep calculation code deterministic. Avoid DOM, Angular service, IndexedDB, or Electron dependencies in code shared with Workers.
5. When a Worker is involved, update its request payload, response, error result, caller, and structured-clone assumptions together. Check all synchronous and Worker-backed paths using the shared calculation.
6. Keep on-screen, printed, and exported values aligned. Inspect Excel, PDF, and PowerPoint writers when a shared report value changes.
7. Add table-driven tests with normal, boundary, zero, missing, invalid, and representative unit-conversion cases. Include a regression case for the issue being solved.

## Validate

- Run `npm run test:ci` for pure calculations and report assembly.
- Run `npm run test:browser:ci` when Worker creation or messaging changes.
- Compare representative before/after outputs and explain every intentional delta.
- Run `npm run build-prod` and `npm run build-prod-electron` for changed report or shared renderer paths.
- Manually inspect generated files or printable output when automated assertions cannot establish layout or workbook fidelity.

## Guardrails

- Do not change units, site/source treatment, calendarization, or rounding as an incidental refactor.
- Do not mutate shared input objects unless the existing contract explicitly requires it.
- Do not update one presentation surface while leaving other consumers on the old calculation contract.
- Stop for domain-owner direction when the expected formula or policy is ambiguous.

Complete with the calculation contract, affected consumers, intentional result changes, test cases, and output checks.
