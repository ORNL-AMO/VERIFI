import { TestBed } from '@angular/core/testing';

import { SettingsFormsService } from './settings-forms.service';

describe('SettingsFormsService', () => {
  let service: SettingsFormsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SettingsFormsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
