import { TestBed } from '@angular/core/testing';

import { AnalysisCalculationsService } from './analysis-calculations.service';

describe('AnalysisCalculationsService', () => {
  let service: AnalysisCalculationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AnalysisCalculationsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
