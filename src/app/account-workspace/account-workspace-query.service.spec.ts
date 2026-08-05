import { AccountWorkspaceQueryService } from './account-workspace-query.service';
import { AccountWorkspaceSnapshot } from './account-workspace.models';
import { AccountWorkspaceStore } from './account-workspace.store';

describe('AccountWorkspaceQueryService', () => {
  it('returns editable copies without changing workspace entities or export order', () => {
    const store = new AccountWorkspaceStore();
    store.publish(createSnapshot());
    const query = new AccountWorkspaceQueryService(store);

    const meters = query.getMetersForExport();
    meters[0].name = 'Changed copy';

    expect(meters.map(meter => meter.guid)).toEqual(['meter-a', 'meter-b']);
    expect(meters[0].meterNumber).toBe('Electricity_meter-a');
    expect(store.meters()[0].name).toBe('Meter A');
    expect(store.meters()[0].meterNumber).toBeUndefined();
  });

  it('filters meter and predictor records by facility and parent GUID', () => {
    const store = new AccountWorkspaceStore();
    store.publish(createSnapshot());
    const query = new AccountWorkspaceQueryService(store);

    expect(query.getFacilityMeters('facility-a').map(item => item.guid)).toEqual(['meter-a']);
    expect(query.getMeterData('meter-a').map(item => item.guid)).toEqual(['data-a']);
    expect(query.getFacilityPredictors('facility-b').map(item => item.guid)).toEqual(['predictor-b']);
    expect(query.getPredictorData('predictor-b').map(item => item.guid)).toEqual(['predictor-data-b']);
  });
});

function createSnapshot(): AccountWorkspaceSnapshot {
  return {
    account: { id: 1, guid: 'account-a' } as any,
    facilities: [
      { id: 1, guid: 'facility-a', accountId: 'account-a' },
      { id: 2, guid: 'facility-b', accountId: 'account-a' }
    ] as any,
    meters: [
      { guid: 'meter-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Meter A', source: 'Electricity' },
      { guid: 'meter-b', accountId: 'account-a', facilityId: 'facility-b', name: 'Meter B', source: 'Natural Gas', meterNumber: 'B-1' }
    ] as any,
    meterData: [{ guid: 'data-a', accountId: 'account-a', facilityId: 'facility-a', meterId: 'meter-a', year: 2024 }] as any,
    meterGroups: [],
    predictors: [
      { guid: 'predictor-a', accountId: 'account-a', facilityId: 'facility-a' },
      { guid: 'predictor-b', accountId: 'account-a', facilityId: 'facility-b' }
    ] as any,
    predictorData: [{ guid: 'predictor-data-b', accountId: 'account-a', facilityId: 'facility-b', predictorId: 'predictor-b' }] as any,
    facilityAnalyses: [], accountAnalyses: [], accountReports: [], facilityReports: [],
    customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: []
  };
}
