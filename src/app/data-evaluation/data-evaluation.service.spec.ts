import { TestBed } from '@angular/core/testing';

import { DataEvaluationService } from './data-evaluation.service';

describe('DataEvaluationService', () => {
  let service: DataEvaluationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataEvaluationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
