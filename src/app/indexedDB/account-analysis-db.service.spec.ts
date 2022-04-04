import { TestBed } from '@angular/core/testing';

import { AccountAnalysisDbService } from './account-analysis-db.service';

describe('AccountAnalysisDbService', () => {
  let service: AccountAnalysisDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AccountAnalysisDbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
