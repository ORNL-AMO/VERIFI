import { TestBed } from '@angular/core/testing';

import { ImportPredictorsService } from './import-predictors.service';

describe('ImportPredictorsService', () => {
  let service: ImportPredictorsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImportPredictorsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
