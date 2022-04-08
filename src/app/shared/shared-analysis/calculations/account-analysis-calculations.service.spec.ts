import { TestBed } from '@angular/core/testing';

import { AccountAnalysisCalculationsService } from './account-analysis-calculations.service';

describe('AccountAnalysisCalculationsService', () => {
  let service: AccountAnalysisCalculationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AccountAnalysisCalculationsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
