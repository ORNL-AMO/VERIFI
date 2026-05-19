import { TestBed } from '@angular/core/testing';

import { FacilityEnergyUseEquipmentFormService } from './facility-energy-use-equipment-form.service';

describe('FacilityEnergyUseEquipmentFormService', () => {
  let service: FacilityEnergyUseEquipmentFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FacilityEnergyUseEquipmentFormService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
