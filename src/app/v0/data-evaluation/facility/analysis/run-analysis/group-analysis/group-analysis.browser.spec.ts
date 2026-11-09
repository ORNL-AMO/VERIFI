import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule, Pipe, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideRouter, RouterModule } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BehaviorSubject } from 'rxjs';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { RegressionModelStateService } from '@data/account-workspace/regression-model-state.service';
import { AnalysisGroup } from '@data/models/analysis';
import { AccountStatusCheckService } from '@shared/helper-services/account-status-check.service';
import { CalanderizationService } from '@shared/helper-services/calanderization.service';
import { SharedDataService } from '@shared/helper-services/shared-data.service';
import { RegressionModelsService } from '@shared/shared-analysis/calculations/regression-models.service';
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { GroupAnalysisComponent } from './group-analysis.component';
import { GroupAnalysisOptionsComponent } from './group-analysis-options/group-analysis-options.component';
import { RegressionModelMenuComponent } from './regression-model-selection/regression-model-menu/regression-model-menu.component';

@Pipe({ name: 'monthLabel', standalone: false })
export class NativeMonthLabelPipe { transform(value: unknown) { return value; } }
@Pipe({ name: 'settingsLabel', standalone: false })
export class NativeSettingsLabelPipe { transform(value: unknown, ..._args: unknown[]) { return value; } }
@Pipe({ name: 'yearDisplay', standalone: false })
export class NativeYearDisplayPipe { transform(value: unknown, ..._args: unknown[]) { return value; } }

@NgModule({
  declarations: [GroupAnalysisComponent, RegressionModelMenuComponent, GroupAnalysisOptionsComponent,
    NativeMonthLabelPipe, NativeSettingsLabelPipe, NativeYearDisplayPipe],
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule], schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
class GroupAnalysisNativeTestModule { }

function facilityCheck(valid = true) {
  return {
    getGroupStatusChecksByGroupId: () => ({
      status: valid ? 'good' : 'error', hasMeterSetupErrors: false, hasPredictorSetupErrors: false,
      groupAnalysisErrors: {
        isDateRangeValid: valid, isTwelveMonthSelected: valid, allMeterReadingsPresent: valid,
        noProductionVariables: false, missingProductionVariables: false,
        invalidAverageBaseload: false, invalidMonthlyBaseload: false
      }
    })
  };
}

async function openEditor(analysisType: AnalysisGroup['analysisType'], path: 'model-selection' | 'options', monthlyBaseload = false) {
  const group = {
    idbGroupId: 'group-a', analysisType, isGeneratedModel: false, maxModelVariables: 1,
    regressionConstant: 10, regressionModelNotes: 'Saved model notes',
    regressionModelStartMonth: 0, regressionStartYear: 2023, regressionModelEndMonth: 11, regressionEndYear: 2023,
    predictorVariables: [{ id: 'predictor-a', name: 'Production', production: true, productionInAnalysis: true, regressionCoefficient: 2 }],
    specifiedMonthlyPercentBaseload: monthlyBaseload, averagePercentBaseload: 25,
    monthlyPercentBaseload: [{ monthNum: 0, percent: 25 }], dataAdjustments: [], baselineAdjustmentsV2: []
  };
  const analysis = { guid: 'analysis-a', accountId: 'account-a', facilityId: 'facility-a', analysisCategory: 'energy', energyUnit: 'MMBtu', baselineYear: 2023, groups: [group] };
  const facility = { guid: 'facility-a', accountId: 'account-a', fiscalYear: 'calendarYear' };
  const store = new AccountWorkspaceStore();
  store.publish({
    account: { guid: 'account-a' }, facilities: [facility], facilityAnalyses: [analysis],
    meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [], accountAnalyses: [],
    accountReports: [], facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [],
    energyUseGroups: [], energyUseEquipment: []
  } as unknown as AccountWorkspaceSnapshot, { facility: facility as any, facilityAnalysis: analysis as any });
  const checks = new BehaviorSubject<any>(facilityCheck());
  const calendarization = new BehaviorSubject<any>({ status: 'ready' });
  const execute = vi.fn(async () => ({ value: analysis }));
  await TestBed.configureTestingModule({ imports: [GroupAnalysisNativeTestModule], providers: [
    provideRouter([{ path: 'group/:id', component: GroupAnalysisComponent, children: [
      { path: 'model-selection', component: RegressionModelMenuComponent },
      { path: 'options', component: GroupAnalysisOptionsComponent }
    ] }]),
    { provide: AccountWorkspaceStore, useValue: store },
    { provide: AccountWorkspaceQueryService, useValue: { getMeterGroupName: () => 'Group A', getFacilityAnalysisByGuid: () => undefined } },
    { provide: AnalysisService, useValue: { selectedGroup: new BehaviorSubject(group), hideInUseMessage: new BehaviorSubject(false) } },
    { provide: WorkspaceCommandBoundary, useValue: { execute } },
    { provide: AnalysisCommandHandler, useValue: { updateFacilityAnalysisGroup: vi.fn(async () => analysis) } },
    { provide: RegressionModelStateService, useValue: { modelsByGroup: signal({}), setForGroup: vi.fn() } },
    { provide: SharedDataService, useValue: {} },
    { provide: CalanderizationService, useValue: { calanderizedMeters: new BehaviorSubject([]) } },
    { provide: AccountStatusCheckService, useValue: { selectedFacilityStatusCheck$: checks, calendarizationState: calendarization, retryCalendarization: vi.fn() } },
    { provide: RegressionModelsService, useValue: { terminateCurrentWorker: vi.fn() } }
  ] }).compileComponents();
  const harness = await RouterTestingHarness.create('/group/group-a/' + path);
  await harness.fixture.whenStable();
  harness.detectChanges();
  return { harness, checks, calendarization, execute, store };
}

describe('Facility analysis editor lifetime in Chromium', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('retains real routed model controls, form values, focus, and caret while checks load, fail, and recover', async () => {
    const { harness, checks, calendarization, execute, store } = await openEditor('regression', 'model-selection');
    const menu = harness.routeDebugElement!.query(By.directive(RegressionModelMenuComponent)).componentInstance as RegressionModelMenuComponent;
    const control = menu.form.controls.regressionModelNotes;
    const constantControl = menu.form.controls.regressionConstant;
    expect(execute).not.toHaveBeenCalled();

    // Preserve an unfinished numeric draft as well as typed notes across check refreshes.
    const constant = harness.routeNativeElement!.querySelector('#regressionConstant') as HTMLInputElement;
    constant.value = '';
    constant.dispatchEvent(new Event('input', { bubbles: true }));
    const notes = harness.routeNativeElement!.querySelector('#regressionModelNotes') as HTMLTextAreaElement;
    notes.value = 'Unfinished draft notes';
    notes.dispatchEvent(new Event('input', { bubbles: true }));
    notes.focus();
    notes.setSelectionRange(2, 7);
    harness.detectChanges();
    await harness.fixture.whenStable();
    const writesBeforeRefresh = execute.mock.calls.length;

    const expectRetained = () => {
      expect(harness.routeDebugElement!.query(By.directive(RegressionModelMenuComponent)).componentInstance).toBe(menu);
      expect(menu.form.controls.regressionModelNotes).toBe(control);
      expect(harness.routeNativeElement!.querySelector('#regressionModelNotes')).toBe(notes);
      expect(menu.form.controls.regressionConstant).toBe(constantControl);
      expect(harness.routeNativeElement!.querySelector('#regressionConstant')).toBe(constant);
      expect(constantControl.value).toBeNull();
      expect(constant.value).toBe('');
      expect(control.value).toBe('Unfinished draft notes');
      expect(notes.value).toBe('Unfinished draft notes');
      expect(document.activeElement).toBe(notes);
      expect(notes.selectionStart).toBe(2);
      expect(notes.selectionEnd).toBe(7);
    };
    for (const status of ['loading', 'error', 'ready']) {
      checks.next(status === 'ready' ? facilityCheck() : undefined);
      calendarization.next({ status });
      harness.detectChanges();
      expectRetained();
      expect(harness.routeNativeElement!.textContent).not.toContain('End date must be after');
      expect(harness.routeNativeElement!.textContent).not.toContain('Model generation requires at least 12 months');
      expect(harness.routeNativeElement!.textContent).not.toContain('Meter data is missing');
    }
    checks.next(facilityCheck(false));
    harness.detectChanges();
    expectRetained();
    expect(harness.routeNativeElement!.textContent).toContain('End date must be after');
    expect(execute).toHaveBeenCalledTimes(writesBeforeRefresh);
    expect(store.selectedFacilityAnalysis().groups[0].regressionModelNotes).toBe('Saved model notes');
    expect(store.selectedFacilityAnalysis().groups[0].regressionConstant).toBe(10);
  });

  it.each([['energyIntensity', false], ['modifiedEnergyIntensity', false], ['modifiedEnergyIntensity', true]] as const)('keeps real %s options editable with monthly baseload=%s and unavailable checks', async (analysisType, monthlyBaseload) => {
    const { harness, checks, calendarization, execute } = await openEditor(analysisType, 'options', monthlyBaseload);
    const component = harness.routeDebugElement!.query(By.directive(GroupAnalysisOptionsComponent)).componentInstance;
    const predictor = harness.routeNativeElement!.querySelector('#predictor_predictor-a') as HTMLInputElement;
    const baseload = (harness.routeNativeElement!.querySelector('#averagePercentBaseload')
      ?? harness.routeNativeElement!.querySelector('[id="0_percent"]')) as HTMLInputElement | null;
    const focused = baseload ?? predictor;
    focused.focus();
    expect(predictor.checked).toBe(true);
    if (analysisType === 'modifiedEnergyIntensity') { expect(baseload!.value).toBe('25'); }
    expect(execute).not.toHaveBeenCalled();
    for (const status of ['loading', 'error', 'ready']) {
      checks.next(status === 'ready' ? facilityCheck() : undefined);
      calendarization.next({ status });
      harness.detectChanges();
      expect(harness.routeDebugElement!.query(By.directive(GroupAnalysisOptionsComponent)).componentInstance).toBe(component);
      expect(harness.routeNativeElement!.querySelector('#predictor_predictor-a')).toBe(predictor);
      expect(predictor.checked).toBe(true);
      expect(document.activeElement).toBe(focused);
      if (baseload) {
        expect(harness.routeNativeElement!.querySelector('[id="' + baseload.id + '"]')).toBe(baseload);
        expect(baseload.value).toBe('25');
      }
      expect(harness.routeNativeElement!.textContent).not.toContain('At least one production variable needs');
      expect(harness.routeNativeElement!.textContent).not.toContain('Average % Baseload value required');
      expect(harness.routeNativeElement!.textContent).not.toContain('One or more monthly averages is missing');
    }
    expect(execute).not.toHaveBeenCalled();
  });
});
