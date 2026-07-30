import { TestBed } from '@angular/core/testing';

import { ExportReportPdfService } from './export-report-pdf.service';

describe('ExportReportPdfService', () => {
  let service: ExportReportPdfService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExportReportPdfService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
