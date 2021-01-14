import { TestBed } from '@angular/core/testing';

import { EnergyUseCalculationsService } from './energy-use-calculations.service';

describe('EnergyUseCalculationsService', () => {
  let service: EnergyUseCalculationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EnergyUseCalculationsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
