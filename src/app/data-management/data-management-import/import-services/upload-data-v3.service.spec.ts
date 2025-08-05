import { TestBed } from '@angular/core/testing';

import { UploadDataV3Service } from './upload-data-v3.service';

describe('UploadDataV3Service', () => {
  let service: UploadDataV3Service;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UploadDataV3Service);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
