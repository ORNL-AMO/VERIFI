import { TestBed } from '@angular/core/testing';

import { PptReportService } from './ppt-report.service';

describe('PptReportService', () => {
  let service: PptReportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PptReportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
