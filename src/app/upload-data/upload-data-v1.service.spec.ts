import { TestBed } from '@angular/core/testing';

import { UploadDataV1Service } from './upload-data-v1.service';

describe('UploadDataV1Service', () => {
  let service: UploadDataV1Service;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UploadDataV1Service);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
