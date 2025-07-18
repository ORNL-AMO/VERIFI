import { TestBed } from '@angular/core/testing';

import { UploadDataSharedFunctionsService } from './upload-data-shared-functions.service';

describe('UploadDataSharedFunctionsService', () => {
  let service: UploadDataSharedFunctionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UploadDataSharedFunctionsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
