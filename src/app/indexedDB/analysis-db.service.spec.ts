import { TestBed } from '@angular/core/testing';

import { AnalysisDbService } from './analysis-db.service';

describe('AnalysisDbService', () => {
  let service: AnalysisDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AnalysisDbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
