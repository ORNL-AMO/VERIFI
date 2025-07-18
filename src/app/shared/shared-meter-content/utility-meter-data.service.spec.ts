import { TestBed } from '@angular/core/testing';

import { UtilityMeterDataService } from './utility-meter-data.service';

describe('UtilityMeterDataService', () => {
  let service: UtilityMeterDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UtilityMeterDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
