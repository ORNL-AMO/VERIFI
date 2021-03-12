import { TestBed } from '@angular/core/testing';

import { UploadDataService } from './upload-data.service';

describe('UploadDataService', () => {
  let service: UploadDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UploadDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
