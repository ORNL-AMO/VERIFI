import { TestBed } from '@angular/core/testing';

import { GeneralInformationService } from './general-information.service';

describe('GeneralInformationService', () => {
  let service: GeneralInformationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeneralInformationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
