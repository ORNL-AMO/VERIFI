import { TestBed } from '@angular/core/testing';

import { AnalysisValidationService } from './analysis-validation.service';

describe('AnalysisValidationService', () => {
  let service: AnalysisValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AnalysisValidationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
