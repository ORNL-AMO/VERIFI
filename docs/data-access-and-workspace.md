# Working with application data

This guide explains how feature code should read, select, edit, and persist data after the account-workspace migration. It is the practical companion to [Domain and persistence](../ARCHITECTURE.md#domain-and-persistence).

The central rule is:

> Read the active account through workspace signals. Persist through an IndexedDB repository or transaction. Publish one coherent workspace refresh only after the logical write commits.

## The data layers

| Layer | Owns | Does not own |
| --- | --- | --- |
| `ApplicationLifecycleService` | Startup, persistence readiness, the complete account catalog, usable accounts, application metadata | Active facility or feature selections |
| `AccountWorkspaceStore` | One atomic, readonly snapshot for the active account; validated selections; facility-derived collections; committed revision | IndexedDB writes or account switching |
| `AccountWorkspaceService` | Account loading and switching, selection by GUID, selection hints, hydration and committed refreshes | Business-form editing or object-store implementation |
| IndexedDB services | Queries and persistence for their object store | Active UI collections, selections, navigation, notifications, or local-storage hints |
| `IndexedDbTransactionService` | Atomic operations across one or more stores | Calls to ordinary repositories inside its transaction |

`DbChangesService` is a temporary compatibility facade for existing account and facility workflows. Do not use it as a general application-state service or add repository-style subjects to it. The typed write boundary planned in issue #2577 will replace this seam.

## Decide which API to use

| Need | Use |
| --- | --- |
| Render the active account or account-owned data | `AccountWorkspaceStore` signals |
| Render data for the selected facility | A facility-derived workspace signal |
| Find active data and receive an editable copy | `AccountWorkspaceQueryService`, or clone a workspace entity |
| Change an active selection | `AccountWorkspaceService` with a GUID |
| Switch accounts | `AccountWorkspaceService.selectAccount(accountGuid)` |
| List all accounts, including deletion-marked accounts | `ApplicationLifecycleService.accountCatalog` |
| List accounts available for normal navigation | `ApplicationLifecycleService.usableAccounts` |
| Persist one object-store record | The record's IndexedDB service |
| Commit one logical operation across stores | `IndexedDbTransactionService` |
| Query an inactive account for an infrastructure workflow | An indexed repository method scoped by account GUID |
| Refresh active state after a successful user change | `AccountWorkspaceService.reloadActiveWorkspace(true)` exactly once |
| Republish data during hydration or repair without signaling a user change | `reloadActiveWorkspace(false)` |

## Reading active data

Inject the workspace store and expose its signals directly or derive new signals with `computed`. Do not subscribe to a repository to maintain a second component-owned copy.

```ts
import { Component, computed, inject } from '@angular/core';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';

@Component({
  selector: 'app-meter-summary',
  standalone: false,
  templateUrl: './meter-summary.component.html'
})
export class MeterSummaryComponent {
  private readonly workspace = inject(AccountWorkspaceStore);

  readonly account = this.workspace.account;
  readonly facility = this.workspace.selectedFacility;
  readonly meters = this.workspace.facilityMeters;
  readonly hasMeters = computed(() => this.meters().length > 0);
  readonly canEdit = this.workspace.canWrite;
}
```

The workspace publishes the account and every account-scoped collection in one state update. A component will not see a new account paired with the previous account's meters or reports.

Available account-scoped signals include facilities, meters and meter data, meter groups, predictors and predictor data, facility and account analyses, reports, custom factors, energy-use groups, and energy-use equipment. Prefer the derived signals such as `facilityMeters`, `facilityPredictors`, and `selectedFacilityReports` when the screen is scoped to the selected facility.

### Account catalog versus active account

The account catalog intentionally includes deletion-marked records because deletion and recovery workflows may need them. Normal navigation uses the filtered catalog.

```ts
private readonly lifecycle = inject(ApplicationLifecycleService);

readonly allAccounts = this.lifecycle.accountCatalog;
readonly selectableAccounts = this.lifecycle.usableAccounts;
```

Refresh the catalog after an account add, update, or delete:

```ts
await this.lifecycle.refreshAccountCatalog();
```

Refreshing the catalog does not replace the active workspace. If the active account was also changed, refresh both at the appropriate orchestration boundary.

## Treat workspace entities as readonly

Workspace arrays and entities are exposed as readonly. The boundary is enforced by types and immutable publication, not by production deep-freezing. Never mutate an entity obtained from a workspace signal.

Incorrect:

```ts
const meter = this.workspace.selectedMeter();
meter.name = this.form.controls.name.value;
```

Create an editable copy instead. Use `structuredClone` when the record contains nested arrays or objects.

```ts
const selected = this.workspace.selectedMeter();
if (!selected) {
  return;
}

const draft = structuredClone(selected);
draft.name = this.form.controls.name.value;
if (draft.charges?.length) {
  draft.charges[0].name = 'Updated charge';
}
```

`AccountWorkspaceQueryService` provides common lookups and copy-producing helpers. Check the helper's contract: some return a shallow copied entity, while methods named `getAccount...Copy` use `structuredClone`. Explicitly deep-clone when editing nested state.

```ts
const meter = this.workspaceQuery.getMeterByGuid(meterGuid);
const meterData = this.workspaceQuery.getMeterData(meterGuid);
```

Do not add a query helper that stores another collection. It should derive its result from `AccountWorkspaceStore` each time.

## Changing selections

Selections are changed by GUID through `AccountWorkspaceService`. This validates that the entity belongs to the active account and, for facility-owned entities, to the selected facility.

```ts
private readonly workspaceService = inject(AccountWorkspaceService);

openFacility(facilityGuid: string): void {
  this.workspaceService.selectFacility(facilityGuid);
}

openMeter(meterGuid: string): void {
  this.workspaceService.selectMeter(meterGuid);
}

clearMeter(): void {
  this.workspaceService.selectMeter(undefined);
}
```

Changing facilities clears facility-owned selections such as meter, predictor, facility analysis, facility report, and energy-use selection. Account analysis and account report selections remain when still valid.

Do not write selection hints to local storage from a component or repository. The workspace service persists valid hints only after selection validation.

### Switching accounts

```ts
const result = await this.workspaceService.selectAccount(accountGuid);
if (result === 'superseded') {
  return; // A newer account request won the race.
}
```

Account switching is latest-request-wins. A stale request must not navigate, persist a hint, or assume that its account became active. During switching, the previous ready snapshot remains available for rendering, but `workspace.canWrite()` is false and account-dependent actions should be disabled.

## Persisting a single-record change

The safe order is:

1. Read or copy the current entity.
2. Build the updated record without mutating workspace state.
3. Await the repository write.
4. After it succeeds, request one committed workspace refresh.

```ts
import { firstValueFrom } from 'rxjs';

async renameMeter(meterGuid: string, name: string): Promise<void> {
  const current = this.workspaceQuery.getMeterByGuid(meterGuid);
  if (!current) {
    throw new Error('The meter is not part of the active workspace.');
  }

  const updated = {
    ...current,
    name
  };

  await firstValueFrom(this.meterRepository.updateWithObservable(updated));
  await this.workspaceService.reloadActiveWorkspace(true);
}
```

If persistence fails, do not publish the draft or increment the committed revision. Report the failure and leave the current coherent snapshot in place.

For an add, use the model's factory so required GUID relationships and defaults are created consistently:

```ts
async addMeter(): Promise<void> {
  const account = this.workspace.account();
  const facility = this.workspace.selectedFacility();
  if (!account || !facility) {
    throw new Error('An account and facility are required.');
  }

  const meter = getNewIdbUtilityMeter(
    facility.guid,
    account.guid,
    true,
    facility.energyUnit
  );

  await firstValueFrom(this.meterRepository.addWithObservable(meter));
  await this.workspaceService.reloadActiveWorkspace(true);
}
```

Cross-record relationships use GUIDs: `accountId` contains the account GUID, `facilityId` contains the facility GUID, and `meterId` contains the meter GUID. The numeric `id` is the local IndexedDB primary key and must not be substituted for these relationships.

## Multi-record and bulk changes

Publish once after the complete logical operation, not after every row or store.

```ts
async updateReadings(readings: readonly IdbUtilityMeterData[]): Promise<void> {
  for (const reading of readings) {
    await firstValueFrom(
      this.meterDataRepository.updateWithObservable(structuredClone(reading))
    );
  }

  await this.workspaceService.reloadActiveWorkspace(true);
}
```

The example is suitable only when independent per-record commits are acceptable. If the operation must be all-or-nothing, use a native transaction.

```ts
await this.transactions.runTransaction(
  ['utilityMeter', 'utilityMeterData'],
  'readwrite',
  async transaction => {
    await transaction.put('utilityMeter', updatedMeter);
    for (const reading of updatedReadings) {
      await transaction.put('utilityMeterData', reading);
    }
  }
);

await this.workspaceService.reloadActiveWorkspace(true);
```

Every participating store must be declared in `runTransaction`. Inside its callback, use only the supplied transaction context. Calling `meterRepository.updateWithObservable(...)` there would open a separate IndexedDB transaction and break atomicity.

Account and facility cascade deletes already use `IndexedDbCascadeDeleteService`; extend those infrastructure-owned transactions rather than rebuilding cascades in a component.

## Committed refreshes and backups

`reloadActiveWorkspace(true)` means that a logical persistence operation committed. It atomically reloads all active-account collections, preserves only still-valid selections, increments the revision once, and publishes `committedRevision`.

Automatic backups observe committed revisions. Therefore:

- Call one committed refresh after a successful logical change.
- Do not call a committed refresh after a failed or rolled-back operation.
- Do not call a committed refresh for selection-only changes.
- Do not call it once per collection in a multi-collection workflow.

`reloadActiveWorkspace(false)` is for hydration or repair that must not represent a new user change, such as startup selection repair. It replaces the snapshot without incrementing the revision or scheduling a backup. New user-initiated write paths should normally use `true`.

## Querying repositories directly

Repository reads are appropriate when the data is not the active UI workspace or when infrastructure needs a targeted IndexedDB query. Prefer indexed, relationship-specific methods:

```ts
const meters = await this.meterRepository.getAllAccountMeters(accountGuid);
const facilityMeters = await this.meterRepository.getStoredFacilityMeters(facilityGuid);
const meter = await this.meterRepository.getStoredByGuid(meterGuid);
```

Avoid `getAll()` followed by in-memory filtering when an account, facility, GUID, meter, predictor, group, or energy-use index can answer the query. Never publish an inactive account's query result into the active workspace.

Object-store repositories must remain persistence-only. Do not add:

- `BehaviorSubject` or writable signal collections;
- selected-entity state;
- constructor initialization that queries data;
- navigation, modal, loading, toast, backup, or local-storage behavior;
- dependencies on another repository's selected entity.

Put reusable write orchestration in a focused feature service while the #2577 typed write boundary is being developed.

## Loading, errors, and write availability

Use `workspace.canWrite()` to disable active-account edits while the workspace is loading, switching, idle, or in an unrecoverable error state. Account-management operations that do not require an active workspace should instead depend on lifecycle persistence readiness.

Always await persistence and refresh operations. Use `try/finally` for feature loading state so failures cannot leave the interface permanently disabled.

```ts
async save(): Promise<void> {
  this.loadingService.setLoadingStatus(true);
  try {
    await this.persistChanges();
    await this.workspaceService.reloadActiveWorkspace(true);
  } catch (error) {
    this.notifications.showToast(
      'Save failed',
      'Your changes were not published. Please try again.',
      10000,
      false,
      'alert-danger'
    );
    throw error;
  } finally {
    this.loadingService.setLoadingStatus(false);
  }
}
```

If account switching fails, `AccountWorkspaceService` restores the previous ready snapshot and exposes a recoverable workspace error. Callers should not clear or reconstruct the workspace themselves.

## Common mistakes

Avoid these old or unsafe patterns:

```ts
// Do not read active UI data from a repository subject.
this.meterRepository.allMeters.getValue();

// Do not mutate an entity from a readonly signal.
this.workspace.selectedFacility().name = 'Changed';

// Do not maintain another facility-scoped copy via repository queries.
this.meters = await this.meterRepository.getStoredFacilityMeters(facilityGuid);

// Do not publish several revisions for one logical operation.
await this.workspaceService.reloadActiveWorkspace(true);
await this.workspaceService.reloadActiveWorkspace(true);

// Do not use a numeric local ID for a domain relationship.
newMeter.facilityId = facility.id;
```

Also avoid injecting a repository when the component only reads workspace data. This creates misleading dependencies and makes persistence-only services look like state owners.

## Testing data workflows

Use the lowest-cost test that protects the changed contract:

- Fast store tests for atomic publication, derived collections, readonly-copy behavior, and selection validation.
- Fast service tests for latest-request-wins switching, failed-switch recovery, preservation of valid selections, and one committed revision.
- Fast repository tests for mapping, defaults, and persistence calls that do not require a browser.
- Chromium `*.browser.spec.ts` tests for real IndexedDB indexes, transactions, migrations, reopening, cascade deletion, and account isolation.
- Backup tests for hydration suppression, one committed change, debounced bursts, failed operations, and switching accounts.

A write-workflow test should normally verify the ordering explicitly:

```ts
expect(repository.updateWithObservable).toHaveBeenCalledWith(expectedRecord);
expect(workspaceService.reloadActiveWorkspace).toHaveBeenCalledOnce();
expect(workspaceService.reloadActiveWorkspace).toHaveBeenCalledWith(true);
```

Also cover the failure path: a rejected repository write must not call the workspace refresh.

## Review checklist

Before submitting a data-related change, confirm:

- Active UI reads come from workspace or lifecycle signals.
- Editable records are copied before modification.
- GUID ownership is preserved across account, facility, and child records.
- Persistence completes before workspace publication.
- One logical commit produces one committed refresh.
- Hydration and selection changes do not produce committed revisions.
- Multi-store atomic work uses only the transaction context.
- Repositories remain persistence-only.
- Account catalog and active workspace refreshes are both handled when required.
- Tests cover failure behavior and the appropriate browser persistence boundary.
- Persisted-shape changes consider migrations, imports, exports, and older backups.
