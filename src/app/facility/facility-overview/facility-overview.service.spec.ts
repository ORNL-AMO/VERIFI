import { TestBed } from '@angular/core/testing';

import { FacilityOverviewService } from './facility-overview.service';

describe('FacilityOverviewService', () => {
  let service: FacilityOverviewService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FacilityOverviewService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
