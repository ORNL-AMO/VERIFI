import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from 'ngx-webstorage';
import { ANALYSIS_TABLE_COLUMNS_STORAGE_KEY, AnalysisResultsDisplayService } from './analysis-results-display.service';

describe('AnalysisResultsDisplayService', () => {
  it('stores period-specific preferences under the existing compatibility key', () => {
    const store = vi.fn();
    TestBed.configureTestingModule({ providers: [AnalysisResultsDisplayService, { provide: LocalStorageService, useValue: { retrieve: vi.fn(), store } }] });
    const service = TestBed.inject(AnalysisResultsDisplayService);
    service.setColumn('monthly', 'modeledEnergy', false);
    expect(service.monthlyColumns().modeledEnergy).toBe(false);
    expect(service.annualColumns().modeledEnergy).toBe(true);
    expect(store).toHaveBeenCalledWith(ANALYSIS_TABLE_COLUMNS_STORAGE_KEY, expect.objectContaining({ monthly: expect.objectContaining({ modeledEnergy: false }) }));
  });
});
