import { TestBed } from '@angular/core/testing';

import { FacilityEnergyUseGroupsDbService } from './facility-energy-use-groups-db.service';

describe('FacilityEnergyUseGroupsDbService', () => {
  let service: FacilityEnergyUseGroupsDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FacilityEnergyUseGroupsDbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
