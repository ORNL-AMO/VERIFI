import { of } from 'rxjs';
import { vi } from 'vitest';
import { EnergyUseCommandHandler } from './energy-use-command-handler.service';
import { IdbFacilityEnergyUseGroup } from '../../models/idbModels/facilityEnergyUseGroups';
import { IdbFacilityEnergyUseEquipment } from '../../models/idbModels/facilityEnergyUseEquipment';

const ACCOUNT = 'acct-1';

describe('EnergyUseCommandHandler', () => {
  function createHandler() {
    const groupDb = { addWithObservable: vi.fn(), updateWithObservable: vi.fn(), deleteWithObservable: vi.fn() };
    const equipmentDb = { addWithObservable: vi.fn(), updateWithObservable: vi.fn(), deleteWithObservable: vi.fn() };
    const handler = new EnergyUseCommandHandler(groupDb as any, equipmentDb as any);
    return { handler, groupDb, equipmentDb };
  }

  it('addGroup persists and returns the new group', async () => {
    const { handler, groupDb } = createHandler();
    groupDb.addWithObservable.mockReturnValue(of({ guid: 'g-1', id: 1 }));
    const result = await handler.addGroup({ guid: 'g-1', accountId: ACCOUNT } as IdbFacilityEnergyUseGroup, ACCOUNT);
    expect(result.id).toBe(1);
  });

  it('updateGroup rejects cross-account group', async () => {
    const { handler, groupDb } = createHandler();
    await expect(
      handler.updateGroup({ guid: 'g-1', accountId: 'other' } as IdbFacilityEnergyUseGroup, ACCOUNT)
    ).rejects.toMatchObject({ code: 'cross-account-entity' });
    expect(groupDb.updateWithObservable).not.toHaveBeenCalled();
  });

  it('deleteGroup returns the id and rejects cross-account', async () => {
    const { handler, groupDb } = createHandler();
    groupDb.deleteWithObservable.mockReturnValue(of(undefined));
    const result = await handler.deleteGroup({ id: 3, guid: 'g-1', accountId: ACCOUNT } as IdbFacilityEnergyUseGroup, ACCOUNT);
    expect(result).toBe(3);
  });

  it('addEquipment persists and returns the new equipment', async () => {
    const { handler, equipmentDb } = createHandler();
    equipmentDb.addWithObservable.mockReturnValue(of({ guid: 'eq-1', id: 2 }));
    const result = await handler.addEquipment({ guid: 'eq-1', accountId: ACCOUNT } as IdbFacilityEnergyUseEquipment, ACCOUNT);
    expect(result.id).toBe(2);
  });

  it('deleteEquipment rejects cross-account equipment', async () => {
    const { handler, equipmentDb } = createHandler();
    await expect(
      handler.deleteEquipment({ id: 4, guid: 'eq-1', accountId: 'other' } as IdbFacilityEnergyUseEquipment, ACCOUNT)
    ).rejects.toMatchObject({ code: 'cross-account-entity' });
    expect(equipmentDb.deleteWithObservable).not.toHaveBeenCalled();
  });
});
