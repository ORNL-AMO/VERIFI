import { TestBed } from '@angular/core/testing';

import { EnergyUnitsHelperService } from './energy-units-helper.service';

describe('EnergyUnitsHelperService', () => {
  let service: EnergyUnitsHelperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EnergyUnitsHelperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
