import { CommonModule } from '@angular/common';
import { Component, NgModule } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, RouterModule } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BehaviorSubject } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { AccountStatusCheckService } from '@shared/helper-services/account-status-check.service';
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { GroupAnalysisComponent } from './group-analysis.component';

@Component({ standalone: false, template: '<label>Model notes <input aria-label="Model notes"></label>' })
class TestEditorComponent { }

@NgModule({ declarations: [GroupAnalysisComponent, TestEditorComponent], imports: [CommonModule, RouterModule] })
class GroupAnalysisTestModule { }

describe('Facility analysis editor lifetime in Chromium', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('retains the routed editor, focus, and caret while checks load, fail, and recover', async () => {
    const checks = new BehaviorSubject<any>({ getGroupStatusChecksByGroupId: () => ({ status: 'good', groupAnalysisErrors: {} }) });
    const calendarization = new BehaviorSubject<any>({ status: 'ready' });
    const group = { idbGroupId: 'group-a', analysisType: 'regression' };
    const selectedGroup = new BehaviorSubject(group);
    const store = new AccountWorkspaceStore();
    const analysis = { guid: 'analysis-a', accountId: 'account-a', facilityId: 'facility-a', groups: [group] } as any;
    const facility = { guid: 'facility-a', accountId: 'account-a' } as any;
    store.publish({
      account: { guid: 'account-a' }, facilities: [facility], facilityAnalyses: [analysis],
      meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [], accountAnalyses: [],
      accountReports: [], facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [],
      energyUseGroups: [], energyUseEquipment: []
    } as any, { facility, facilityAnalysis: analysis });
    await TestBed.configureTestingModule({
      imports: [GroupAnalysisTestModule],
      providers: [
        provideRouter([{ path: 'group/:id', component: GroupAnalysisComponent, children: [{ path: 'model-selection', component: TestEditorComponent }] }]),
        { provide: AccountWorkspaceStore, useValue: store },
        { provide: AccountWorkspaceQueryService, useValue: { getMeterGroupName: () => 'Group A', getFacilityAnalysisByGuid: () => undefined } },
        { provide: AnalysisService, useValue: { selectedGroup } },
        { provide: AccountStatusCheckService, useValue: { selectedFacilityStatusCheck$: checks, calendarizationState: calendarization, retryCalendarization: vi.fn() } }
      ]
    }).compileComponents();
    const harness = await RouterTestingHarness.create('/group/group-a/model-selection');
    const input = harness.routeNativeElement!.querySelector('input')!;
    input.value = 'A model note';
    input.focus();
    input.setSelectionRange(2, 6);
    for (const state of ['loading', 'error', 'ready']) {
      checks.next(state === 'ready' ? { getGroupStatusChecksByGroupId: () => ({ status: 'good', groupAnalysisErrors: {} }) } : undefined);
      calendarization.next({ status: state });
      harness.detectChanges();
      expect(harness.routeNativeElement!.querySelector('input')).toBe(input);
      expect(input.value).toBe('A model note');
      expect(document.activeElement).toBe(input);
      expect(input.selectionStart).toBe(2);
      expect(input.selectionEnd).toBe(6);
    }
  });
});
