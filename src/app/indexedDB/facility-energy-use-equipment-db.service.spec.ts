import { FacilityEnergyUseEquipmentDbService } from './facility-energy-use-equipment-db.service';

describe('FacilityEnergyUseEquipmentDbService', () => {
  it('provides an empty equipment selection for workspace publication', () => {
    const service = new FacilityEnergyUseEquipmentDbService(
      {} as any,
      {} as any,
      {} as any
    );

    expect(service.selectedFacilityEnergyUseEquipment.getValue()).toBeUndefined();
    expect(() => service.selectedFacilityEnergyUseEquipment.next(undefined)).not.toThrow();
  });
});
