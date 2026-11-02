import { TestBed } from '@angular/core/testing';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { facilitySettingsChange } from '../facility-settings.models';
import { SingleFacilitySettingsCommandHandler } from './single-facility-settings-command-handler.service';

describe('single-facility settings command validation', () => {
  const account = { ...getNewIdbAccount(), id: 1, guid: 'account-a', isSingleFacilityCompany: true };
  const facility = { ...getNewIdbFacility(account), id: 2, guid: 'facility-a' };
  const change = facilitySettingsChange('financial', facility);
  let transactions: { runTransaction: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    transactions = { runTransaction: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: IndexedDbTransactionService, useValue: transactions }] });
  });

  it.each([
    { account, facility, active: 'other-account' },
    { account: { ...account, guid: 'other-account' }, facility, active: account.guid },
    { account, facility: { ...facility, accountId: 'other-account' }, active: account.guid }
  ])('rejects cross-account identities before opening a transaction', async refs => {
    await expect(TestBed.inject(SingleFacilitySettingsCommandHandler).update(refs.account, refs.facility, change, refs.active))
      .rejects.toMatchObject({ code: 'cross-account-entity' });
    expect(transactions.runTransaction).not.toHaveBeenCalled();
  });

  it.each([
    { account: { ...account, id: undefined }, facility },
    { account, facility: { ...facility, id: undefined } }
  ])('requires both persisted identities before opening a transaction', async refs => {
    await expect(TestBed.inject(SingleFacilitySettingsCommandHandler).update(refs.account, refs.facility, change, account.guid))
      .rejects.toMatchObject({ code: 'validation-failed' });
    expect(transactions.runTransaction).not.toHaveBeenCalled();
  });
});
