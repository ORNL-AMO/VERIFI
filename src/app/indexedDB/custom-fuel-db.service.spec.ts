import { TestBed } from '@angular/core/testing';

import { CustomFuelDbService } from './custom-fuel-db.service';

describe('CustomFuelDbService', () => {
  let service: CustomFuelDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomFuelDbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
