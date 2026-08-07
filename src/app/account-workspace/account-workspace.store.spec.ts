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

  describe('pending operation tracking', () => {
    it('starts with no pending operations', () => {
      const store = new AccountWorkspaceStore();
      expect(store.hasPending()).toBe(false);
      expect(store.pendingOperations()).toEqual([]);
    });

    it('sets a pending operation and exposes it via hasPending and isPending', () => {
      const store = new AccountWorkspaceStore();
      store.setPending({ id: 1, label: 'Saving meter' });

      expect(store.hasPending()).toBe(true);
      expect(store.isPending(1)).toBe(true);
      expect(store.isPending(99)).toBe(false);
    });

    it('clears a pending operation by id', () => {
      const store = new AccountWorkspaceStore();
      store.setPending({ id: 1, label: 'Saving meter' });
      store.setPending({ id: 2, label: 'Saving facility' });
      store.clearPending(1);

      expect(store.hasPending()).toBe(true);
      expect(store.isPending(1)).toBe(false);
      expect(store.isPending(2)).toBe(true);
    });

    it('hasPending returns false after all operations are cleared', () => {
      const store = new AccountWorkspaceStore();
      store.setPending({ id: 1, label: 'Saving meter' });
      store.clearPending(1);

      expect(store.hasPending()).toBe(false);
    });

    it('multiple pending operations are each visible independently', () => {
      const store = new AccountWorkspaceStore();
      store.setPending({ id: 1, label: 'Op 1' });
      store.setPending({ id: 2, label: 'Op 2' });
      store.setPending({ id: 3, label: 'Op 3' });

      expect(store.pendingOperations()).toHaveLength(3);
      expect(store.isPending(2)).toBe(true);
    });

    it('publish resets pending operations', () => {
      const store = new AccountWorkspaceStore();
      const snapshot = createSnapshot();
      store.setPending({ id: 1, label: 'Op 1' });
      store.publish(snapshot);

      expect(store.hasPending()).toBe(false);
    });

    it('publishCommitted preserves in-flight pending operations', () => {
      const store = new AccountWorkspaceStore();
      const snapshot = createSnapshot();
      store.publish(snapshot);
      store.setPending({ id: 1, label: 'Op 1' });
      store.publishCommitted(snapshot, {});

      expect(store.isPending(1)).toBe(true);
    });
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
