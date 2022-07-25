import { TestBed } from '@angular/core/testing';

import { AccountHomeService } from './account-home.service';

describe('AccountHomeService', () => {
  let service: AccountHomeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AccountHomeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
