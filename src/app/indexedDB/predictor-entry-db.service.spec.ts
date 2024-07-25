import { TestBed } from '@angular/core/testing';

import { PredictorEntryDbService } from './predictor-entry-db.service';

describe('PredictorEntryDbService', () => {
  let service: PredictorEntryDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PredictorEntryDbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
