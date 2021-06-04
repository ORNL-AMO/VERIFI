import { TestBed } from '@angular/core/testing';

import { VisualizationStateService } from './visualization-state.service';

describe('VisualizationStateService', () => {
  let service: VisualizationStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VisualizationStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
