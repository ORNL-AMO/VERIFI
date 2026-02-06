import { TestBed } from '@angular/core/testing';

import { MigrateDatesService } from './migrate-dates.service';

describe('MigrateDatesService', () => {
  let service: MigrateDatesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MigrateDatesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
