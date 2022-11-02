import { TestBed } from '@angular/core/testing';

import { AccountOverviewService } from './account-overview.service';

describe('AccountOverviewService', () => {
  let service: AccountOverviewService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AccountOverviewService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
