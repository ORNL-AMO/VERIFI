import { TestBed } from '@angular/core/testing';

import { AccountSummaryService } from './account-summary.service';

describe('AccountSummaryService', () => {
  let service: AccountSummaryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AccountSummaryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
