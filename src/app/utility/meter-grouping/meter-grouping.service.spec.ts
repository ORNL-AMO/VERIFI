import { TestBed } from '@angular/core/testing';

import { MeterGroupingService } from './meter-grouping.service';

describe('MeterGroupingService', () => {
  let service: MeterGroupingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MeterGroupingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
