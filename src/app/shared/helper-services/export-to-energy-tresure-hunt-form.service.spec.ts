import { TestBed } from '@angular/core/testing';

import { ExportToEnergyTresureHuntFormService } from './export-to-energy-tresure-hunt-form.service';

describe('ExportToEnergyTresureHuntFormService', () => {
  let service: ExportToEnergyTresureHuntFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExportToEnergyTresureHuntFormService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
