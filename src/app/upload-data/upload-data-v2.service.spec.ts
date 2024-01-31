import { TestBed } from '@angular/core/testing';

import { UploadDataV2Service } from './upload-data-v2.service';

describe('UploadDataV2Service', () => {
  let service: UploadDataV2Service;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UploadDataV2Service);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
