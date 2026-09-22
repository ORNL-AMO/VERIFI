import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { CustomDataCommandHandler } from '@data/account-workspace/handlers/custom-data-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { IdbCustomFuel } from '@data/models/idbModels/customFuel';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { CustomFuelService } from './custom-fuel.service';

describe('CustomFuelService', () => {
  const account = signal({ ...getNewIdbAccount(), guid: 'account-a' });
  const meters = signal<IdbUtilityMeter[]>([]);
  const facilities = signal<IdbFacility[]>([]);
  const customFuels = signal<IdbCustomFuel[]>([]);
  let boundary: { execute: ReturnType<typeof vi.fn> };
  let handler: {
    addCustomFuel: ReturnType<typeof vi.fn>;
    updateCustomFuel: ReturnType<typeof vi.fn>;
    updateCustomFuelWithMeters: ReturnType<typeof vi.fn>;
    deleteCustomFuel: ReturnType<typeof vi.fn>;
  };
  let service: CustomFuelService;

  beforeEach(() => {
    meters.set([]);
    facilities.set([]);
    customFuels.set([]);
    boundary = {
      execute: vi.fn(async (options, persist) => ({ value: await persist(), change: options }))
    };
    handler = {
      addCustomFuel: vi.fn(async fuel => fuel),
      updateCustomFuel: vi.fn(async fuel => fuel),
      updateCustomFuelWithMeters: vi.fn(async fuel => fuel),
      deleteCustomFuel: vi.fn(async fuel => fuel.id)
    };
    TestBed.configureTestingModule({
      providers: [
        CustomFuelService,
        {
          provide: AccountWorkspaceStore,
          useValue: { account, meters, facilities, customFuels }
        },
        { provide: WorkspaceCommandBoundary, useValue: boundary },
        { provide: CustomDataCommandHandler, useValue: handler }
      ]
    });
    service = TestBed.inject(CustomFuelService);
  });

  it('summarizes linked meters and owning facilities', () => {
    facilities.set([
      { guid: 'facility-a', name: 'Plant A' } as IdbFacility,
      { guid: 'facility-b', name: 'Plant B' } as IdbFacility
    ]);
    meters.set([
      { guid: 'meter-a', name: 'Boiler', facilityId: 'facility-a', fuel: 'Custom gas' } as IdbUtilityMeter,
      { guid: 'meter-b', name: 'Truck', facilityId: 'facility-b', vehicleFuel: 'Custom gas' } as IdbUtilityMeter
    ]);

    expect(service.impactFor({ value: 'Custom gas' })).toEqual({
      meterCount: 2,
      facilityCount: 2,
      meterNames: ['Boiler', 'Truck'],
      facilityNames: ['Plant A', 'Plant B']
    });
  });

  it('renames both stationary and vehicle references in one reload command', async () => {
    const fuel = { id: 1, guid: 'fuel-a', accountId: 'account-a', value: 'New name' } as IdbCustomFuel;
    meters.set([
      { id: 2, guid: 'meter-a', accountId: 'account-a', facilityId: 'facility-a', fuel: 'Old name' } as IdbUtilityMeter,
      { id: 3, guid: 'meter-b', accountId: 'account-a', facilityId: 'facility-a', vehicleFuel: 'Old name' } as IdbUtilityMeter
    ]);

    await service.update(fuel, 'Old name');

    const renamedMeters = handler.updateCustomFuelWithMeters.mock.calls[0][1] as IdbUtilityMeter[];
    expect(renamedMeters[0].fuel).toBe('New name');
    expect(renamedMeters[1].vehicleFuel).toBe('New name');
    expect(boundary.execute.mock.calls[0][0].publication).toEqual({ mode: 'reload' });
  });

  it('blocks deletion before submitting a command when the fuel is referenced', async () => {
    const fuel = { id: 1, guid: 'fuel-a', accountId: 'account-a', value: 'In use' } as IdbCustomFuel;
    meters.set([{ guid: 'meter-a', facilityId: 'facility-a', fuel: 'In use' } as IdbUtilityMeter]);

    await expect(service.delete(fuel)).rejects.toMatchObject({ code: 'validation-failed' });
    expect(boundary.execute).not.toHaveBeenCalled();
  });

  it('publishes create and unreferenced delete commands as workspace patches', async () => {
    const fuel = { id: 1, guid: 'fuel-a', accountId: 'account-a', value: 'Unused' } as IdbCustomFuel;

    await service.create(fuel);
    await service.delete(fuel);

    expect(boundary.execute.mock.calls[0][0]).toMatchObject({
      entityKind: 'customFuel',
      changeKind: 'add',
      entityGuid: 'fuel-a',
      publication: { mode: 'patch' }
    });
    expect(boundary.execute.mock.calls[1][0]).toMatchObject({
      entityKind: 'customFuel',
      changeKind: 'delete',
      entityGuid: 'fuel-a',
      publication: { mode: 'patch' }
    });
    expect(handler.deleteCustomFuel).toHaveBeenCalledWith(fuel, 'account-a');
  });
});
