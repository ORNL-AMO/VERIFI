import { TestBed } from '@angular/core/testing';

import { DataWizardService } from './data-wizard.service';

describe('DataWizardService', () => {
  let service: DataWizardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataWizardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
