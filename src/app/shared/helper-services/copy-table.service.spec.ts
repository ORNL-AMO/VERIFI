import { TestBed } from '@angular/core/testing';

import { CopyTableService } from './copy-table.service';

describe('CopyTableService', () => {
  let service: CopyTableService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CopyTableService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
