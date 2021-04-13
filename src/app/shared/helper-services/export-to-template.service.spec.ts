import { TestBed } from '@angular/core/testing';

import { ExportToTemplateService } from './export-to-template.service';

describe('ExportToTemplateService', () => {
  let service: ExportToTemplateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExportToTemplateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
