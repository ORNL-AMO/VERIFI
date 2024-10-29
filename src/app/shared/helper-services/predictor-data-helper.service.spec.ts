import { TestBed } from '@angular/core/testing';

import { PredictorDataHelperService } from './predictor-data-helper.service';

describe('PredictorDataHelperService', () => {
  let service: PredictorDataHelperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PredictorDataHelperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
