import type { IdbFacilityEnergyUseEquipment, EquipmentUtilityData } from '@data/models/idbModels/facilityEnergyUseEquipment';
import type { IdbFacility } from '@data/models/idbModels/facility';
import type { IdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';

export const energyUseFacility = (guid = 'facility-a', name = 'North plant'): IdbFacility => ({ guid, accountId: 'account-a', name } as IdbFacility);
export const energyUseGroup = (overrides: Partial<IdbFacilityEnergyUseGroup> = {}): IdbFacilityEnergyUseGroup => ({
  guid: 'group-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Production', notes: '', sidebarOpen: false, color: '#000',
  createdDate: new Date('2024-01-01'), modifiedDate: new Date('2024-01-01'), ...overrides
});
export const energyUseSource = (overrides: Partial<EquipmentUtilityData> = {}): EquipmentUtilityData => ({
  energySource: 'Electricity', size: 5, numberOfEquipment: 1, units: 'kW',
  energyUse: [{ year: 2024, energyUse: 0, overrideEnergyUse: true, energyUseUnit: 'kWh' }], ...overrides
});
export const energyUseItem = (overrides: Partial<IdbFacilityEnergyUseEquipment> = {}): IdbFacilityEnergyUseEquipment => ({
  guid: 'energy-a', accountId: 'account-a', facilityId: 'facility-a', energyUseGroupId: 'group-a', utilityMeterGroupIds: ['meter-group-a'],
  name: 'Pump A', notes: 'Saved notes', equipmentType: 'Pump', utilityData: [energyUseSource()], operatingConditionsData: [],
  color: '#000', noLongerInUse: { isNoLongerInUse: false, year: null },
  createdDate: new Date('2024-01-01'), modifiedDate: new Date('2024-01-01'), ...overrides
});
