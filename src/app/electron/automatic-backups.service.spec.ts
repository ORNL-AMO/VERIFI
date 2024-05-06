import { TestBed } from '@angular/core/testing';

import { AutomaticBackupsService } from './automatic-backups.service';

describe('AutomaticBackupsService', () => {
  let service: AutomaticBackupsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AutomaticBackupsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
