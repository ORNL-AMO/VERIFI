import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { MeterCommandHandler } from '@data/account-workspace/handlers/meter-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { EditorConflictError } from '@app/v1/data/editing/draft-reconciliation';
import { readMeterSettings } from '@app/v1/shared/meter-settings/meter-settings-values';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { account, facility, group, meter, reading } from './facility-meters.testing';
import { MeterSettingsActionsService } from './meter-settings-actions.service';

describe('MeterSettingsActionsService', () => {
  const identity = { accountGuid: 'account-a', facilityGuid: 'facility-a', meterGuid: 'meter-a' };
  it('resolves latest records at execution and preserves unrelated fields and newer reading values', async () => {
    const { service, store, handler, beforePersist } = setup();
    const baseline = readMeterSettings(store.meters()[0]);
    beforePersist(() => {
      store.meters.set([{ ...store.meters()[0], displayEnergyUnit: 'GJ', notes: 'Saved elsewhere' }]);
      store.meterData.set([{ ...store.meterData()[0], totalCost: 90 }]);
    });
    await service.updateSettings(identity, { ...baseline, name: 'Renamed' }, baseline, 'editor');
    expect(handler.updateMeterWithData).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Renamed', displayEnergyUnit: 'GJ', notes: 'Saved elsewhere' }),
      [expect.objectContaining({ totalCost: 90 })], 'account-a');
  });

  it('rejects conflicting setup changes without submitting a persistence write', async () => {
    const { service, store, handler, beforePersist } = setup();
    const baseline = readMeterSettings(store.meters()[0]);
    beforePersist(() => store.meters.set([{ ...store.meters()[0], energyUnit: 'GJ' }]));
    await expect(service.updateSettings(identity, { ...baseline, startingUnit: 'MMBtu' }, baseline, 'editor')).rejects.toBeInstanceOf(EditorConflictError);
    expect(handler.updateMeterWithData).not.toHaveBeenCalled();
  });

  it('rejects a locally added charge made incompatible by an earlier source change and accepts its explicit remap', async () => {
    const { service, store, handler, beforePersist } = setup();
    const baseline = readMeterSettings(store.meters()[0]);
    const charge = { guid: 'local-demand', name: 'Custom demand rider', chargeType: 'demand' as const,
      displayChargeInTable: true, displayUsageInTable: true };
    const saved = meter({ id: 1, source: 'Natural Gas', scope: 1, startingUnit: 'SCF', energyUnit: 'MMBtu',
      heatCapacity: .001029, siteToSource: 1, charges: [] });
    beforePersist(() => store.meters.set([saved]));
    await expect(service.updateSettings(identity, { ...baseline, chargesArray: [charge] }, baseline, 'editor'))
      .rejects.toMatchObject({ code: 'validation-failed' });
    expect(handler.updateMeterWithData).not.toHaveBeenCalled();
    expect(store.meters()[0]).toEqual(saved);
    const latest = readMeterSettings(saved);
    await service.updateSettings(identity, { ...latest, chargesArray: [{ ...charge, chargeType: 'demandMDQ' }] }, latest, 'editor');
    expect(handler.updateMeterWithData).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ source: 'Natural Gas',
      charges: [{ ...charge, chargeType: 'demandMDQ' }] }), expect.any(Array), 'account-a');
  });

  it('preserves a compatible custom other charge through a concurrent source change', async () => {
    const { service, store, handler, beforePersist } = setup();
    const baseline = readMeterSettings(store.meters()[0]);
    const charge = { guid: 'custom-fee', name: 'Custom service rider', chargeType: 'other' as const,
      displayChargeInTable: false, displayUsageInTable: true };
    beforePersist(() => store.meters.set([meter({ id: 1, source: 'Natural Gas', scope: 1, startingUnit: 'SCF',
      energyUnit: 'MMBtu', heatCapacity: .001029, siteToSource: 1, charges: [] })]));
    await service.updateSettings(identity, { ...baseline, chargesArray: [charge] }, baseline, 'editor');
    expect(handler.updateMeterWithData).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ source: 'Natural Gas',
      charges: [charge] }), expect.any(Array), 'account-a');
  });

  it('rejects an account switch that occurs after submission', async () => {
    const { service, store, handler, beforePersist } = setup();
    const baseline = readMeterSettings(store.meters()[0]);
    beforePersist(() => store.account.set(account({ guid: 'account-b' })));
    await expect(service.updateSettings(identity, { ...baseline, name: 'Renamed' }, baseline, 'editor')).rejects.toMatchObject({ code: 'stale-workspace' });
    expect(handler.updateMeterWithData).not.toHaveBeenCalled();
  });

  it.each(['water-group', null])('saves a Natural Gas to Water Intake change with explicit group choice %s', async groupId => {
    const { service, store, handler } = setup();
    store.meters.set([meter({ id: 1, source: 'Natural Gas', scope: 1, startingUnit: 'SCF', energyUnit: 'MMBtu', heatCapacity: 1000, groupId: 'energy-group' })]);
    store.meterGroups.set([group({ guid: 'energy-group', groupType: 'Energy' }), group({ guid: 'water-group', groupType: 'Water' })]);
    const baseline = readMeterSettings(store.meters()[0]);
    const result = await service.updateSettings(identity, { ...baseline, source: 'Water Intake', scope: null,
      startingUnit: 'gal', groupId, waterIntakeType: 'Municipal (Potable)' }, baseline, 'editor');
    expect(result).toMatchObject({ source: 'Water Intake', groupId });
    expect(handler.updateMeterWithData).toHaveBeenCalledWith(
      expect.objectContaining({ guid: 'meter-a', source: 'Water Intake', groupId: groupId ?? undefined }), expect.any(Array), 'account-a');
  });

  it.each([
    { label: 'retained Energy group', requested: 'energy-group', otherGroups: [] },
    { label: 'missing group', requested: 'missing-group', otherGroups: [] },
    { label: 'another facility group', requested: 'foreign-group', otherGroups: [group({ guid: 'foreign-group', groupType: 'Water', facilityId: 'facility-b' })] },
    { label: 'another account group', requested: 'foreign-group', otherGroups: [group({ guid: 'foreign-group', groupType: 'Water', accountId: 'account-b' })] }
  ])('rejects a source change with $label without writing', async ({ requested, otherGroups }) => {
    const { service, store, handler } = setup();
    store.meters.set([meter({ id: 1, source: 'Natural Gas', scope: 1, startingUnit: 'SCF', energyUnit: 'MMBtu', heatCapacity: 1000, groupId: 'energy-group' })]);
    store.meterGroups.set([group({ guid: 'energy-group', groupType: 'Energy' }), ...otherGroups]);
    const baseline = readMeterSettings(store.meters()[0]);
    await expect(service.updateSettings(identity, { ...baseline, source: 'Water Intake', scope: null,
      startingUnit: 'gal', groupId: requested, waterIntakeType: 'Municipal (Potable)' }, baseline, 'editor'))
      .rejects.toMatchObject({ code: 'validation-failed', message: 'The meter source is incompatible with its group.' });
    expect(handler.updateMeterWithData).not.toHaveBeenCalled();
  });

  it('revalidates the chosen group after an earlier queued change', async () => {
    const { service, store, handler, beforePersist } = setup();
    store.meterGroups.set([group({ guid: 'water-group', groupType: 'Water' })]);
    const baseline = readMeterSettings(store.meters()[0]);
    beforePersist(() => store.meterGroups.set([group({ guid: 'water-group', groupType: 'Energy' })]));
    await expect(service.updateSettings(identity, { ...baseline, source: 'Water Intake', scope: null,
      startingUnit: 'gal', groupId: 'water-group', waterIntakeType: 'Municipal (Potable)' }, baseline, 'editor'))
      .rejects.toMatchObject({ code: 'validation-failed' });
    expect(handler.updateMeterWithData).not.toHaveBeenCalled();
  });
});

function setup() {
  const current = meter({ id: 1, notes: 'Before' });
  const store = {
    account: signal(account()), facilities: signal([facility()]), meters: signal([current]),
    meterData: signal([reading({ id: 2, totalCost: 20 })]), meterGroups: signal<IdbUtilityMeterGroup[]>([]),
    canWrite: signal(true), customFuels: signal([]), customGWPs: signal([]), selectedFacility: signal(facility())
  };
  let prepare = () => {};
  const handler = { updateMeterWithData: vi.fn(async saved => saved) };
  TestBed.configureTestingModule({ providers: [
    { provide: AccountWorkspaceStore, useValue: store },
    { provide: MeterCommandHandler, useValue: handler },
    { provide: WorkspaceCommandBoundary, useValue: { execute: vi.fn(async (_request, persist) => { prepare(); return { value: await persist() }; }) } }
  ] });
  return { store, handler, service: TestBed.inject(MeterSettingsActionsService), beforePersist: (callback: () => void) => { prepare = callback; } };
}
