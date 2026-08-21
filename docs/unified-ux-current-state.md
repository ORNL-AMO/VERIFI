# Unified UI/UX Current-State Notes

Use this guide with issue #2558 when a v1 workflow needs current-state context. It is intentionally lightweight: do not create a complete inventory of every current v0 route, modal, tab, wizard step, component, or service before v1 work starts.

The source code remains the current-state inventory. Use the route files under `src/app/v0/routing/` and the neighboring v0 screens as the source of truth for reachable behavior.

## High-Level Legacy Areas

Start from these areas when planning v1 work:

- **Welcome and account management:** account creation, backup import entry, example data, account portfolio entry points, account deletion, feedback, privacy, and static support content.
- **Data Management:** account setup, facility setup, facility data, meters, meter readings, meter grouping, predictors, predictor readings, energy uses, import workflows, custom fuels, custom grid factors, and custom GWPs.
- **Data Evaluation:** account and facility home pages, overview dashboards, utility data views, visualizations, analysis setup and results, report setup, report dashboards, report results, and report data checks.
- **Weather data:** station selection, annual station data, and monthly station data used by weather-based predictors.
- **Imports, backups, and exports:** spreadsheet import steps, JSON backup import/export flows, example accounts, generated reports, printed views, and workbook/PDF/PowerPoint outputs.
- **Account and facility contexts:** distinguish account-level workflows, facility-level workflows, meter-scoped workflows, predictor-scoped workflows, and custom account data.
- **Single-facility behavior:** note when single-facility accounts bypass, hide, or duplicate multi-facility paths.

## Documentation Rules

- Do not copy the full route tree into this document. Link to source when route reachability matters.
- Add detailed notes only when a workflow enters prototype review, v1 planning, implementation, deferral, combination, or retirement.
- Store workflow notes in the relevant issue or pull request. Add a link here only when the note becomes durable migration context.
- Document components and services only when they affect migration decisions, shared-contract risk, or test coverage.
- Do not guess whether a capability is common, advanced, or low-use. Use that label only when there is evidence from users, maintainers, analytics, or prior issue discussion.
- Keep duplicated or shared behavior visible when it is discovered, especially meter data, predictor data, custom factors, weather data, reports, and single-facility paths.

## Workflow Note Template

Use the smallest note that preserves useful current-state context:

```markdown
### Current-State Note

- Workflow:
- Existing v0 entry point:
- User purpose:
- Active context: Account | Facility | Meter | Predictor | Report | Other
- Primary actions:
- Data touched:
- Outputs:
- Help and dialogs:
- Duplication or stale behavior:
- v1 disposition: Rebuild | Share logic | Temporary v0 route | Combine | Defer | Retire
- Required tests:
```

## Validation

For each workflow note:

- Verify route reachability against `src/app/v0/routing/` or the owning route module.
- Inspect at least one neighboring v0 screen before summarizing behavior.
- Identify protected contracts from the unified migration guide before proposing v1 changes.
- Add focused tests only when implementation changes behavior.

For documentation-only updates to this guide, validate links and run `npx tsc -p tsconfig.app.json --noEmit` when the update includes route-linked examples or code references.
