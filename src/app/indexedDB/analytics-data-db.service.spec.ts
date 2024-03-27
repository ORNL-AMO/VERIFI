import { TestBed } from '@angular/core/testing';

import { AnalyticsDataDbService } from './analytics-data-db.service';

describe('AnalyticsDataDbService', () => {
  let service: AnalyticsDataDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AnalyticsDataDbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
