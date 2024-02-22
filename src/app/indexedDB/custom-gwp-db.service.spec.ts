import { TestBed } from '@angular/core/testing';

import { CustomGWPDbService } from './custom-gwp-db.service';

describe('CustomGWPDbService', () => {
  let service: CustomGWPDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomGWPDbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
