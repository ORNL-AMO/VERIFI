import { TestBed } from '@angular/core/testing';

import { CustomEmissionsDbService } from './custom-emissions-db.service';

describe('CustomEmissionsDbService', () => {
  let service: CustomEmissionsDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomEmissionsDbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
