import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { IndexedDbTransactionContext } from '@data/indexedDB/indexed-db-transaction.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { DataValidationSettingsCommandHandler } from './data-validation-settings-command-handler.service';

describe('atomic single-facility data quality settings in Chromium', () => {
  let harness: IndexedDbTestHarness;
  const account = { ...getNewIdbAccount(), id: 1, guid: 'account-a', isSingleFacilityCompany: true };
  const facility = { ...getNewIdbFacility(account), id: 2, guid: 'facility-a' };
  const change = { group: 'expectedRange' as const, settings: { enabled: false, useAccountSettings: false } };

  beforeEach(async () => {
    harness = await IndexedDbTestHarness.create('data-validation-settings');
    await harness.seed({ accounts: [account], facilities: [facility] });
  });
  afterEach(async () => { vi.restoreAllMocks(); await harness.destroy(); });

  it('commits both records, retains other settings and GUIDs, and survives reopening', async () => {
    const result = await TestBed.inject(DataValidationSettingsCommandHandler).updateSingleFacility(account, facility, change, account.guid);
    expect(result.account.expectedRangeSettings).toEqual({ enabled: false });
    expect(result.facility.expectedRangeSettings).toEqual(change.settings);
    await harness.reopen();
    expect(await harness.getAll('accounts')).toEqual([{ ...account, modifiedDate: result.account.modifiedDate, expectedRangeSettings: { enabled: false } }]);
    expect(await harness.getAll('facilities')).toEqual([{ ...facility, modifiedDate: result.facility.modifiedDate, expectedRangeSettings: change.settings }]);
    expect(result.account.modifiedDate).toEqual(result.facility.modifiedDate);
  });

  it('rolls back the account when the facility write fails and permits retry', async () => {
    const originalPut = IndexedDbTransactionContext.prototype.put;
    const spy = vi.spyOn(IndexedDbTransactionContext.prototype, 'put').mockImplementation(function (store, value) {
      if (store === 'facilities') return Promise.reject(new Error('Injected write failure'));
      return originalPut.call(this, store, value);
    });
    const handler = TestBed.inject(DataValidationSettingsCommandHandler);
    await expect(handler.updateSingleFacility(account, facility, change, account.guid)).rejects.toThrow('Injected write failure');
    await harness.reopen();
    expect(await harness.getAll('accounts')).toEqual([account]);
    expect(await harness.getAll('facilities')).toEqual([facility]);
    spy.mockRestore();
    await TestBed.inject(DataValidationSettingsCommandHandler).updateSingleFacility(account, facility, change, account.guid);
    expect((await harness.getAll<any>('accounts'))[0].expectedRangeSettings).toEqual({ enabled: false });
  });

  it('rejects cross-account edits before writing', async () => {
    await expect(TestBed.inject(DataValidationSettingsCommandHandler).updateSingleFacility(account, facility, change, 'other-account'))
      .rejects.toMatchObject({ code: 'cross-account-entity' });
    expect(await harness.getAll('accounts')).toEqual([account]);
    expect(await harness.getAll('facilities')).toEqual([facility]);
  });
});
