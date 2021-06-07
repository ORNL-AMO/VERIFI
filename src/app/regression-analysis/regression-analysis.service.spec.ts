import { TestBed } from '@angular/core/testing';

import { RegressionAnalysisService } from './regression-analysis.service';

describe('RegressionAnalysisService', () => {
  let service: RegressionAnalysisService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RegressionAnalysisService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
