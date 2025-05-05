import { TestBed } from '@angular/core/testing';

import { ExportToNewTemplateService } from './export-to-new-template.service';

describe('ExportToNewTemplateService', () => {
  let service: ExportToNewTemplateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExportToNewTemplateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
