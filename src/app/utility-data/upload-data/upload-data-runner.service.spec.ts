import { TestBed } from '@angular/core/testing';

import { UploadDataRunnerService } from './upload-data-runner.service';

describe('UploadDataRunnerService', () => {
  let service: UploadDataRunnerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UploadDataRunnerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
