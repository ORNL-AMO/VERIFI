import { TestBed } from '@angular/core/testing';

import { FacilityHomeService } from './facility-home.service';

describe('FacilityHomeService', () => {
  let service: FacilityHomeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FacilityHomeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
