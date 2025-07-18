import { TestBed } from '@angular/core/testing';

import { BetterPlantsExcelWriterService } from './better-plants-excel-writer.service';

describe('BetterPlantsExcelWriterService', () => {
  let service: BetterPlantsExcelWriterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BetterPlantsExcelWriterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
