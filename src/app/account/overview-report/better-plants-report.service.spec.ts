import { TestBed } from '@angular/core/testing';

import { BetterPlantsReportService } from './better-plants-report.service';

describe('BetterPlantsReportService', () => {
  let service: BetterPlantsReportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BetterPlantsReportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
