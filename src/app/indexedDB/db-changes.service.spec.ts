import { TestBed } from '@angular/core/testing';

import { DbChangesService } from './db-changes.service';

describe('DbChangesService', () => {
  let service: DbChangesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DbChangesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
