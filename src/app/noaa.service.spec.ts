import { TestBed } from '@angular/core/testing';

import { NoaaService } from './noaa.service';

describe('NoaaService', () => {
  let service: NoaaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NoaaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
