import { TestBed } from '@angular/core/testing';

import { ExportToExcelTemplateService } from './export-to-excel-template.service';

describe('ExportToExcelTemplateService', () => {
  let service: ExportToExcelTemplateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExportToExcelTemplateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
