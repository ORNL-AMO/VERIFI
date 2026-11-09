import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { RegressionModelStateService } from '@data/account-workspace/regression-model-state.service';
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { SharedDataService } from '@shared/helper-services/shared-data.service';
import { CalanderizationService } from '@shared/helper-services/calanderization.service';
import { AccountStatusCheckService } from '@shared/helper-services/account-status-check.service';
import { RegressionModelsService } from '@shared/shared-analysis/calculations/regression-models.service';
import { RegressionModelMenuComponent } from './regression-model-menu.component';

@NgModule({
  declarations: [RegressionModelMenuComponent], imports: [CommonModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
class RegressionMenuNativeTestModule { }

function facilityCheck(valid: boolean) {
  return {
    getGroupStatusChecksByGroupId: () => ({
      status: valid ? 'good' : 'error', hasMeterSetupErrors: false, hasPredictorSetupErrors: false,
      groupAnalysisErrors: { isDateRangeValid: valid, isTwelveMonthSelected: valid, allMeterReadingsPresent: valid }
    })
  };
}

describe('Regression model editor controls in Chromium', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('retains the actual notes draft, focus, and caret while checks load, fail, and recover', async () => {
    const group = {
      idbGroupId: 'group-a', analysisType: 'regression', isGeneratedModel: false, maxModelVariables: 1,
      regressionConstant: 10, regressionModelNotes: 'Saved notes',
      regressionModelStartMonth: 0, regressionStartYear: 2023, regressionModelEndMonth: 11, regressionEndYear: 2023,
      predictorVariables: [{ id: 'predictor-a', name: 'Production', production: true, productionInAnalysis: true, regressionCoefficient: 2 }]
    };
    const analysis = { guid: 'analysis-a', accountId: 'account-a', facilityId: 'facility-a', baselineYear: 2023, groups: [group] };
    const facility = { guid: 'facility-a', accountId: 'account-a', fiscalYear: 'calendarYear' };
    const store = new AccountWorkspaceStore();
    store.publish({
      account: { guid: 'account-a' }, facilities: [facility], facilityAnalyses: [analysis],
      meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [], accountAnalyses: [],
      accountReports: [], facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [],
      energyUseGroups: [], energyUseEquipment: []
    } as unknown as AccountWorkspaceSnapshot, { facility: facility as any, facilityAnalysis: analysis as any });
    const checks = new BehaviorSubject<any>(facilityCheck(true));
    const calendarization = new BehaviorSubject<any>({ status: 'ready' });
    const execute = vi.fn(async () => ({ value: analysis }));
    await TestBed.configureTestingModule({ imports: [RegressionMenuNativeTestModule], providers: [
      { provide: AccountWorkspaceStore, useValue: store },
      { provide: AnalysisService, useValue: { selectedGroup: new BehaviorSubject(group) } },
      { provide: WorkspaceCommandBoundary, useValue: { execute } },
      { provide: AnalysisCommandHandler, useValue: { updateFacilityAnalysisGroup: vi.fn(async () => analysis) } },
      { provide: RegressionModelStateService, useValue: { modelsByGroup: signal({}), setForGroup: vi.fn() } },
      { provide: SharedDataService, useValue: {} },
      { provide: CalanderizationService, useValue: { calanderizedMeters: new BehaviorSubject([]) } },
      { provide: AccountStatusCheckService, useValue: { selectedFacilityStatusCheck$: checks, calendarizationState: calendarization } },
      { provide: RegressionModelsService, useValue: { terminateCurrentWorker: vi.fn() } }
    ] }).compileComponents();
    const fixture = TestBed.createComponent(RegressionModelMenuComponent);
    TestBed.flushEffects();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(execute).not.toHaveBeenCalled();

    // Keep an unfinished numeric draft so typing notes remains local throughout this check.
    const constant = fixture.nativeElement.querySelector('#regressionConstant') as HTMLInputElement;
    constant.value = '';
    constant.dispatchEvent(new Event('input', { bubbles: true }));
    const notes = fixture.nativeElement.querySelector('#regressionModelNotes') as HTMLTextAreaElement;
    notes.value = 'Unfinished draft notes';
    notes.dispatchEvent(new Event('input', { bubbles: true }));
    notes.focus();
    notes.setSelectionRange(2, 7);
    fixture.detectChanges();

    const expectRetained = () => {
      expect(fixture.nativeElement.querySelector('#regressionModelNotes')).toBe(notes);
      expect(notes.value).toBe('Unfinished draft notes');
      expect(document.activeElement).toBe(notes);
      expect(notes.selectionStart).toBe(2);
      expect(notes.selectionEnd).toBe(7);
      expect(fixture.componentInstance.form.controls.regressionModelNotes.value).toBe('Unfinished draft notes');
      expect(fixture.componentInstance.form.controls.regressionConstant.value).toBeNull();
    };
    const expectNoUnverifiedWarning = () => {
      expect(fixture.nativeElement.textContent).not.toContain('End date must be after');
      expect(fixture.nativeElement.textContent).not.toContain('Model generation requires at least 12 months');
      expect(fixture.nativeElement.textContent).not.toContain('Meter data is missing');
    };

    checks.next(undefined);
    calendarization.next({ status: 'loading' });
    fixture.detectChanges();
    expectRetained();
    expectNoUnverifiedWarning();

    checks.next(facilityCheck(false));
    fixture.detectChanges();
    expectRetained();
    expect(fixture.nativeElement.textContent).toContain('End date must be after');

    checks.next(undefined);
    calendarization.next({ status: 'error' });
    fixture.detectChanges();
    expectRetained();
    expectNoUnverifiedWarning();

    checks.next(facilityCheck(true));
    calendarization.next({ status: 'ready' });
    fixture.detectChanges();
    expectRetained();
    expectNoUnverifiedWarning();
    expect(execute).not.toHaveBeenCalled();
    expect(store.selectedFacilityAnalysis().groups[0].regressionModelNotes).toBe('Saved notes');
    expect(store.selectedFacilityAnalysis().groups[0].regressionConstant).toBe(10);
  });
});
