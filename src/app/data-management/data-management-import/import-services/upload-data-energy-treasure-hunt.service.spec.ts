import { TestBed } from '@angular/core/testing';

import { UploadDataEnergyTreasureHuntService } from './upload-data-energy-treasure-hunt.service';

describe('UploadDataEnergyTreasureHuntService', () => {
  let service: UploadDataEnergyTreasureHuntService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UploadDataEnergyTreasureHuntService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
