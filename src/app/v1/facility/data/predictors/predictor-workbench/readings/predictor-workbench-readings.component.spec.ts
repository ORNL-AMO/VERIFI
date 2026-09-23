import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import { PredictorWorkspaceActionsService } from '../../predictor-workspace-actions.service';
import { PredictorReadingEditorComponent } from './predictor-reading-editor/predictor-reading-editor.component';
import { PredictorWorkbenchReadingsComponent } from './predictor-workbench-readings.component';

describe('PredictorWorkbenchReadingsComponent', () => {
  it('renders the empty state and opens an add-reading editor', () => {
    const fixture = createFixture();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.textContent).toContain('No readings found for Production.');
    Array.from(root.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Add Reading'))?.click();
    fixture.detectChanges();

    expect(root.textContent).toContain('Add predictor reading');
    expect(fixture.componentInstance.editorPanel()?.mode).toBe('add');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
  });

  it('creates new Weather entries as manual overrides', () => {
    const fixture = createFixture({ predictorType: 'Weather' });

    fixture.componentInstance.openAddReading();

    expect(fixture.componentInstance.editorPanel()?.reading.weatherOverride).toBe(true);
  });

  it('saves through workspace actions and closes the editor', async () => {
    const addPredictorReading = vi.fn(async (value: any) => ({ ...value, id: 10 }));
    const fixture = createFixture({}, { addPredictorReading });
    fixture.componentInstance.openAddReading();
    const reading = fixture.componentInstance.editorPanel()!.reading;
    reading.amount = 12;

    await fixture.componentInstance.saveReading({ reading, addAnother: false });

    expect(addPredictorReading).toHaveBeenCalledWith(reading);
    expect(fixture.componentInstance.editorPanel()).toBeUndefined();
    expect(fixture.componentInstance.actionStatus()).toBe('Predictor reading saved.');
  });

  it('keeps failed reading changes open for correction or retry', async () => {
    const fixture = createFixture({}, { addPredictorReading: vi.fn(async () => { throw new Error('save failed'); }) });
    fixture.componentInstance.openAddReading();
    const reading = fixture.componentInstance.editorPanel()!.reading;
    reading.amount = 12;

    await fixture.componentInstance.saveReading({ reading, addAnother: false });

    expect(fixture.componentInstance.editorPanel()).toBeDefined();
    expect(fixture.componentInstance.actionError()).toBe('save failed');
  });

  it('keeps the editor open on the following month after Save and Add Another', async () => {
    const fixture = createFixture();
    fixture.componentInstance.openAddReading();
    const first = fixture.componentInstance.editorPanel()!.reading;
    first.amount = 12;

    await fixture.componentInstance.saveReading({ reading: first, addAnother: true });

    const next = fixture.componentInstance.editorPanel();
    expect(next?.mode).toBe('add');
    expect(next?.reading.guid).not.toBe(first.guid);
    expect(next!.reading.year * 12 + next!.reading.month).toBe(first.year * 12 + first.month + 1);
  });

  it('reports dirty editor state to the route guard contract', () => {
    const fixture = createFixture();
    fixture.componentInstance.openAddReading();
    fixture.detectChanges();
    const editor = fixture.debugElement.query(By.directive(PredictorReadingEditorComponent)).componentInstance as PredictorReadingEditorComponent;
    editor.form?.controls.notes.setValue('Changed');
    editor.form?.markAsDirty();

    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
  });
});

function createFixture(predictorOverrides: Record<string, unknown> = {}, actionOverrides: Record<string, unknown> = {}) {
  const predictor = {
    id: 1, guid: 'predictor-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Production',
    unit: 'tons', predictorType: 'Standard', canBeNegative: false, ...predictorOverrides
  } as any;
  const selectedReadings = signal<any[]>([]);
  TestBed.configureTestingModule({
    imports: [PredictorWorkbenchReadingsComponent],
    providers: [
      { provide: FacilityPredictorsWorkspaceService, useValue: {
        selectedPredictor: signal(predictor), selectedReadings, canWrite: signal(true), hasPending: signal(false),
        isLoading: signal(false)
      } },
      { provide: WorkspaceStatusService, useValue: { state: signal('ready'), predictorFindings: vi.fn(() => []) } },
      { provide: PredictorWorkspaceActionsService, useValue: {
        addPredictorReading: vi.fn(async (value: any) => ({ ...value, id: 10 })),
        updatePredictorReading: vi.fn(async (value: any) => value), deletePredictorReading: vi.fn(),
        deletePredictorReadings: vi.fn(), fillMissingPredictorMonths: vi.fn(async () => []), ...actionOverrides
      } },
      { provide: UnsavedChangesService, useValue: { register: vi.fn(() => vi.fn()), confirmDiscard: vi.fn(() => true) } },
      { provide: ModalPortalService, useValue: { show: vi.fn(), hide: vi.fn() } }
    ]
  });
  const fixture = TestBed.createComponent(PredictorWorkbenchReadingsComponent);
  fixture.detectChanges();
  return fixture;
}
