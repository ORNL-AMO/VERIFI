import { TestBed } from '@angular/core/testing';

import { HelpPanelService } from './help-panel.service';

describe('HelpPanelService', () => {
  let service: HelpPanelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HelpPanelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
