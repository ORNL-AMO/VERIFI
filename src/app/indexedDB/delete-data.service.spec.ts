import { TestBed } from '@angular/core/testing';

import { DeleteDataService } from './delete-data.service';

describe('DeleteDataService', () => {
  let service: DeleteDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeleteDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
