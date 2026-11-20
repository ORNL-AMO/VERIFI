import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FacilityModelingReportService } from '../modeling-report.service';
import { ModelingReportModule } from '../modeling-report.module';
import { ModelingReportPreviewComponent } from './modeling-report-preview.component';
import { ReportPresentationController } from '@app/v1/reports/shared/presentation/report-presentation-controller';
import { ModelingReportView, buildModelingReport } from '@domain/reports/modeling-report';
import { modelingExportFixture } from '@app/v1/reports/shared/modeling/testing/modeling-report-export-fixture';

describe('Modeling report preview recovery', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('announces a processing error and delegates retry to the report session', async () => {
    const retry = vi.fn();
    await TestBed.configureTestingModule({ imports: [ModelingReportModule], providers: [ReportPresentationController,
      { provide: FacilityModelingReportService, useValue: { context: { report: () => ({ name: 'Plant modeling' }) },
        view: signal(undefined), state: signal({ state: 'error', message: 'Model checks failed' }), retry } }
    ] }).compileComponents();
    const fixture = TestBed.createComponent(ModelingReportPreviewComponent); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Model checks failed');
    fixture.nativeElement.querySelector('button').click(); expect(retry).toHaveBeenCalledOnce();
  });

  it('offers presentation only for current selected content, including missing-model and empty-group diagnostics', async () => {
    const initial = modelingExportFixture().view;
    const view = signal<ModelingReportView | undefined>(initial), state = signal({ state: 'ready', message: '' });
    await TestBed.configureTestingModule({ imports: [ModelingReportModule], providers: [ReportPresentationController,
      { provide: FacilityModelingReportService, useValue: { context: { report: () => ({ name: 'Plant modeling' }) }, view, state } }
    ] }).compileComponents();
    const fixture = TestBed.createComponent(ModelingReportPreviewComponent); fixture.detectChanges(); await fixture.whenStable();
    const presentation = TestBed.inject(ReportPresentationController);
    expect(presentation.available()).toBe(true);
    for (const readiness of ['waiting', 'loading', 'error']) {
      state.set({ state: readiness, message: 'Report is unavailable' }); fixture.detectChanges();
      expect(presentation.available()).toBe(false);
    }
    state.set({ state: 'ready', message: '' }); view.set(undefined); fixture.detectChanges();
    expect(presentation.available()).toBe(false);
    view.set({ ...initial, hasContent: false, settings: { includeIssuesSummary: false, includeExecutiveSummary: false, includeDataValidationTables: false } });
    fixture.detectChanges(); expect(presentation.available()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('No sections are selected.');
    view.set(buildModelingReport({ reportYear: 2023, groups: [], hasBlockingErrors: true }, initial.settings, { facilities: {}, groups: {} }));
    fixture.detectChanges(); expect(presentation.available()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('No included analysis groups are available.');
    view.set(buildModelingReport({ reportYear: 2023, hasBlockingErrors: true,
      groups: [{ ...initial.groups[0], model: undefined, critical: ['Select an available regression model.'] }] }, initial.settings,
      { facilities: {}, groups: { group: 'Main meters' } }));
    fixture.detectChanges(); expect(presentation.available()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Select an available regression model.');
    expect(fixture.nativeElement.textContent).toContain('Model unavailable');
  });
});
