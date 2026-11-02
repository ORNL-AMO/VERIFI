import { TestBed } from '@angular/core/testing';
import { IndexedDbTransactionContext, IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { IndexedDbTestHarness, IndexedDbTestRecord } from '@data/indexedDB/testing/indexed-db-test-harness';
import { getNewIdbAccount, IdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility, IdbFacility } from '@data/models/idbModels/facility';
import { FacilitySettingsChange } from '../facility-settings.models';
import { SingleFacilitySettingsCommandHandler } from './single-facility-settings-command-handler.service';

describe('atomic single-facility settings in Chromium', () => {
  let harness: IndexedDbTestHarness;
  const account = { ...getNewIdbAccount(), id: 1, guid: 'account-a', isSingleFacilityCompany: true, size: 123,
    displayEmissions: true, assessmentReportVersion: 'AR5' as const, isBetterPlantsPartner: true };
  const facility = { ...getNewIdbFacility(account), id: 2, guid: 'facility-a', size: 100, classification: 'Manufacturing' as const };
  const profile = { name: 'Edited site', country: 'CA', city: 'Toronto', state: 'ON', zip: undefined,
    address: '2 Main Street', naics1: '31', naics2: '311', naics3: undefined, notes: '', color: '#123456',
    contactName: 'Site contact', contactEmail: 'site@example.test', contactPhone: '1234567890' };
  const units = { unitsOfMeasure: 'Custom', energyUnit: 'GJ', electricityUnit: 'MWh', massUnit: 'kg',
    volumeLiquidUnit: 'L', volumeGasUnit: 'm3', energyIsSource: false, eGridSubregion: 'US Average' };
  const sustainabilityQuestions = { ...facility.sustainabilityQuestions, energyReductionPercent: 40, waterReductionGoal: true, greenhouseReductionGoal: true };
  const financial = { fiscalYear: 'nonCalendarYear' as const, fiscalYearMonth: 6, fiscalYearCalendarEnd: false };
  const cases: { group: FacilitySettingsChange['group']; change: FacilitySettingsChange; accountValues: Partial<IdbAccount>; facilityValues: Partial<IdbFacility> }[] = [
    { group: 'profile', change: { group: 'profile', values: { ...profile, size: 45000, classification: 'Office' } },
      accountValues: profile, facilityValues: { ...profile, size: 45000, classification: 'Office' } },
    { group: 'units', change: { group: 'units', values: units }, accountValues: units, facilityValues: units },
    { group: 'goals', change: { group: 'goals', values: { sustainabilityQuestions, isNewFacility: true } },
      accountValues: { sustainabilityQuestions }, facilityValues: { sustainabilityQuestions, isNewFacility: true } },
    { group: 'financial', change: { group: 'financial', values: financial }, accountValues: financial, facilityValues: financial }
  ];

  beforeEach(async () => {
    harness = await IndexedDbTestHarness.create('single-facility-settings');
    await harness.seed({ accounts: [account], facilities: [facility] });
  });
  afterEach(async () => { vi.restoreAllMocks(); await harness.destroy(); });

  it.each(cases)('commits only $group values to both current records and survives reopening', async test => {
    const currentAccount = { ...account, lastBackup: new Date('2026-10-28T12:00:00Z'), selectedEnergyAnalysisId: 'hidden-pair', expectedRangeSettings: { enabled: false } };
    const currentFacility = { ...facility, selectedEnergyAnalysisId: 'facility-analysis', facilityOrder: 4,
      dataStalenessSettings: { enabled: false, thresholdMonths: 12 as const, useAccountSettings: false } };
    await TestBed.inject(IndexedDbTransactionService).runTransaction(['accounts', 'facilities'], 'readwrite', async transaction => {
      await transaction.put('accounts', currentAccount);
      await transaction.put('facilities', currentFacility);
    });

    const result = await TestBed.inject(SingleFacilitySettingsCommandHandler).update(account, facility, test.change, account.guid);
    expect(result.account).toEqual({ ...currentAccount, ...test.accountValues, modifiedDate: result.account.modifiedDate });
    expect(result.facility).toEqual({ ...currentFacility, ...test.facilityValues, modifiedDate: result.facility.modifiedDate });
    expect(result.account.modifiedDate).toBeInstanceOf(Date);
    expect(result.account.modifiedDate).toEqual(result.facility.modifiedDate);
    expect(account.name).toBe('New Account');
    expect(facility.name).toBe('New Facility');
    if (test.group === 'goals') expect(result.account.sustainabilityQuestions).not.toBe(result.facility.sustainabilityQuestions);

    await harness.reopen();
    expect(await harness.getAll('accounts')).toEqual([result.account]);
    expect(await harness.getAll('facilities')).toEqual([result.facility]);
  });

  for (const store of ['accounts', 'facilities'] as const) {
    it.each(cases)(`rolls back $group when ${store} fails, then permits retry after reopening`, async test => {
      const originalPut = IndexedDbTransactionContext.prototype.put;
      const spy = vi.spyOn(IndexedDbTransactionContext.prototype, 'put').mockImplementation(function (storeName, value) {
        if (storeName === store) return Promise.reject(new Error('Injected write failure'));
        return originalPut.call(this, storeName, value);
      });
      await expect(TestBed.inject(SingleFacilitySettingsCommandHandler).update(account, facility, test.change, account.guid))
        .rejects.toThrow('Injected write failure');
      await harness.reopen();
      expect(await harness.getAll('accounts')).toEqual([account]);
      expect(await harness.getAll('facilities')).toEqual([facility]);
      spy.mockRestore();

      const result = await TestBed.inject(SingleFacilitySettingsCommandHandler).update(account, facility, test.change, account.guid);
      await harness.reopen();
      expect(await harness.getAll('accounts')).toEqual([{ ...account, ...test.accountValues, modifiedDate: result.account.modifiedDate }]);
      expect(await harness.getAll('facilities')).toEqual([{ ...facility, ...test.facilityValues, modifiedDate: result.facility.modifiedDate }]);
    });
  }

  it.each([
    { label: 'replaced account', account: { ...account, guid: 'replacement' }, facility },
    { label: 'replaced facility', account, facility: { ...facility, guid: 'replacement' } },
    { label: 'changed facility owner', account, facility: { ...facility, accountId: 'other-account' } },
    { label: 'converted account', account: { ...account, isSingleFacilityCompany: false }, facility }
  ])('rejects a $label without changing either durable record', async current => {
    await TestBed.inject(IndexedDbTransactionService).runTransaction(['accounts', 'facilities'], 'readwrite', async transaction => {
      await transaction.put('accounts', current.account);
      await transaction.put('facilities', current.facility);
    });
    await expect(TestBed.inject(SingleFacilitySettingsCommandHandler).update(account, facility, cases[3].change, account.guid))
      .rejects.toMatchObject({ code: 'stale-workspace' });
    await harness.reopen();
    expect(await harness.getAll('accounts')).toEqual([current.account]);
    expect(await harness.getAll('facilities')).toEqual([current.facility]);
  });

  it.each(['accounts', 'facilities'] as const)('rejects a missing persisted %s record', async store => {
    await TestBed.inject(IndexedDbTransactionService).runTransaction([store], 'readwrite', transaction =>
      transaction.deleteByKey(store, store === 'accounts' ? account.id : facility.id));
    const beforeAccounts = await harness.getAll('accounts');
    const beforeFacilities = await harness.getAll('facilities');
    await expect(TestBed.inject(SingleFacilitySettingsCommandHandler).update(account, facility, cases[3].change, account.guid))
      .rejects.toMatchObject({ code: 'stale-workspace' });
    await harness.reopen();
    expect(await harness.getAll('accounts')).toEqual(beforeAccounts);
    expect(await harness.getAll('facilities')).toEqual(beforeFacilities);
  });

  it('retains the existing flag-based mirroring policy during multiple-facility repair', async () => {
    await harness.seed({ facilities: [{ ...facility, id: 3, guid: 'second-facility' }] });
    await TestBed.inject(SingleFacilitySettingsCommandHandler).update(account, facility, cases[3].change, account.guid);
    const saved = await harness.getAll<IdbFacility & IndexedDbTestRecord>('facilities');
    expect(saved.find(item => item.guid === 'facility-a')).toMatchObject(financial);
    expect(saved.find(item => item.guid === 'second-facility')).toEqual({ ...facility, id: 3, guid: 'second-facility' });
  });
});
