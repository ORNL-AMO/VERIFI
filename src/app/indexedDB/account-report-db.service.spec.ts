import { TestBed } from '@angular/core/testing';

import { AccountReportDbService } from './account-report-db.service';

describe('AccountReportDbService', () => {
  let service: AccountReportDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AccountReportDbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
