import { TestBed } from '@angular/core/testing';

import { MeterGroupingDataService } from './meter-grouping-data.service';

describe('MeterGroupingDataService', () => {
  let service: MeterGroupingDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MeterGroupingDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
