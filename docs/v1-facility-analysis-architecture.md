# V1 Facility Analysis Architecture

This document is the implementation reference for the production v1 facility-analysis dashboard and workbench. It explains ownership, state lifetimes, calculation orchestration, and extension points. Use it before adding a setup field, regression option, result calculation, or results page.

## Scope and boundaries

The feature lives under [`src/app/v1/facility/analysis`](../src/app/v1/facility/analysis). It owns v1 routing, interaction state, draft editing, status presentation, and result presentation. It reuses version-neutral models, persistence commands, calculations, and Worker infrastructure from `data`, `domain`, `platform`, and `shared`.

Production v1 code must not import v0 presentation or services. A calculation helper belongs outside v1 only when it is deterministic and genuinely shared with another application surface. IndexedDB records remain the durable source of truth; view services and facades are route-scoped projections over those records.

The feature is organized by workflow ownership:

```text
facility/analysis/
  facility-analysis-dashboard/       inventory, commands, cards, and dashboard projections
  facility-analysis-workbench/
    editing/                          draft autosave lifecycle
    analysis-setup/                   analysis-wide settings
    group/                            group context, setup, regression, and group results
    results/
      calculation/                    request projection, fingerprinting, and Worker coordination
      presentation/                   shared result views, display settings, status, and toolbar
      facility/                       facility annual/monthly result routes
    used-by/                          downstream dependency presentation
```

Keep specs beside the implementation they protect. Do not introduce broad feature-level `components`, `services`, `models`, or `specs` buckets; add code to the workflow that owns it. Each Angular component keeps its class, template, styles, and spec in its own component folder.

## Route and ownership model

The dashboard lists analyses and performs create, copy, activate, and delete commands. Opening an analysis creates one workbench component instance for the route `/v1/workspace/facility/:facilityGuid/analysis/workbench/:analysisGuid`.

The workbench owns the services that must survive child-tab navigation:

| Owner | Responsibility | Lifetime |
| --- | --- | --- |
| `FacilityAnalysisWorkbenchContext` | Resolves the selected account, facility, analysis, meter groups, stages, and status findings from the workspace | One analysis workbench route |
| `FacilityAnalysisAutosaveService` | Maintains committed and editable analysis copies, debounces valid edits, persists through the command boundary, and exposes navigation state | One analysis workbench route |
| `FacilityAnalysisResultsService` | Decides when result work is valid, builds the calculation request, cancels stale work, and caches the latest matching result | One analysis workbench route |
| `FacilityAnalysisResultsDisplayService` | Owns table/graph selection and the user’s result-column preferences | One analysis workbench route; column preferences persist in v1 local storage |
| `RegressionCandidateStore` | Holds generated, uncommitted regression candidates by analysis and group GUID | One analysis workbench route; never persisted directly |

Each group route creates `FacilityAnalysisGroupContext`. It resolves the group, group meters, meter-group metadata, and group findings. Setup and Regression then create page-specific facades:

- `FacilityAnalysisGroupSetupFacade` owns setup projections and analysis-draft mutations. Its component owns confirmations and UI events.
- `FacilityAnalysisRegressionFacade` owns candidate generation, model selection, regression draft transitions, and validation coordination. Its component owns confirmations, slideout focus, and UI events.
- `RegressionModelValidationService` owns debouncing, cancellation, and the validation Worker state for the active Regression page.

Keep a component focused on rendering and direct interaction. Put multi-step state transitions, calculation requests, and derived domain projections in the route-scoped facade or coordinator. Put deterministic transformations in plain functions with direct unit tests.

## Persisted and transient state

`IdbAnalysisItem` and its `AnalysisGroup` entries are durable. Cross-record references use GUIDs, including the analysis GUID, group GUID, meter group relationship, and banking dependency.

The autosave service keeps two copies:

1. `committed` is the last record confirmed by the workspace command boundary.
2. `draft` is the editable copy rendered by setup and regression pages.

Every draft transition clones before mutation and marks `isAnalysisVisited` false. Valid edits become `dirty`, then `saving`, then `saved`. Invalid form edits remain in the draft with state `invalid` and do not start persistence or result calculation. A failed write becomes `error` and can be retried or discarded.

Generated regression candidates, pending confirmation choices, open editors, selected result views, loading flags, and Worker subscriptions are transient. Do not add them to IndexedDB records merely to preserve navigation state.

## Result calculation orchestration

Result calculation is coordinated from one workbench-scoped service rather than from individual result components. Annual, monthly, group, facility, header-fact, and future results views consume the same result state.

The data flow is:

```text
workspace snapshot
  -> canonical account calendarization
  -> facility-analysis status evaluation
  -> autosave reaches idle/saved
  -> select analysis + transitive banking dependencies
  -> project only meters used by those analyses
  -> fingerprint calculation-bearing inputs
  -> one facility-results Worker
  -> publish one ready/error state
  -> all result views project from that state
```

The coordinator starts a Worker only when all of these invariants hold:

- the workspace snapshot is ready;
- autosave is `idle` or `saved`;
- status evaluation is ready and has no blocking finding;
- the canonical calendarization base matches its current input fingerprint; and
- the requested facility projection is ready.

While an invariant is unresolved, the service publishes `waiting` with a reason instead of starting calculation work. Result components render `idle`, `waiting`, `loading`, `ready`, and `error` explicitly.

The request fingerprint includes the selected analysis’s calculation fields, its transitive banking dependencies, facility fiscal and unit settings, projected calendarized meters, predictors, predictor readings, and calculation options. Display metadata such as the analysis name and modified date is intentionally excluded. Therefore a rename reuses the current result, while a baseline, group, model, meter, predictor, unit, fiscal, or banking change replaces it.

RxJS `switchMap` is the cancellation boundary. When the fingerprint changes, teardown terminates the stale Worker before starting its replacement. The cache retains only the latest ready result for an analysis. Do not call the result Worker from a component, tab, or effect.

### Adding a calculation input

When a new field can change a result:

1. Add it to the typed Worker request if the calculation needs it.
2. Add its stable calculation representation to `facilityAnalysisResultsFingerprint`.
3. Update the pure calculation entry point and all synchronous consumers.
4. Add a unit test proving the fingerprint changes for the field and remains stable for unrelated display metadata.
5. Add or update a browser Worker lifecycle test when message or cancellation behavior changes.

Missing a fingerprint input can publish stale results. Including volatile display metadata can spam Workers. Treat both as correctness defects.

## Regression orchestration

Regression uses two distinct Worker operations:

1. Model generation calendarizes the group inputs and returns candidate models. `FacilityAnalysisRegressionFacade` cancels a superseded generation with `AbortController`. Candidates go into `RegressionCandidateStore`; selecting one applies a deliberate draft transition and autosaves the analysis.
2. Model validation sends the candidate, optional selected-model comparison, raw inputs, and analysis context through one validation Worker. The Worker calendarizes once and calculates both monthly series from the same snapshot. A new edit or inspected model unsubscribes and terminates the old Worker.

User-defined model construction is a shared pure function used by the synchronous service and validation calculation. Generated-to-user-defined conversion, model invalidation, and selection are centralized in `regression-draft.ts`; pages must not clear model fields ad hoc.

Regression validation states are `idle`, `invalid`, `loading`, `ready`, and `error`. Invalid user input is rejected before Worker creation. Worker responses use typed success/error unions, and thrown or browser Worker errors are mapped to the page error state.

## Worker contract rules

Worker request and response interfaces live beside Workers under [`src/app/platform/web-workers`](../src/app/platform/web-workers). The Worker itself is a thin adapter over a deterministic calculation function. The same function is used by the synchronous fallback so browser and non-Worker execution cannot drift.

For every Worker path:

- send one structured-cloneable request and return one typed response;
- represent calculation failures in the response contract and transport failures through the observable or promise error path;
- terminate on success, failure, cancellation, route destruction, or replacement;
- never retain a global “current Worker” that lets one caller cancel another caller’s work; and
- test successful messaging, failure handling, and supersession or cancellation in a browser test.

Calendarization is already coordinated at workspace scope for facility results. Do not calendarize again inside a result component. Regression generation and validation accept raw inputs because their model-specific calculations have an independent lifecycle; validation combines candidate and comparison work so it calendarizes only once per request.

## Results presentation

Result pages are projections, not calculation owners. They read `FacilityAnalysisResultsService.state`, derive their rows, and pass those rows to tables or charts. Shared result status and toolbar components live under `results/presentation`; page-specific tables remain explicit so columns and formulas are easy to inspect.

Future results pages should be added below the existing group or facility result shells. They should consume the coordinator’s current result or add a clearly named projection to it. Add a new Worker only when the calculation has a genuinely different input and lifecycle boundary—not merely because a new tab needs another presentation.

## Confirmation and navigation rules

Destructive setup and model changes use `TemplatePortal`, `ModalPortalService`, and `ConfirmationDialogComponent`. Feature components own the pending action and explanatory copy; the shell owns stacking, focus trapping, Escape handling, and backdrop behavior.

The workbench footer uses autosave and stage-local status to decide whether Back, Continue, or Finish is available. Route guards are a final safety boundary, not the primary save mechanism. Group tabs are derived from the selected analysis method: Regression appears only for regression groups, and result tabs are hidden for skipped groups.

## Testing and debugging map

Use the smallest layer that owns the behavior:

| Concern | Primary check |
| --- | --- |
| Draft transition, dependency closure, fingerprint, row projection | Fast unit test for the pure function |
| Facade state or component interaction | Focused Angular TestBed test |
| IndexedDB command or atomic deletion | Chromium browser test |
| Worker payload, response, termination, or supersession | Chromium browser test with a fake or real Worker boundary |
| Formula or result value | Deterministic calculation test plus every affected consumer |
| Web/Electron packaging | Validation planner, then the selected build tier |

When results do not update, inspect the coordinator state in this order: autosave, status, calendarization fingerprint, result fingerprint, then Worker response. When too many Workers start, compare the old and new result fingerprints and identify the volatile input that was included. When a regression chart is stale, check validation request cancellation and the analysis/group GUID used by the candidate store before changing calculation code.

## Change checklist

Before completing facility-analysis work:

- preserve GUID relationships and older stored records;
- keep components focused on presentation and local interaction;
- route draft changes through autosave and centralized transition helpers;
- update request, response, fallback, caller, and browser tests together for Worker changes;
- reuse the canonical calendarization projection for result work;
- verify loading, waiting, empty, error, blocked, and ready states;
- keep result tables and formulas readable rather than over-generalizing them; and
- update this document when an ownership boundary, data flow, or invariant changes.
