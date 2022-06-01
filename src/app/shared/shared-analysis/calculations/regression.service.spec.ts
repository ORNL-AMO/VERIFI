import { TestBed } from '@angular/core/testing';

import { RegressionService } from './regression.service';

describe('RegressionService', () => {
  let service: RegressionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RegressionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
