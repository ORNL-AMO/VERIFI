import { TestBed } from '@angular/core/testing';

import { CalanderizationService } from './calanderization.service';

describe('CalanderizationService', () => {
  let service: CalanderizationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CalanderizationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
