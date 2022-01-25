import { TestBed } from '@angular/core/testing';

import { ImportMeterService } from './import-meter.service';

describe('ImportMeterService', () => {
  let service: ImportMeterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImportMeterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
