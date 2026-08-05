import { AccountWorkspaceSnapshot } from './account-workspace.models';
import { AccountWorkspaceStore } from './account-workspace.store';

describe('AccountWorkspaceStore', () => {
  it('publishes a complete snapshot atomically and derives facility collections', () => {
    const store = new AccountWorkspaceStore();
    const snapshot = createSnapshot();

    store.publish(snapshot, { facility: snapshot.facilities[0] });

    expect(store.status()).toBe('ready');
    expect(store.snapshot()).not.toBe(snapshot);
    expect(store.facilityMeters()).toEqual([snapshot.meters[0]]);
    expect(store.facilityMeterData()).toEqual([snapshot.meterData[0]]);
    expect(store.facilityPredictors()).toEqual([snapshot.predictors[0]]);
    expect(store.facilityEnergyUseEquipment()).toEqual([snapshot.energyUseEquipment[0]]);
  });

  it('keeps the previous selection unchanged when a foreign facility is rejected', () => {
    const store = new AccountWorkspaceStore();
    const snapshot = createSnapshot();
    store.publish(snapshot, { facility: snapshot.facilities[0] });

    expect(() => store.selectFacility({ guid: 'foreign-facility' } as any)).toThrow(
      'does not belong to the active account'
    );
    expect(store.selectedFacility()).toBe(snapshot.facilities[0]);
  });

  it('clears facility selections when the selected facility changes', () => {
    const store = new AccountWorkspaceStore();
    const snapshot = createSnapshot();
    store.publish(snapshot, {
      facility: snapshot.facilities[0],
      meter: snapshot.meters[0],
      predictor: snapshot.predictors[0]
    });

    store.selectFacility(snapshot.facilities[1]);

    expect(store.selectedFacility()).toBe(snapshot.facilities[1]);
    expect(store.selectedMeter()).toBeUndefined();
    expect(store.selectedPredictor()).toBeUndefined();
    expect(store.facilityMeters()).toEqual([snapshot.meters[1]]);
  });

  it('increments committed revisions without treating hydration as a change', () => {
    const store = new AccountWorkspaceStore();
    const snapshot = createSnapshot();
    store.publish(snapshot);

    expect(store.revision()).toBe(0);
    expect(store.committedRevision()).toBeUndefined();

    store.publishCommitted({ ...snapshot, account: { ...snapshot.account, name: 'Updated' } }, {});

    expect(store.revision()).toBe(1);
    expect(store.committedRevision()).toEqual({ accountGuid: 'account-a', revision: 1 });
  });
});

function createSnapshot(): AccountWorkspaceSnapshot {
  const facilities = [
    { id: 1, guid: 'facility-a', accountId: 'account-a', name: 'A' },
    { id: 2, guid: 'facility-b', accountId: 'account-a', name: 'B' }
  ] as any;
  return {
    account: { id: 1, guid: 'account-a', name: 'Account A' } as any,
    facilities,
    meters: [
      { id: 1, guid: 'meter-a', facilityId: 'facility-a', accountId: 'account-a' },
      { id: 2, guid: 'meter-b', facilityId: 'facility-b', accountId: 'account-a' }
    ] as any,
    meterData: [
      { id: 1, guid: 'data-a', facilityId: 'facility-a', accountId: 'account-a' }
    ] as any,
    meterGroups: [],
    predictors: [
      { id: 1, guid: 'predictor-a', facilityId: 'facility-a', accountId: 'account-a' }
    ] as any,
    predictorData: [],
    facilityAnalyses: [],
    accountAnalyses: [],
    accountReports: [],
    facilityReports: [],
    customEmissions: [],
    customFuels: [],
    customGWPs: [],
    energyUseGroups: [
      { id: 1, guid: 'group-a', facilityId: 'facility-a', accountId: 'account-a' }
    ] as any,
    energyUseEquipment: [
      { id: 1, guid: 'equipment-a', facilityId: 'facility-a', accountId: 'account-a' }
    ] as any
  };
}
