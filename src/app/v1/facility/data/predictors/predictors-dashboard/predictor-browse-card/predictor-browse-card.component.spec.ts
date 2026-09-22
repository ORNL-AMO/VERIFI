import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import { PredictorBrowseCardComponent } from './predictor-browse-card.component';

describe('PredictorBrowseCardComponent', () => {
  it('renders basic facts and opens Settings and Readings without mutation controls', () => {
    const navigate = vi.fn();
    TestBed.configureTestingModule({
      imports: [PredictorBrowseCardComponent],
      providers: [
        { provide: Router, useValue: { navigate } },
        { provide: FacilityPredictorsWorkspaceService, useValue: { facility: signal({ guid: 'facility-a' }) } },
        {
          provide: WorkspaceNavigationService,
          useValue: {
            facilityPredictorRoute: (facilityGuid: string, predictorGuid: string, tab: string) =>
              ['/v1', 'workspace', 'facility', facilityGuid, 'data', 'predictors', predictorGuid, tab]
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(PredictorBrowseCardComponent);
    fixture.componentRef.setInput('card', {
      predictor: { guid: 'predictor-a', name: 'Production', predictorType: 'Standard' },
      icon: 'package',
      typeLabel: 'Standard',
      classificationLabel: 'Production',
      unitLabel: 'tons',
      readingCount: 3,
      firstReadingLabel: 'Jan 2025',
      latestReadingLabel: 'Mar 2025'
    });
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('Standard');
    expect(element.textContent).toContain('Production');
    expect(element.textContent).toContain('tons');
    expect(element.textContent).toContain('Jan 2025');
    expect(element.querySelector('[aria-label="Copy predictor"]')).toBeNull();
    expect(element.querySelector('[aria-label="Delete predictor"]')).toBeNull();

    (element.querySelector('[aria-label="Open Production settings"]') as HTMLButtonElement).click();
    expect(navigate).toHaveBeenLastCalledWith([
      '/v1', 'workspace', 'facility', 'facility-a', 'data', 'predictors', 'predictor-a', 'settings'
    ]);

    (element.querySelector('[aria-label="Open readings"]') as HTMLButtonElement).click();
    expect(navigate).toHaveBeenLastCalledWith([
      '/v1', 'workspace', 'facility', 'facility-a', 'data', 'predictors', 'predictor-a', 'readings'
    ]);
  });
});
