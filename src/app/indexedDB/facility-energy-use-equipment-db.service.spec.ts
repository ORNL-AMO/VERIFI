import { TestBed } from '@angular/core/testing';

import { FacilityEnergyUseEquipmentDbService } from './facility-energy-use-equipment-db.service';

describe('FacilityEnergyUseEquipmentDbService', () => {
  let service: FacilityEnergyUseEquipmentDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FacilityEnergyUseEquipmentDbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
