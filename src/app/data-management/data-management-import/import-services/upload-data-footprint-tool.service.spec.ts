import { TestBed } from '@angular/core/testing';

import { UploadDataFootprintToolService } from './upload-data-footprint-tool.service';

describe('UploadDataFootprintToolService', () => {
  let service: UploadDataFootprintToolService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UploadDataFootprintToolService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
