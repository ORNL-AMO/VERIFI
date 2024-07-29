import { TestBed } from '@angular/core/testing';

import { PredictorDataDbService } from './predictor-data-db.service';

describe('PredictorDataDbService', () => {
  let service: PredictorDataDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PredictorDataDbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
