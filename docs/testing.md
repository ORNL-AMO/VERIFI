# VERIFI testing guide

This guide defines what VERIFI tests should protect, which test environment to use, and what evidence a pull request must provide. The objective is confidence in behavior, not a large test count or an arbitrary coverage percentage.

Executable configuration in [`package.json`](../package.json), [`angular.json`](../angular.json), and [the CI workflow](../.github/workflows/main.yml) is authoritative when commands or targets change.

## Pull-request policy

Every behavior-changing pull request must record a testing decision:

- Add or update the lowest-cost automated test that would catch a plausible regression.
- If useful automation is disproportionate or the required runtime harness does not exist, explain why and provide focused manual evidence.
- Bug fixes require a regression test whenever the failure can be reproduced at an existing test tier. An exception requires a linked follow-up issue.
- Refactors must run the affected suite. Add characterization coverage when important existing behavior is otherwise unprotected, not for every mechanical edit.
- Documentation, comments, styling-only work, and other non-behavioral changes do not need artificial unit tests. Use an appropriate build, visual check, or link/command validation instead.

A concise pull-request entry can use this shape:

```text
Testing decision
- Risk or behavior protected:
- Automated coverage:
- Manual evidence or reason automation was not added:
```

A creation-only assertion such as `should create` is not behavioral coverage. Remove it or replace it with an assertion that would fail when user-visible behavior or a public contract regresses.

## Test layers

| Layer | File convention | Purpose | Typical subjects |
| --- | --- | --- | --- |
| Fast unit and component | `*.spec.ts` | Deterministic feedback in Vitest with jsdom | Pure calculations, transformations, services, pipes, guards, forms, component rendering and interaction supported by jsdom |
| Browser integration | `*.browser.spec.ts` | Exercise native browser behavior in Playwright/Chromium | IndexedDB, real Web Workers, File APIs, structured cloning, and other APIs that jsdom cannot represent faithfully |
| End to end | Not configured yet | Exercise a complete workflow through navigation, rendering, persistence, and integration boundaries | A small number of critical user journeys; add only after a separate pilot establishes the runner and data strategy |
| Electron boundary | Ordinary specs plus focused desktop checks | Protect renderer wrappers, preload/main contracts, and browser fallbacks | IPC channel allowlists, payloads, errors, cancellation, listener cleanup, dialogs, filesystem, shell, and updater behavior |
| Manual QA | Recorded scenario | Verify behavior that is expensive or unreliable to reduce to lower-level assertions | Visual layout, responsive behavior, charts, printing, accessibility, installers, operating-system dialogs, updates, and exploratory workflows |

Manual QA complements automated coverage. It must not be used to repeatedly recheck deterministic calculation or transformation behavior that belongs in a fast test.

## What a change requires

| Change | Expected evidence |
| --- | --- |
| Calculation, conversion, or transformation | Fast, table-driven coverage of representative normal and boundary inputs. Cover units, dates, zero, missing or invalid data, rounding, and aggregation when those cases are part of the contract. |
| Confirmed defect | A regression test that fails for the reported behavior before the fix and passes after it, at the lowest adequate tier. |
| Angular component | Test inputs through rendered output, user interaction, emitted events, navigation, or meaningful collaborator effects. Do not test private fields or Angular's ability to construct the class. |
| Form, pipe, guard, or service | Fast tests for public results, validation transitions, navigation decisions, or state changes. Use Angular utilities only when dependency injection or framework behavior matters. |
| HTTP or remote service | Use a controlled fake or Angular HTTP testing facilities. Never call a real endpoint. Cover success, empty, invalid, and error responses that change application behavior. |
| Import, export, or backup | Keep parsing and mapping tests fast where possible. Use representative fixtures for valid, malformed, missing, duplicate, compatibility, and round-trip cases. Add browser coverage when File APIs or IndexedDB are part of the behavior. |
| IndexedDB service or migration | Fast tests for pure defaults and transformations, plus Chromium coverage for real storage behavior. Test empty and representative older data, idempotency, indexes, GUID relationships, and cleanup. |
| Web Worker calculation or message contract | Fast coverage for the calculation and lifecycle wrapper. Add Chromium coverage for native Worker construction, request/result/error payloads, structured cloning, cancellation, and termination. |
| Electron-only behavior | Fast tests for explicit wrappers and handler decisions, both production builds when runtime code changes, and a focused desktop check for the affected OS integration. Preserve behavior when `window.electronAPI` is absent. |
| Behavior-preserving refactor | Run the affected suite. Add characterization coverage only for a high-risk contract that lacks useful protection. Avoid tests coupled to the old implementation. |
| Documentation, comment, or styling-only change | No unit test by default. Validate links and commands, build affected assets, or perform a focused visual/accessibility check as appropriate. |

## Designing valuable tests

### Assert behavior and contracts

- Name the condition and expected outcome: `rejects an incomplete fiscal year`, not `works correctly`.
- Prefer exact domain results, state transitions, rendered messages, emitted values, persisted shapes, and cleanup effects.
- Do not assert private methods, private fields, internal helper ordering, or every collaborator call unless the call itself is an external contract.
- A valuable test should fail for a plausible regression and make the broken contract clear from its name and failure output.

### Direct construction or TestBed

Instantiate a class directly when the subject is ordinary TypeScript and Angular is not part of the behavior. This keeps setup small and dependencies explicit.

Use Angular `TestBed` when the test needs dependency injection, a template, DOM bindings, lifecycle behavior, forms, providers, signals created with `inject()`, routing, or another Angular facility. Test components through the rendered DOM and user actions when those are the public surface.

The executable service example in [`data-management.service.spec.ts`](../src/app/data-management/data-management.service.spec.ts) uses direct construction with a mocked storage boundary. The component example in [`shared-router-guard-modal.component.spec.ts`](../src/app/shared/shared-router-guard-modal/shared-router-guard-modal.component.spec.ts) uses TestBed because template bindings, signals, and clicks are part of the behavior.

### Mocks and real collaborators

- Mock network, filesystem, clock, randomness, Electron, and other slow or nondeterministic boundaries.
- Prefer real, cheap collaborators when they make the test more representative without introducing shared state or unrelated complexity.
- Mock only the members the subject uses and give the fake realistic return values and errors.
- Avoid replacing a large Angular module or domain graph just to make a small assertion pass. Move deterministic decisions into a pure function or service when that is a natural production design improvement, but do not refactor unrelated code solely to satisfy a test.

### Fixtures and cases

- Build the smallest record that expresses the behavior. Prefer typed factory functions with meaningful defaults over repeated casts or a full production backup.
- Keep a factory beside its spec until at least three spec files need the same contract. Promote it to a shared testing location only then.
- A canonical older backup, workbook, or database shape may be shared earlier when its exact external format is the contract.
- Use table-driven tests when the same behavior must hold across units, dates, validation states, or boundary values.
- Do not generate large randomized datasets unless the seed is fixed and the failure reports the input.

Representative executable patterns already exist for a [pure calculation](../src/app/calculations/shared-calculations/calculationsHelpers.spec.ts), a [mocked persistence service](../src/app/indexedDB/analysis-db.service.spec.ts), [real IndexedDB](../src/app/indexedDB/indexed-db.browser.spec.ts), a [mocked Worker lifecycle](../src/app/web-workers/run-worker.spec.ts), and a [native Worker exchange](../src/app/web-workers/run-worker.browser.spec.ts).

## Asynchronous behavior and isolation

- Prefer native `async`/`await`, promises, and `firstValueFrom` over callback completion or arbitrary sleeps.
- Use Vitest fake timers and `vi.setSystemTime` for timer- or current-date-dependent behavior. Restore real timers after each test.
- Never depend on test order, a real network, a developer's locale or current time, or database state from another spec.
- Give each IndexedDB test a unique database name and delete it during teardown.
- Terminate Workers, unsubscribe from long-lived observables, remove listeners, restore mocks, and reset state created outside the subject.
- Keep failure paths finite: rejected promises, Worker errors, and observable errors must be asserted rather than left unhandled.

## Commands and CI

| Command | Use |
| --- | --- |
| `npm test` | Fast suite in local watch mode |
| `npm run test:ci` | Fast suite once |
| `npm run test:browser` | Browser suite in Chromium |
| `npm run test:browser:ci` | Browser suite once in headless Chromium |
| `npm run test:all:ci` | Required fast and browser gate |
| `npm run test:coverage` | Informational scoped coverage in headless Chromium |

Install Chromium once with `npx playwright install chromium` when it is not available locally.

GitHub Actions runs `npm run test:all:ci` for pull requests targeting `master` or `develop`, pushes to those branches, and manual dispatch. The same test job gates downstream release workflows.

Keep the fast suite below 60 seconds and the browser suite below 120 seconds in CI, excluding dependency and browser installation. These are maintainability targets rather than failure thresholds. Profile slow setup, remove unnecessary TestBed/module work, or split browser scenarios before accepting persistently slow feedback.

## Coverage policy

`npm run test:coverage` runs both ordinary and browser specs in headless Chromium and produces text and HTML coverage for production TypeScript under:

- `src/app/calculations/`
- `src/app/indexedDB/`
- `src/app/web-workers/`

The native Worker smoke spec remains in the required browser suite but is excluded from the coverage target because coverage instrumentation cannot currently serve its Worker fixture reliably. Worker lifecycle logic is still included in the coverage report, and `npm run test:browser:ci` remains the source of truth for the native Worker boundary.

The report is informational. It has no percentage threshold, is not part of required CI, and must not be used as a proxy for correctness. Its purpose is to expose unprotected risk and support prioritization.

Do not introduce a global threshold. After a risk area has representative tests, a separate issue may establish module-level thresholds at its measured baseline and ratchet them deliberately. A percentage increase does not excuse weak assertions, missing boundary cases, or an incorrect test tier.

## Ownership and flaky tests

- The author owns tests for changed behavior and keeps them aligned when the behavior intentionally changes.
- Reviewers check whether the selected tier protects the actual risk and whether the test would catch the regression it claims to cover.
- Test infrastructure changes need the same review and deterministic evidence as production changes.
- Do not add automatic retries to hide nondeterminism. One rerun may help classify a failure, but a pass on rerun does not make the failure irrelevant.
- Fix a newly introduced flaky test before merge. A pre-existing flaky test may be quarantined only with a linked issue, named owner, and explicit condition for restoring it; the skip must remain visible in test output.
