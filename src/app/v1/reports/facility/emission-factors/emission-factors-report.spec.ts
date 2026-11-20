import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { emissionFactorsRates, emissionFactorsSnapshot } from '@domain/reports/testing/emission-factors-fixtures';
import { setupReportWorkbench } from '../testing/report-workbench-test-setup';
import { EmissionFactorsReportEditor } from './editing/emission-factors-report-editor.service';
import { EmissionFactorsReportService } from './emission-factors-report.service';

describe('facility Emission Factors workbench', () => {
  async function setup() {
    const snapshot = emissionFactorsSnapshot();
    return setupReportWorkbench(snapshot.facilityReports, [
      { provide: EGridService, useValue: { builtinEmissions: () => emissionFactorsRates() } },
      { provide: WorkspaceCalendarizationService, useValue: { calendarizeBase: () => of({ state: 'idle', meters: [] }), retry: vi.fn() } }
    ], snapshot);
  }
  it('keeps the runtime across stages, flushes edits, and registers PDF/presentation without checks', async () => {
    const { open, harness, updateSetup } = await setup(); const workbench = await open();
    const session = workbench.workbench.session()!, editor = session.injector.get(EmissionFactorsReportEditor);
    expect(workbench.workbench.stages().map(stage => stage.id)).toEqual(['setup', 'report']);
    expect(session.runtime.output!.formats).toEqual(['pdf']); expect(session.runtime.presentation).toBeDefined();
    expect(session.runtime.checks).toBeUndefined(); expect(session.runtime.output!.available()).toBe(false);
    expect(updateSetup).not.toHaveBeenCalled(); editor.name.setValue('Updated factors');
    await open('report-a', 'report'); await vi.waitFor(() => { harness.detectChanges(); expect(harness.routeNativeElement!.querySelectorAll('table')).toHaveLength(2); });
    expect(updateSetup).toHaveBeenCalledOnce(); expect(workbench.workbench.session()).toBe(session);
    expect(harness.routeNativeElement!.textContent).toContain('Updated factors');
    expect(session.runtime.output!.available()).toBe(true);
    await open(); expect(workbench.workbench.session()).toBe(session);
    expect(editor.name.value).toBe('Updated factors');
  });
  it('blocks progression for equal years and renders explanatory feedback on direct Report entry', async () => {
    const { open, harness, store } = await setup();
    const snapshot = store.snapshot()!, report = snapshot.facilityReports[0];
    store.publish({ ...snapshot, facilityReports: [{ ...report, emissionFactorsReportSettings: { startYear: 2024, endYear: 2024 } }] }, { facility: snapshot.facilities[0] });
    const workbench = await open('report-a', 'report'); harness.detectChanges(); TestBed.tick(); harness.detectChanges();
    expect(workbench.workbench.session()!.injector.get(EmissionFactorsReportService).state().state).toBe('error');
    expect(harness.routeNativeElement!.querySelector('table')).toBeNull();
    await open(); expect(workbench.workbench.canContinue()).toBe(false);
  });
});
