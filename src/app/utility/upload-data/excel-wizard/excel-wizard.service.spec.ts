import { TestBed } from '@angular/core/testing';

import { ExcelWizardService } from './excel-wizard.service';

describe('ExcelWizardService', () => {
  let service: ExcelWizardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExcelWizardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
