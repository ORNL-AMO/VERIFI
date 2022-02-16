import { TestBed } from '@angular/core/testing';

import { FacilityAnalysisCalculationsService } from './facility-analysis-calculations.service';

describe('FacilityAnalysisCalculationsService', () => {
  let service: FacilityAnalysisCalculationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FacilityAnalysisCalculationsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
