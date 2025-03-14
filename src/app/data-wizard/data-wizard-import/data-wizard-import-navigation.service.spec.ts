import { TestBed } from '@angular/core/testing';

import { DataWizardImportNavigationService } from './data-wizard-import-navigation.service';

describe('DataWizardImportNavigationService', () => {
  let service: DataWizardImportNavigationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataWizardImportNavigationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
