import { Component, EventEmitter, Input, Output, WritableSignal, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { WeatherMonth } from '@platform/weather/hourly-weather-data.models';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { presentFindings } from '@app/v1/status/status.catalog';
import { makeFinding } from '@app/v1/status/status.models';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import { WeatherPredictorActionsService } from '../../weather-predictor-actions.service';
import { PredictorWeatherWorkflowService } from '../../predictor-weather-workflow.service';
import { WeatherPredictorReadingsComponent } from './weather-predictor-readings.component';
import { WeatherPredictorWorkbenchContextService } from '../weather-predictor-workbench-context.service';
import { WeatherSourceReadingsSlideoutComponent } from '../../shared/weather-source-readings/weather-source-readings-slideout.component';
import { WeatherReadingMonthEditorComponent } from './weather-reading-month-editor/weather-reading-month-editor.component';

describe('WeatherPredictorReadingsComponent', () => {
  it('tracks range and child pristine events reactively without value edits or weather work', () => {
    const fixture = setup([weatherPredictor()], [weatherReading(1)]);
    const component = fixture.componentInstance;
    const rangeChanges = vi.fn(); component.rangeForm.valueChanges.subscribe(rangeChanges);
    component.rangeForm.markAsDirty(); expect(component.rangeDirty()).toBe(true); expect(component.hasDraftChanges()).toBe(true);
    component.rangeForm.markAsPristine(); expect(component.rangeDirty()).toBe(false); expect(component.hasDraftChanges()).toBe(false);
    component.openEdit(component.matrix().rows[0]); fixture.detectChanges();
    const editor = fixture.debugElement.query(By.directive(WeatherReadingMonthEditorComponent)).componentInstance as WeatherReadingMonthEditorComponent;
    editor.form.markAsDirty(); expect(component.hasDraftChanges()).toBe(true);
    editor.form.markAsPristine(); expect(component.hasDraftChanges()).toBe(false);
    expect(rangeChanges).not.toHaveBeenCalled();
    expect(TestBed.inject(PredictorWeatherWorkflowService).previewStationGroup).not.toHaveBeenCalled();
    expect(TestBed.inject(WeatherPredictorActionsService).applyWeatherStationMonth).not.toHaveBeenCalled();
  });

  it('renders dynamic predictor columns with status icons beside their values', () => {
    const predictors = [
      { guid: 'hdd', name: 'HDD 55', predictorType: 'Weather', weatherDataType: 'HDD', accountId: 'a', facilityId: 'f' },
      { guid: 'humidity', name: 'Humidity', predictorType: 'Weather', weatherDataType: 'relativeHumidity', accountId: 'a', facilityId: 'f' }
    ];
    const fixture = setup(predictors, [{
      id: 1, guid: 'reading', predictorId: 'hdd', accountId: 'a', facilityId: 'f',
      year: 2026, month: 1, amount: 12, weatherDataWarning: true, weatherOverride: false
    }]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('HDD 55');
    expect(text).toContain('Humidity');
    expect(text).toContain('12');
    expect(text).toContain('—');
    expect(fixture.nativeElement.querySelector('[title="Incomplete source data"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[title="Missing predictor record"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('thead th')).toHaveLength(4);
    expect(text).not.toContain('Station data');
    expect(text).not.toContain('Monthly weather readings');
    expect(text).not.toContain('Each row saves every included predictor');
  });

  it('lists grouped reading checks and explains the tab attention total', () => {
    const predictors = [
      { guid: 'hdd', name: 'HDD 55', predictorType: 'Weather', weatherDataType: 'HDD' },
      { guid: 'humidity', name: 'Humidity', predictorType: 'Weather', weatherDataType: 'relativeHumidity' }
    ];
    const entity = (predictor: any) => ({
      kind: 'predictor' as const, guid: predictor.guid, name: predictor.name,
      accountGuid: 'account-a', facilityGuid: 'facility-a'
    });
    const findings = presentFindings(predictors.flatMap(predictor => [
      makeFinding('predictor.weather.warning', 'warning', 'quality', entity(predictor)),
      makeFinding('predictor.currency.stale', 'warning', 'currency', entity(predictor), {
        latestPeriod: '2025-12', thresholdMonths: 3
      })
    ]));

    const fixture = setup(predictors, [], vi.fn(), findings);
    const status = fixture.nativeElement.querySelector('.weather-readings__status') as HTMLElement;

    expect(status.textContent).toContain('4 checks across 2 predictors');
    expect(status.textContent).toContain('Update stale predictor data');
    expect(status.textContent).toContain('Review weather data');
    expect(status.textContent).toContain('2 predictors: HDD 55, Humidity');
    expect(status.querySelectorAll('li')).toHaveLength(2);
  });

  it('paginates monthly readings in one-, two-, and three-year page sizes', () => {
    const predictors = [weatherPredictor()];
    const readings = weatherReadings(30);
    const fixture = setup(predictors, readings);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('tbody tr')).toHaveLength(12);
    expect(root.querySelector('ngb-pagination')).not.toBeNull();

    const pageSize = root.querySelector<HTMLSelectElement>('.weather-readings__control select')!;
    expect(Array.from(pageSize.options).map(option => option.textContent?.trim())).toEqual(['12', '24', '36']);
    pageSize.value = pageSize.options[1].value;
    pageSize.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.currentPage()).toBe(1);
    expect(root.querySelectorAll('tbody tr')).toHaveLength(24);
    expect(root.querySelector('ngb-pagination')).not.toBeNull();
  });

  it('filters the table to months that need attention and resets pagination', () => {
    const readings = weatherReadings(14).map((reading, index) => ({
      ...reading,
      weatherDataWarning: index === 1 || index === 12
    }));
    const fixture = setup([weatherPredictor()], readings);
    const root = fixture.nativeElement as HTMLElement;
    fixture.componentInstance.setCurrentPage(2);
    const filter = root.querySelectorAll<HTMLSelectElement>('.weather-readings__control select')[1];

    filter.value = 'attention';
    filter.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.currentPage()).toBe(1);
    expect(root.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(root.querySelectorAll('.weather-readings__source-warning')).toHaveLength(2);
    expect(root.querySelector('ngb-pagination')).toBeNull();
  });

  it('copies the displayed table without the row action column', () => {
    vi.useFakeTimers();
    try {
      const copyTable = vi.fn();
      const fixture = setup([weatherPredictor()], [weatherReading(1)], copyTable);
      const root = fixture.nativeElement as HTMLElement;
      const copyButton = Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
        .find(button => button.textContent?.includes('Copy Table'))!;

      copyButton.click();
      fixture.detectChanges();
      expect(root.querySelector('.weather-readings__actions')).toBeNull();

      vi.advanceTimersByTime(200);
      expect(copyTable).toHaveBeenCalledOnce();
      expect((copyTable.mock.calls[0][0] as { nativeElement: HTMLTableElement }).nativeElement.tagName).toBe('TABLE');
    } finally {
      vi.useRealTimers();
    }
  });

  it('loads calculated station values when an add month is selected', async () => {
    const predictors = [weatherPredictor()];
    const fixture = setup(predictors, []);
    const workflow = TestBed.inject(PredictorWeatherWorkflowService) as any;
    workflow.calculateStationMonth.mockResolvedValue([{
      predictorGuid: 'hdd', amount: 18, weatherDataWarning: true
    }]);

    fixture.componentInstance.openAdd();
    await fixture.componentInstance.calculateMonth({ year: 2026, month: 2 });

    expect(workflow.calculateStationMonth).toHaveBeenCalledWith(predictors, { year: 2026, month: 2 });
    expect(fixture.componentInstance.calculatedValues()).toEqual([{
      predictorGuid: 'hdd', amount: 18, weatherDataWarning: true
    }]);
    expect(fixture.componentInstance.calculating()).toBe(false);
  });

  it('opens a source-reading chart slideout from an incomplete-data warning', () => {
    const predictor = weatherPredictor();
    const fixture = setup([predictor], [{
      ...weatherReading(1), weatherDataWarning: true
    }]);
    const root = fixture.nativeElement as HTMLElement;
    const warning = root.querySelector<HTMLButtonElement>('[aria-label="View source-data gaps for HDD 55 in Jan 2025"]')!;

    warning.click();
    fixture.detectChanges();

    const slideout = fixture.debugElement.query(By.directive(WeatherSourceReadingsSlideoutStubComponent));
    expect(slideout).not.toBeNull();
    expect(slideout.componentInstance.predictor).toBe(predictor);
    expect(slideout.componentInstance.month).toEqual({ year: 2025, month: 1 });

    slideout.componentInstance.closed.emit();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-weather-source-readings-slideout')).toBeNull();
  });

  it('opens and cancels month deletion through the modal portal', () => {
    const fixture = setup([weatherPredictor()], [weatherReading(1)]);
    const modalPortal = TestBed.inject(ModalPortalService) as any;
    const row = fixture.componentInstance.matrix().rows[0];

    fixture.componentInstance.requestDelete(row);

    expect(fixture.componentInstance.deleteRow()).toBe(row);
    expect(modalPortal.show).toHaveBeenCalledOnce();

    fixture.componentInstance.cancelDelete();

    expect(fixture.componentInstance.deleteRow()).toBeUndefined();
    expect(modalPortal.hide).toHaveBeenCalledOnce();
  });

  it('shows the stored reading range beside the add month action', () => {
    const fixture = setup([weatherPredictor()], [weatherReading(2), weatherReading(5)]);
    const root = fixture.nativeElement as HTMLElement;
    const inputs = root.querySelectorAll<HTMLInputElement>('.weather-readings__range-control input');
    const rangeActions = root.querySelector('.weather-readings__range-actions')!;

    expect(inputs[0].value).toBe('2025-02');
    expect(inputs[1].value).toBe('2025-05');
    expect(rangeActions.textContent).toContain('Save and Update Readings');
    expect(rangeActions.textContent).toContain('Add month');
  });

  it('keeps range controls inert when the workspace is read-only', () => {
    const fixture = setup([weatherPredictor()], [weatherReading(2), weatherReading(5)], vi.fn(), [], {}, {
      canWrite: false
    });
    const component = fixture.componentInstance;
    const inputs = (fixture.nativeElement as HTMLElement)
      .querySelectorAll<HTMLInputElement>('.weather-readings__range-control input');
    const initialStart = component.startMonth();

    expect(Array.from(inputs).every(input => input.disabled)).toBe(true);
    inputs[0].value = '2024-01';
    inputs[0].dispatchEvent(new Event('change'));

    expect(component.startMonth()).toBe(initialStart);
    expect(component.rangeDirty()).toBe(false);
  });

  it('reviews and commits a date-range reading update for the station', async () => {
    const preview = {
      workspaceRevision: 1,
      station: { ID: 'station-a', name: 'Station A' },
      range: { start: { year: 2025, month: 1 }, end: { year: 2025, month: 3 } },
      addPredictors: [], updatePredictors: [], deletePredictors: [],
      addReadings: [{}], updateReadings: [{}], deleteReadings: [], facilityAnalyses: [], warningMonths: []
    };
    const previewStationGroup = vi.fn(async () => preview);
    const commitStationGroup = vi.fn(async () => undefined);
    const fixture = setup([weatherPredictor()], [weatherReading(1)], vi.fn(), [], {
      previewStationGroup, commitStationGroup
    });
    const component = fixture.componentInstance;

    component.setEndMonth('2025-03');
    await component.reviewRangeUpdate();

    expect(previewStationGroup).toHaveBeenCalledWith(expect.objectContaining({
      sourceGroupKey: 'station:A',
      station: expect.objectContaining({ ID: 'station-a' }),
      range: { start: { year: 2025, month: 1 }, end: { year: 2025, month: 3 } },
      definitions: [expect.objectContaining({ predictorGuid: 'hdd', weatherDataType: 'HDD' })]
    }), [expect.objectContaining({ guid: 'hdd' })], [expect.objectContaining({ guid: 'reading-1' })]);
    expect(component.rangePreview()).toBe(preview);

    await component.confirmRangeUpdate();

    expect(commitStationGroup).toHaveBeenCalledWith(preview);
    expect(component.rangeUpdateCompleted()).toBe(true);
    expect(component.rangeDirty()).toBe(false);
  });

  it('allows future end months and explains how their zero readings are handled', () => {
    const fixture = setup([weatherPredictor()], [weatherReading(1)]);
    fixture.componentInstance.setEndMonth(relativeMonthInput(2));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("We can't predict the future");
    expect(fixture.nativeElement.textContent).toContain('future months will be saved as 0');
    expect(fixture.componentInstance.canUpdateRange()).toBe(true);
  });

  it('merges independent saved range endpoints while keeping view preferences outside draft dirtiness', () => {
    const fixture = setup([weatherPredictor()], [weatherReading(1)]);
    const component = fixture.componentInstance;
    component.setPageSize('24'); component.setRowFilter('attention');
    expect(component.rangeDirty()).toBe(false);
    component.setEndMonth('2025-03');
    const context = TestBed.inject(WeatherPredictorWorkbenchContextService);
    (context.readings as WritableSignal<any[]>).set([{ ...weatherReading(12), year: 2024 }, weatherReading(1)]);
    fixture.detectChanges();
    expect(component.startMonth()).toBe('2024-12');
    expect(component.endMonth()).toBe('2025-03');
    expect(component.rangeConflicts()).toHaveLength(0);
    expect(component.rangeDirty()).toBe(true);
    expect(component.pageSize()).toBe(24);
    expect(TestBed.inject(PredictorWeatherWorkflowService).previewStationGroup).not.toHaveBeenCalled();
  });

  it('reviews conflicting range endpoints and invalidates reviewed updates on committed revisions', async () => {
    const preview = { workspaceRevision: 1, station: {}, addPredictors: [], updatePredictors: [], deletePredictors: [],
      addReadings: [], updateReadings: [], deleteReadings: [], warningMonths: [] };
    const fixture = setup([weatherPredictor()], [weatherReading(1)], vi.fn(), [], { previewStationGroup: vi.fn(async () => preview) });
    const component = fixture.componentInstance;
    component.setEndMonth('2025-03');
    const context = TestBed.inject(WeatherPredictorWorkbenchContextService);
    (context.readings as WritableSignal<any[]>).set([weatherReading(1), weatherReading(5)]); fixture.detectChanges();
    expect(component.rangeConflicts()).toHaveLength(1);
    component.resolveRangeConflicts({ [component.rangeConflicts()[0].id]: 'local' }); fixture.detectChanges();
    expect(component.endMonth()).toBe('2025-03');
    await component.reviewRangeUpdate();
    expect(component.rangePreview()).toBe(preview);
    (TestBed.inject(FacilityPredictorsWorkspaceService).revision as WritableSignal<number>).set(2); fixture.detectChanges();
    expect(component.rangePreview()).toBeUndefined(); expect(component.rangeDirty()).toBe(true);
  });

  it('continues merging untouched saved range endpoints while another endpoint remains conflicted', () => {
    const fixture = setup([weatherPredictor()], [weatherReading(1)]);
    const component = fixture.componentInstance; component.setEndMonth('2025-03');
    const readings = TestBed.inject(WeatherPredictorWorkbenchContextService).readings as WritableSignal<any[]>;
    readings.set([{ ...weatherReading(12), year: 2024 }, weatherReading(5)]); fixture.detectChanges();
    expect(component.rangeConflicts()).toHaveLength(1);
    readings.set([{ ...weatherReading(11), year: 2024 }, weatherReading(5)]); fixture.detectChanges();
    expect(component.rangeConflicts()).toHaveLength(1);
    expect(component.startMonth()).toBe('2024-11'); expect(component.endMonth()).toBe('2025-03');
    component.resolveRangeConflicts({ [component.rangeConflicts()[0].id]: 'local' });
    expect(component.startMonth()).toBe('2024-11'); expect(component.endMonth()).toBe('2025-03');
  });

  it('keeps range edits when cancelling or confirming replacement of a dirty month', () => {
    const fixture = setup([weatherPredictor()], [weatherReading(1)]);
    const component = fixture.componentInstance;
    component.setEndMonth('2025-03'); component.openEdit(component.matrix().rows[0]); fixture.detectChanges();
    const editor = fixture.debugElement.query(By.directive(WeatherReadingMonthEditorComponent)).componentInstance as WeatherReadingMonthEditorComponent;
    editor.setValue('hdd', '99');
    component.openAdd();
    expect(component.pendingReplacement()?.kind).toBe('add'); expect(component.editor()?.mode).toBe('edit');
    component.cancelEditorReplacement(); expect(editor.values()['hdd']).toBe('99');
    component.openAdd(); component.confirmEditorReplacement(); fixture.detectChanges();
    expect(component.editor()?.mode).toBe('add'); expect(component.endMonth()).toBe('2025-03'); expect(component.rangeDirty()).toBe(true);
    expect(fixture.debugElement.query(By.directive(WeatherReadingMonthEditorComponent)).componentInstance.month()).toBe('');
  });

  it('ignores late calculations when committed predictor definitions change', async () => {
    let complete!: (values: any[]) => void;
    const fixture = setup([weatherPredictor()], [], vi.fn(), [], {
      calculateStationMonth: vi.fn(() => new Promise(resolve => { complete = resolve; }))
    });
    const component = fixture.componentInstance; component.openAdd();
    const pending = component.calculateMonth({ year: 2026, month: 2 });
    const context = TestBed.inject(WeatherPredictorWorkbenchContextService);
    (context.predictors as WritableSignal<any[]>).set([{ ...weatherPredictor(), heatingBaseTemperature: 70 }]); fixture.detectChanges();
    complete([{ predictorGuid: 'hdd', amount: 100, weatherDataWarning: false }]); await pending;
    expect(component.calculatedValues()).toEqual([]); expect(component.calculating()).toBe(false);
  });

  it('retains an externally removed month draft and prevents save from recreating it', async () => {
    const fixture = setup([weatherPredictor()], [weatherReading(1)]);
    const component = fixture.componentInstance; component.openEdit(component.matrix().rows[0]); fixture.detectChanges();
    const editor = fixture.debugElement.query(By.directive(WeatherReadingMonthEditorComponent)).componentInstance as WeatherReadingMonthEditorComponent;
    editor.setValue('hdd', '99');
    (TestBed.inject(WeatherPredictorWorkbenchContextService).readings as WritableSignal<any[]>).set([]); fixture.detectChanges();
    expect(component.editorUnavailable()).toBe(true); expect(editor.values()['hdd']).toBe('99');
    await component.saveMonth({ year: 2025, month: 1, values: [{ predictorGuid: 'hdd', amount: 99 }] });
    expect(TestBed.inject(WeatherPredictorActionsService).applyWeatherStationMonth).not.toHaveBeenCalled();
  });

  it('resets old-owner save state and ignores a late month commit completion', async () => {
    let complete!: () => void;
    const fixture = setup([weatherPredictor()], [weatherReading(1)]);
    vi.mocked(TestBed.inject(WeatherPredictorActionsService).applyWeatherStationMonth)
      .mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    const component = fixture.componentInstance; component.openEdit(component.matrix().rows[0]); fixture.detectChanges();
    const pending = component.saveMonth({ year: 2025, month: 1, values: [{ predictorGuid: 'hdd', amount: 99 }] });
    expect(component.saving()).toBe(true);
    (TestBed.inject(FacilityPredictorsWorkspaceService).facility as WritableSignal<any>).set({ guid: 'other-facility' }); fixture.detectChanges();
    expect(component.saving()).toBe(false); expect(component.canAct()).toBe(true); expect(component.editor()).toBeUndefined();
    complete(); await pending;
    expect(component.saving()).toBe(false); expect(component.canAct()).toBe(true);
  });
});

function setup(
  predictors: any[],
  readings: any[],
  copyTable = vi.fn(),
  statusFindings: any[] = [],
  workflowOverrides: Record<string, unknown> = {},
  workspaceOverrides: { canWrite?: boolean; hasPending?: boolean } = {}
) {
  const group = signal({
    routeKey: 'station:A', stationId: 'station-a', stationName: 'Station A', predictors, statusFindings
  });
  TestBed.configureTestingModule({
    imports: [WeatherPredictorReadingsComponent],
    providers: [
      { provide: FacilityPredictorsWorkspaceService, useValue: {
        account: signal({ guid: 'a' }), facility: signal({ guid: 'f' }),
        canWrite: signal(workspaceOverrides.canWrite ?? true),
        hasPending: signal(workspaceOverrides.hasPending ?? false),
        revision: signal(1),
        defaultWeatherRange: signal({ start: { year: 2025, month: 1 }, end: { year: 2025, month: 12 } })
      } },
      {
        provide: WeatherPredictorWorkbenchContextService,
        useValue: {
          group, groupKey: computed(() => group()?.routeKey ?? 'station:A'), predictors: signal(predictors), readings: signal(readings),
          creating: signal(false), notFound: signal(false)
        }
      },
      { provide: WeatherPredictorActionsService, useValue: { applyWeatherStationMonth: vi.fn() } },
      { provide: PredictorWeatherWorkflowService, useValue: {
        calculateStationMonth: vi.fn(), previewStationGroup: vi.fn(), commitStationGroup: vi.fn(),
        cancel: vi.fn(), reset: vi.fn(), busy: signal(false), state: signal({ status: 'idle', message: '' }),
        ...workflowOverrides
      } },
      { provide: UnsavedChangesService, useValue: { register: vi.fn(() => vi.fn()), protectBeforeUnload: vi.fn(() => vi.fn()), confirmDiscard: vi.fn() } },
      { provide: ModalPortalService, useValue: { show: vi.fn(), hide: vi.fn() } },
      { provide: CopyTableService, useValue: { copyTable } }
    ]
  });
  TestBed.overrideComponent(WeatherPredictorReadingsComponent, {
    remove: { imports: [WeatherSourceReadingsSlideoutComponent] },
    add: { imports: [WeatherSourceReadingsSlideoutStubComponent] }
  });
  const fixture = TestBed.createComponent(WeatherPredictorReadingsComponent);
  fixture.detectChanges();
  return fixture;
}

@Component({
  selector: 'app-weather-source-readings-slideout',
  template: '',
  standalone: true
})
class WeatherSourceReadingsSlideoutStubComponent {
  @Input({ required: true }) predictor!: IdbPredictor;
  @Input({ required: true }) month!: WeatherMonth;
  @Input({ required: true }) monthLabel = '';
  @Output() readonly closed = new EventEmitter<void>();
}

function weatherPredictor() {
  return { guid: 'hdd', name: 'HDD 55', predictorType: 'Weather', weatherDataType: 'HDD', accountId: 'a', facilityId: 'f' };
}

function weatherReading(month: number) {
  return {
    id: month, guid: `reading-${month}`, predictorId: 'hdd', accountId: 'a', facilityId: 'f',
    year: 2025, month, amount: month, weatherDataWarning: false, weatherOverride: false
  };
}

function weatherReadings(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    ...weatherReading(index % 12 + 1),
    id: index + 1,
    guid: `reading-${index + 1}`,
    year: 2024 + Math.floor(index / 12)
  }));
}

function relativeMonthInput(offset: number): string {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
