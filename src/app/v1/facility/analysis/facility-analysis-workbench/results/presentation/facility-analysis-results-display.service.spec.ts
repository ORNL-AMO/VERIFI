import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from 'ngx-webstorage';
import { ANALYSIS_TABLE_COLUMNS_STORAGE_KEY, FacilityAnalysisResultsDisplayService } from './facility-analysis-results-display.service';

describe('FacilityAnalysisResultsDisplayService', () => {
  it('stores column preferences under the v1 compatibility key', () => {
    const store = vi.fn();
    TestBed.configureTestingModule({ providers: [
      FacilityAnalysisResultsDisplayService,
      { provide: LocalStorageService, useValue: { retrieve: vi.fn(), store } }
    ] });
    const service = TestBed.inject(FacilityAnalysisResultsDisplayService);
    service.setColumn('monthly', 'modeledEnergy', false);
    expect(service.monthlyColumns().modeledEnergy).toBe(false);
    expect(service.annualColumns().modeledEnergy).toBe(true);
    expect(store).toHaveBeenCalledWith(ANALYSIS_TABLE_COLUMNS_STORAGE_KEY, expect.objectContaining({
      monthly: expect.objectContaining({ modeledEnergy: false })
    }));
  });
});
