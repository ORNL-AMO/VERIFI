import { TestBed } from '@angular/core/testing';

import { AccountAnalysisService } from './account-analysis.service';

describe('AccountAnalysisService', () => {
  let service: AccountAnalysisService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AccountAnalysisService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
