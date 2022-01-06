import { TestBed } from '@angular/core/testing';

import { OverviewReportOptionsDbService } from './overview-report-options-db.service';

describe('OverviewReportOptionsDbService', () => {
  let service: OverviewReportOptionsDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OverviewReportOptionsDbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
