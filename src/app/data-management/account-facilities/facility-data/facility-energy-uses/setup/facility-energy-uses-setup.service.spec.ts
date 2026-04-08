import { TestBed } from '@angular/core/testing';

import { FacilityEnergyUsesSetupService } from './facility-energy-uses-setup.service';

describe('FacilityEnergyUsesSetupService', () => {
  let service: FacilityEnergyUsesSetupService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FacilityEnergyUsesSetupService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
