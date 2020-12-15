import { TestBed } from '@angular/core/testing';

import { AccountManagementService } from './account-management.service';

describe('AccountManagementService', () => {
  let service: AccountManagementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AccountManagementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
