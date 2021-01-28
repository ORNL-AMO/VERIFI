import { TestBed } from '@angular/core/testing';

import { ConvertMeterDataService } from './convert-meter-data.service';

describe('ConvertMeterDataService', () => {
  let service: ConvertMeterDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConvertMeterDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
