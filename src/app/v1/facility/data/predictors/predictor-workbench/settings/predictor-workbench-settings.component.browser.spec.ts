import { computed } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import { StandardPredictorActionsService } from '../../standard-predictor-actions.service';
import { inventoryNavigation, inventoryWorkspace } from '../../predictor-inventory/predictor-inventory.testing';
import { PredictorWorkbenchContextService } from '../predictor-workbench-context.service';
import { PredictorWorkbenchSettingsComponent } from './predictor-workbench-settings.component';

describe('Predictor settings connected borders in Chromium', () => {
  it('follows the shared corner radius at the bottom without rounding the connected top or overflowing on narrow screens', () => {
    const workspace = inventoryWorkspace();
    TestBed.configureTestingModule({ imports: [PredictorWorkbenchSettingsComponent], providers: [provideRouter([]),
      { provide: FacilityPredictorsWorkspaceService, useValue: workspace },
      { provide: PredictorWorkbenchContextService, useValue: {
        predictor: computed(() => workspace.predictors()[0]), readings: computed(() => workspace.predictorReadings()),
        card: computed(() => workspace.predictorCards()[0])
      } },
      { provide: StandardPredictorActionsService, useValue: {} },
      { provide: WorkspaceNavigationService, useValue: inventoryNavigation },
      { provide: UnsavedChangesService, useValue: { register: () => () => undefined } },
      { provide: ModalPortalService, useValue: { show: vi.fn(), hide: vi.fn() } }
    ] });
    const fixture = TestBed.createComponent(PredictorWorkbenchSettingsComponent);
    const root = document.createElement('main'); root.className = 'v1-root';
    document.body.append(root); root.append(fixture.nativeElement); fixture.detectChanges();
    const form = root.querySelector<HTMLFormElement>('form[aria-label="Predictor settings"]')!;
    const footer = form.querySelector<HTMLElement>('footer')!;
    try {
      for (const width of [1000, 360]) {
        root.style.width = `${width}px`;
        for (const radius of [8, 0, 14]) {
          root.style.setProperty('--v1-radius', `${radius}px`);
          const styles = getComputedStyle(form);
          expect(styles.borderBottomLeftRadius).toBe(`${radius}px`);
          expect(styles.borderBottomRightRadius).toBe(`${radius}px`);
          expect(styles.borderTopLeftRadius).toBe('0px');
          expect(styles.borderTopRightRadius).toBe('0px');
          expect(getComputedStyle(footer).backgroundColor).toBe('rgba(0, 0, 0, 0)');
          expect(form.scrollWidth).toBeLessThanOrEqual(form.clientWidth);
        }
      }
    } finally { fixture.destroy(); root.remove(); }
  });
});
