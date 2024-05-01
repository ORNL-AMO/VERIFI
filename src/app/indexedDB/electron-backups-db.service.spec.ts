import { TestBed } from '@angular/core/testing';

import { ElectronBackupsDbService } from './electron-backups-db.service';

describe('ElectronBackupsDbService', () => {
  let service: ElectronBackupsDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ElectronBackupsDbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
