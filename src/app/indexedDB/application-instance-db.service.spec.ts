import { TestBed } from '@angular/core/testing';

import { ApplicationInstanceDbService } from './application-instance-db.service';

describe('ApplicationInstanceDbService', () => {
  let service: ApplicationInstanceDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApplicationInstanceDbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
