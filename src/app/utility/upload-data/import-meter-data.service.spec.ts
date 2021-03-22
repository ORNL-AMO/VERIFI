import { TestBed } from '@angular/core/testing';

import { ImportMeterDataService } from './import-meter-data.service';

describe('ImportMeterDataService', () => {
  let service: ImportMeterDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImportMeterDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
