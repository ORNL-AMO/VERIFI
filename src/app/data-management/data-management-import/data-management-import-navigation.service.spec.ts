import { TestBed } from '@angular/core/testing';

import { DataManagementImportNavigationService } from './data-management-import-navigation.service';

describe('DataManagementImportNavigationService', () => {
  let service: DataManagementImportNavigationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataManagementImportNavigationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
