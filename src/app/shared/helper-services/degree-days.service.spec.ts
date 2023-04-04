import { TestBed } from '@angular/core/testing';

import { DegreeDaysService } from './degree-days.service';

describe('DegreeDaysService', () => {
  let service: DegreeDaysService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DegreeDaysService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
