import { TestBed } from '@angular/core/testing';

import { ModifiedEnergyIntensityService } from './modified-energy-intensity.service';

describe('ModifiedEnergyIntensityService', () => {
  let service: ModifiedEnergyIntensityService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ModifiedEnergyIntensityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
