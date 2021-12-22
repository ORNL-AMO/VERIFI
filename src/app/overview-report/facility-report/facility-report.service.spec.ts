import { TestBed } from '@angular/core/testing';

import { FacilityReportService } from './facility-report.service';

describe('FacilityReportService', () => {
  let service: FacilityReportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FacilityReportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
