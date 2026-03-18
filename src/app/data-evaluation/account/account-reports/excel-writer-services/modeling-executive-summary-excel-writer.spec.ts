import { TestBed } from '@angular/core/testing';

import { ModelingExecutiveSummaryExcelWriter } from './modeling-executive-summary-excel-writer';

describe('ModelingExecutiveSummaryExcelWriter', () => {
  let service: ModelingExecutiveSummaryExcelWriter;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ModelingExecutiveSummaryExcelWriter);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
