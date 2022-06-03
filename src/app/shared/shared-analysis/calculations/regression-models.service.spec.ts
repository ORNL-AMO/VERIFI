import { TestBed } from '@angular/core/testing';

import { RegressionModelsService } from './regression-models.service';

describe('RegressionModelsService', () => {
  let service: RegressionModelsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RegressionModelsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
