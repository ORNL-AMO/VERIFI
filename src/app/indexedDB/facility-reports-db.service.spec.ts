import { TestBed } from '@angular/core/testing';

import { FacilityReportsDbService } from './facility-reports-db.service';

describe('FacilityReportsDbService', () => {
  let service: FacilityReportsDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FacilityReportsDbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
