import { FacilityEnergyUseEquipmentDbService } from './facility-energy-use-equipment-db.service';
import { vi } from 'vitest';

describe('FacilityEnergyUseEquipmentDbService', () => {
  it('keeps equipment persistence access stateless', () => {
    const dbService = { getAll: vi.fn() };
    const service = new FacilityEnergyUseEquipmentDbService(
      dbService as any,
      {} as any
    );

    service.getAll();
    expect(dbService.getAll).toHaveBeenCalledWith('facilityEnergyUseEquipment');
  });
});
