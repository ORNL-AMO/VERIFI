import { TestBed } from '@angular/core/testing';

import { FacilityReportsService } from './facility-reports.service';

describe('FacilityReportsService', () => {
  let service: FacilityReportsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FacilityReportsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
