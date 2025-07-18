import { TestBed } from '@angular/core/testing';

import { AccountReportsService } from './account-reports.service';

describe('AccountReportsService', () => {
  let service: AccountReportsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AccountReportsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
