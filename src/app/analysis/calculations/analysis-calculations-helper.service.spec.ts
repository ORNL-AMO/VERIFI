import { TestBed } from '@angular/core/testing';

import { AnalysisCalculationsHelperService } from './analysis-calculations-helper.service';

describe('AnalysisCalculationsHelperService', () => {
  let service: AnalysisCalculationsHelperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AnalysisCalculationsHelperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
