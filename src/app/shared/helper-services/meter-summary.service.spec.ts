import { TestBed } from '@angular/core/testing';

import { MeterSummaryService } from './meter-summary.service';

describe('MeterSummaryService', () => {
  let service: MeterSummaryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MeterSummaryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
