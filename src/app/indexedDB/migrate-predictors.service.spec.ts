import { TestBed } from '@angular/core/testing';

import { MigratePredictorsService } from './migrate-predictors.service';

describe('MigratePredictorsService', () => {
  let service: MigratePredictorsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MigratePredictorsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
