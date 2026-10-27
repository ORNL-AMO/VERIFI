import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { accountReportSnapshot } from '../../../testing/account-report-test-fixtures';
import { setupAccountReportWorkbench } from '../../../testing/account-report-workbench-test-setup';

describe('Better Plants reporting period', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('keeps the moved period controls connected to the report draft and preserves an unavailable saved year', async () => {
    const snapshot = accountReportSnapshot();
    snapshot.accountReports[0].reportType = 'betterPlants';
    snapshot.accountReports[0].betterPlantsReportSetup.analysisItemId = 'account-analysis';
    const { open, harness, updateSetup } = await setupAccountReportWorkbench(snapshot, [
      { provide: WorkspaceCalendarizationService, useValue: { calendarizeBase: () => of({ state: 'ready', meters: [] }), project: () => ({ state: 'ready', meters: [] }) } }
    ]);
    const workbench = await open();
    const period = harness.routeNativeElement!.querySelector('app-better-plants-reporting-period')!;
    expect(period.textContent).toContain('2018');
    const year = period.querySelector<HTMLSelectElement>('#better-plants-report-year')!;
    expect(year.selectedOptions[0].textContent).toContain('2024 — saved year unavailable');
    year.selectedIndex = 0; year.dispatchEvent(new Event('change')); harness.detectChanges();
    expect(workbench.editor.form.controls.betterPlants.controls.reportYear.value).toBeNull();
    expect(workbench.editor.setupValid()).toBe(false);
    period.querySelector<HTMLInputElement>('input[formcontrolname="includeAllYears"]')!.click();
    expect(workbench.editor.form.controls.betterPlants.controls.includeAllYears.value).toBe(true);
    expect(updateSetup).not.toHaveBeenCalled();
    workbench.editor.discard();
  });
});
