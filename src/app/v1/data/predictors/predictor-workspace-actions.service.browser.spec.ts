import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from 'ngx-webstorage';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { getNewIdbPredictor } from '@data/models/idbModels/predictor';
import { getNewIdbPredictorData } from '@data/models/idbModels/predictorData';
import { EditorConflictError } from '@app/v1/data/editing/draft-reconciliation';
import { account, facility } from '@app/v1/data/meters/facility-meters.testing';
import { PredictorWorkspaceActionsService } from './predictor-workspace-actions.service';

describe('queued Standard predictor readings with native IndexedDB', () => {
  let harness: IndexedDbTestHarness;
  const timestamp = new Date('2026-01-01T00:00:00Z');
  const predictor = { ...getNewIdbPredictor('account-a', 'facility-a'), id: 3, guid: 'predictor-a',
    name: 'Production', unit: 'tons', canBeNegative: false, createdDate: timestamp, modifiedDate: timestamp };
  const original = { ...getNewIdbPredictorData(predictor), id: 4, guid: 'reading-a', year: 2026, month: 1,
    amount: 10, notes: 'Original note', checked: true, createdDate: timestamp, modifiedDate: timestamp };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [PredictorWorkspaceActionsService,
      { provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } }
    ] });
    harness = await IndexedDbTestHarness.create('predictor-reading-queue');
    await harness.seed({ accounts: [{ ...account(), id: 1 }], facilities: [{ ...facility(), id: 2 }],
      predictor: [{ ...predictor }], predictorData: [{ ...original }] });
    const workspace = TestBed.inject(AccountWorkspaceService);
    await workspace.selectAccount('account-a');
    workspace.selectFacility('facility-a');
  });

  afterEach(async () => { await harness.destroy(); });

  it('rejects competing month edits without persisting a synthesized month after reopening', async () => {
    const boundary = TestBed.inject(WorkspaceCommandBoundary);
    const transactions = TestBed.inject(IndexedDbTransactionService);
    const actions = TestBed.inject(PredictorWorkspaceActionsService);
    const earlierSaved = { ...original, month: 2, modifiedDate: new Date('2026-02-01T00:00:00Z') };
    let release!: () => void;
    let started!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const firstStarted = new Promise<void>(resolve => { started = resolve; });
    const previous = boundary.execute({ entityKind: 'predictorData', changeKind: 'update', entityGuid: original.guid,
      label: 'Moving saved predictor month', publication: { mode: 'reload' }
    }, async () => {
      started(); await gate;
      await transactions.runTransaction(['predictorData'], 'readwrite', transaction => transaction.put('predictorData', earlierSaved));
    });
    // Submit before the queue starts: later submissions are blocked while persistence is active.
    const pending = actions.updatePredictorReading({ ...original, year: 2027 });
    const rejected = expect(pending).rejects.toMatchObject({ code: 'persistence-failed', cause: expect.any(EditorConflictError) });
    await firstStarted;
    release(); await previous; await rejected;

    await harness.reopen();
    expect(await harness.getAll('predictorData')).toEqual([earlierSaved]);
    expect(await harness.getAll('predictor')).toEqual([predictor]);
  });

  it('adopts the latest saved month for a notes edit even when another reading takes its old month', async () => {
    const boundary = TestBed.inject(WorkspaceCommandBoundary);
    const transactions = TestBed.inject(IndexedDbTransactionService);
    const actions = TestBed.inject(PredictorWorkspaceActionsService);
    const earlierSaved = { ...original, month: 2, amount: 42, weatherDataChanged: true };
    const replacement = { ...original, id: 5, guid: 'replacement-reading', amount: 99, notes: 'Replacement January record' };
    let release!: () => void;
    let started!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const firstStarted = new Promise<void>(resolve => { started = resolve; });
    const previous = boundary.execute({ entityKind: 'predictorData', changeKind: 'bulk',
      label: 'Moving and replacing saved predictor months', publication: { mode: 'reload' }
    }, async () => {
      started(); await gate;
      await transactions.runTransaction(['predictorData'], 'readwrite', async transaction => {
        await transaction.put('predictorData', earlierSaved);
        await transaction.add('predictorData', replacement);
      });
    });
    const pending = actions.updatePredictorReading({ ...original, notes: 'Local note' });
    await firstStarted;
    release(); await previous;
    await expect(pending).resolves.toMatchObject({ id: original.id, guid: original.guid, year: 2026, month: 2,
      amount: 42, notes: 'Local note', weatherDataChanged: true, checked: true });

    await harness.reopen();
    expect(await harness.getAll('predictorData')).toEqual([
      expect.objectContaining({ id: original.id, guid: original.guid, year: 2026, month: 2,
        amount: 42, notes: 'Local note', weatherDataChanged: true, checked: true }),
      replacement
    ]);
    expect(await harness.getAll('predictor')).toEqual([predictor]);
  });
});
