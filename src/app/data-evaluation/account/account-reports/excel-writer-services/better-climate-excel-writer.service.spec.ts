import { TestBed } from '@angular/core/testing';

import { BetterClimateExcelWriterService } from './better-climate-excel-writer.service';

describe('BetterClimateExcelWriterService', () => {
  let service: BetterClimateExcelWriterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BetterClimateExcelWriterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
