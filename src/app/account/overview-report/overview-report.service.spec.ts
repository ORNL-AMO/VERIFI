import { TestBed } from '@angular/core/testing';

import { OverviewReportService } from './overview-report.service';

describe('OverviewReportService', () => {
  let service: OverviewReportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OverviewReportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
