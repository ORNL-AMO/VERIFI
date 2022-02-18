import { TestBed } from '@angular/core/testing';

import { SetupWizardService } from './setup-wizard.service';

describe('SetupWizardService', () => {
  let service: SetupWizardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SetupWizardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
