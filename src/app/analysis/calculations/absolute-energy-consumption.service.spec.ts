import { TestBed } from '@angular/core/testing';

import { AbsoluteEnergyConsumptionService } from './absolute-energy-consumption.service';

describe('AbsoluteEnergyConsumptionService', () => {
  let service: AbsoluteEnergyConsumptionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AbsoluteEnergyConsumptionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
