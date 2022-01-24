import { TestBed } from '@angular/core/testing';

import { EnergyIntensityService } from './energy-intensity.service';

describe('EnergyIntensityService', () => {
  let service: EnergyIntensityService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EnergyIntensityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
