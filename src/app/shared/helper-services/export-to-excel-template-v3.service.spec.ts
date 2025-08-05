import { TestBed } from '@angular/core/testing';

import { ExportToExcelTemplateV3Service } from './export-to-excel-template-v3.service';

describe('ExportToExcelTemplateV3Service', () => {
  let service: ExportToExcelTemplateV3Service;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExportToExcelTemplateV3Service);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
