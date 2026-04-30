import { TestBed } from '@angular/core/testing';

import { FacilityEnergyUseGroupFormService } from './facility-energy-use-group-form.service';

describe('FacilityEnergyUseGroupFormService', () => {
  let service: FacilityEnergyUseGroupFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FacilityEnergyUseGroupFormService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
