import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { CustomDataCommandHandler } from '@data/account-workspace/handlers/custom-data-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { IdbCustomGWP } from '@data/models/idbModels/customGWP';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { CustomGwpService } from './custom-gwp.service';

describe('CustomGwpService', () => {
  const account = signal({ ...getNewIdbAccount(), guid: 'account-a' });
  const facilities = signal<IdbFacility[]>([]);
  const meters = signal<IdbUtilityMeter[]>([]);
  const customGWPs = signal<IdbCustomGWP[]>([]);
  let boundary: { execute: ReturnType<typeof vi.fn> };
  let handler: {
    addCustomGWP: ReturnType<typeof vi.fn>;
    updateCustomGWP: ReturnType<typeof vi.fn>;
    deleteCustomGWP: ReturnType<typeof vi.fn>;
  };
  let service: CustomGwpService;

  beforeEach(() => {
    facilities.set([]);
    meters.set([]);
    customGWPs.set([]);
    boundary = { execute: vi.fn(async (options, persist) => ({ value: await persist(), change: options })) };
    handler = {
      addCustomGWP: vi.fn(async item => item),
      updateCustomGWP: vi.fn(async item => item),
      deleteCustomGWP: vi.fn(async item => item.id)
    };
    TestBed.configureTestingModule({
      providers: [
        CustomGwpService,
        { provide: AccountWorkspaceStore, useValue: { account, facilities, meters, customGWPs } },
        { provide: WorkspaceCommandBoundary, useValue: boundary },
        { provide: CustomDataCommandHandler, useValue: handler }
      ]
    });
    service = TestBed.inject(CustomGwpService);
  });

  it('allocates noncolliding identifiers for new records', () => {
    customGWPs.set([customGwp('Existing', 50_000)]);

    expect(service.newGwp()).toMatchObject({ accountId: 'account-a', value: 50_001 });
  });

  it('checks names case-insensitively and excludes the edited record', () => {
    customGWPs.set([customGwp('Account gas', 50_000, 'gwp-a')]);

    expect(service.isNameAvailable('co2')).toBe(false);
    expect(service.isNameAvailable(' account GAS ')).toBe(false);
    expect(service.isNameAvailable('Account gas', 'gwp-a')).toBe(true);
  });

  it('summarizes linked meters and unique facilities', () => {
    facilities.set([
      { guid: 'facility-a', name: 'Plant A' } as IdbFacility,
      { guid: 'facility-b', name: 'Plant B' } as IdbFacility
    ]);
    meters.set([
      { guid: 'meter-a', name: 'Chiller A', facilityId: 'facility-a', globalWarmingPotentialOption: 50_000 } as IdbUtilityMeter,
      { guid: 'meter-b', name: 'Chiller B', facilityId: 'facility-a', globalWarmingPotentialOption: 50_000 } as IdbUtilityMeter
    ]);

    expect(service.impactFor({ value: 50_000 })).toEqual({
      meterCount: 2,
      facilityCount: 1,
      meterNames: ['Chiller A', 'Chiller B'],
      facilityNames: ['Plant A']
    });
  });

  it('preserves the stable identifier and publishes edits as patches', async () => {
    const gwp = customGwp('Edited gas', 50_000);

    await service.update(gwp);

    expect(handler.updateCustomGWP).toHaveBeenCalledWith(expect.objectContaining({ value: 50_000 }), 'account-a');
    expect(boundary.execute.mock.calls[0][0]).toMatchObject({
      entityKind: 'customGWP',
      changeKind: 'update',
      publication: { mode: 'patch' }
    });
  });

  it('blocks deletion before submitting a command while a meter references the GWP', async () => {
    const gwp = customGwp('In use', 50_000);
    meters.set([{ guid: 'meter-a', facilityId: 'facility-a', globalWarmingPotentialOption: 50_000 } as IdbUtilityMeter]);

    await expect(service.delete(gwp)).rejects.toMatchObject({ code: 'validation-failed' });
    expect(boundary.execute).not.toHaveBeenCalled();
  });

  function customGwp(label: string, value: number, guid = 'gwp-a'): IdbCustomGWP {
    return {
      id: 10,
      guid,
      createdDate: new Date(),
      modifiedDate: new Date(),
      accountId: 'account-a',
      date: new Date(),
      label,
      display: label,
      value,
      gwp_ar4: 25,
      gwp_ar5: 25,
      gwp_ar6: 25
    };
  }
});
