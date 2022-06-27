import { TestBed } from '@angular/core/testing';

import { UpdateDbEntryService } from './update-db-entry.service';

describe('UpdateDbEntryService', () => {
  let service: UpdateDbEntryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UpdateDbEntryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
