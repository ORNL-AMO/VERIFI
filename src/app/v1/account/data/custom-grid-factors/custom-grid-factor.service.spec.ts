import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { CustomDataCommandHandler } from '@data/account-workspace/handlers/custom-data-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { getNewIdbAccount, IdbAccount } from '@data/models/idbModels/account';
import { IdbCustomEmissionsItem } from '@data/models/idbModels/customEmissions';
import { IdbFacility } from '@data/models/idbModels/facility';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { CustomGridFactorService } from './custom-grid-factor.service';

describe('CustomGridFactorService', () => {
  const account = signal({ ...getNewIdbAccount(), id: 1, guid: 'account-a', eGridSubregion: 'Account factor' });
  const facilities = signal<IdbFacility[]>([]);
  const customEmissions = signal<IdbCustomEmissionsItem[]>([]);
  let boundary: { execute: ReturnType<typeof vi.fn> };
  let handler: {
    addCustomEmissions: ReturnType<typeof vi.fn>;
    updateCustomEmissions: ReturnType<typeof vi.fn>;
    updateCustomEmissionsWithReferences: ReturnType<typeof vi.fn>;
    deleteCustomEmissions: ReturnType<typeof vi.fn>;
  };
  let service: CustomGridFactorService;

  beforeEach(() => {
    account.set({ ...getNewIdbAccount(), id: 1, guid: 'account-a', eGridSubregion: 'Account factor' });
    facilities.set([]);
    customEmissions.set([]);
    boundary = { execute: vi.fn(async (options, persist) => ({ value: await persist(), change: options })) };
    handler = {
      addCustomEmissions: vi.fn(async item => item),
      updateCustomEmissions: vi.fn(async item => item),
      updateCustomEmissionsWithReferences: vi.fn(async item => item),
      deleteCustomEmissions: vi.fn(async item => item.id)
    };
    TestBed.configureTestingModule({
      providers: [
        CustomGridFactorService,
        { provide: AccountWorkspaceStore, useValue: { account, facilities, customEmissions } },
        { provide: WorkspaceCommandBoundary, useValue: boundary },
        { provide: CustomDataCommandHandler, useValue: handler },
        { provide: EGridService, useValue: { excelCo2Emissions: [{ subregion: 'Standard region' }] } }
      ]
    });
    service = TestBed.inject(CustomGridFactorService);
  });

  it('creates defaults with one location and one residual row', () => {
    const item = service.newGridFactor();

    expect(item.accountId).toBe('account-a');
    expect(item.locationEmissionRates).toHaveLength(1);
    expect(item.residualEmissionRates).toHaveLength(1);
  });

  it('checks names case-insensitively against standard and account custom regions while excluding the edit', () => {
    customEmissions.set([
      gridFactor('custom-a', 'Account region'),
      gridFactor('custom-b', 'Edited region')
    ]);

    expect(service.isNameAvailable('standard REGION')).toBe(false);
    expect(service.isNameAvailable(' account region ')).toBe(false);
    expect(service.isNameAvailable('edited region', 'custom-b')).toBe(true);
  });

  it('summarizes account-default and facility references', () => {
    facilities.set([
      { guid: 'facility-a', name: 'Plant A', eGridSubregion: 'Account factor' } as IdbFacility,
      { guid: 'facility-b', name: 'Plant B', eGridSubregion: 'Other' } as IdbFacility
    ]);

    expect(service.impactFor({ subregion: 'Account factor' })).toEqual({
      accountUses: true,
      facilityCount: 1,
      facilityNames: ['Plant A'],
      isUsed: true
    });
  });

  it('renames the account default and every facility reference in one reload command', async () => {
    facilities.set([
      { id: 2, guid: 'facility-a', accountId: 'account-a', name: 'Plant A', eGridSubregion: 'Account factor' } as IdbFacility,
      { id: 3, guid: 'facility-b', accountId: 'account-a', name: 'Plant B', eGridSubregion: 'Other' } as IdbFacility
    ]);
    const item = gridFactor('custom-a', 'Renamed factor');

    await service.update(item, 'Account factor');

    const [, updatedAccount, updatedFacilities] = handler.updateCustomEmissionsWithReferences.mock.calls[0];
    expect((updatedAccount as IdbAccount).eGridSubregion).toBe('Renamed factor');
    expect(updatedFacilities).toEqual([expect.objectContaining({ guid: 'facility-a', eGridSubregion: 'Renamed factor' })]);
    expect(boundary.execute.mock.calls[0][0].publication).toEqual({ mode: 'reload' });
  });

  it('uses a patch update when a rename has no dependent references', async () => {
    await service.update(gridFactor('custom-a', 'New unused'), 'Old unused');

    expect(handler.updateCustomEmissions).toHaveBeenCalled();
    expect(boundary.execute.mock.calls[0][0].publication.mode).toBe('patch');
  });

  it('blocks deletion before submitting a command while the factor is referenced', async () => {
    const item = gridFactor('custom-a', 'Account factor');

    await expect(service.delete(item)).rejects.toMatchObject({ code: 'validation-failed' });
    expect(boundary.execute).not.toHaveBeenCalled();
  });

  function gridFactor(guid: string, subregion: string): IdbCustomEmissionsItem {
    return {
      id: 10,
      guid,
      createdDate: new Date(),
      modifiedDate: new Date(),
      accountId: 'account-a',
      date: new Date(),
      subregion,
      directEmissionsRate: false,
      locationEmissionRates: [],
      residualEmissionRates: []
    };
  }
});
