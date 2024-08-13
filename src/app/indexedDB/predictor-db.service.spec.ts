import { TestBed } from '@angular/core/testing';

import { PredictorDbService } from './predictor-db.service';

describe('PredictorDbService', () => {
  let service: PredictorDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PredictorDbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
