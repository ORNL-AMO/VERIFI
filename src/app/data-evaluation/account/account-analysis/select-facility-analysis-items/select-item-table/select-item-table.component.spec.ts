import '@angular/compiler';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { Pipe, PipeTransform } from '@angular/core';
import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { AccountWorkspaceService } from '../../../../../account-workspace/account-workspace.service';
import { AccountWorkspaceSnapshot } from '../../../../../account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '../../../../../account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '../../../../../account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler } from '../../../../../account-workspace/handlers/analysis-command-handler.service';
import { LoadingService } from '../../../../../core-components/loading/loading.service';
import { AnalysisService } from '../../../../facility/analysis/analysis.service';
import { AccountStatusCheckService } from '../../../../../shared/helper-services/account-status-check.service';
import { SharedDataService } from '../../../../../shared/helper-services/shared-data.service';
import { SelectItemTableComponent } from './select-item-table.component';

@Pipe({ name: 'invalidAnalysis', standalone: false })
export class InvalidAnalysisStubPipe implements PipeTransform {
  transform(_value: string) {
    return { hasError: false, groupsHaveErrors: false };
  }
}

@Pipe({ name: 'groupName', standalone: false })
export class GroupNameStubPipe implements PipeTransform {
  transform(value: string) {
    return value;
  }
}

@NgModule({
  declarations: [SelectItemTableComponent, InvalidAnalysisStubPipe, GroupNameStubPipe],
  imports: [CommonModule, FormsModule]
})
class SelectItemTableComponentTestModule { }

describe('SelectItemTableComponent', () => {
  it('publishes the committed account analysis after creating a facility analysis', async () => {
    const store = new AccountWorkspaceStore();
    const account = {
      id: 1,
      guid: 'account-a',
      name: 'Account A',
      energyUnit: 'MMBtu',
      volumeLiquidUnit: 'kgal',
      energyIsSource: false,
      sustainabilityQuestions: {
        energyReductionBaselineYear: 2020,
        waterReductionBaselineYear: 2020
      }
    } as any;
    const facility = {
      id: 2,
      guid: 'facility-a',
      accountId: 'account-a',
      name: 'Facility A',
      isNewFacility: false,
      energyIsSource: false,
      energyUnit: 'MMBtu',
      volumeLiquidUnit: 'kgal',
      sustainabilityQuestions: {
        energyReductionBaselineYear: 2020,
        waterReductionBaselineYear: 2020
      }
    } as any;
    const selectedAnalysisItem = {
      id: 3,
      guid: 'account-analysis-a',
      accountId: 'account-a',
      name: 'Account Analysis',
      analysisCategory: 'energy',
      baselineYear: 2020,
      energyUnit: 'MMBtu',
      waterUnit: 'kgal',
      energyIsSource: false,
      hasBanking: false,
      isAnalysisVisited: true,
      facilityAnalysisItems: [
        { facilityId: 'facility-a', analysisItemId: undefined }
      ]
    } as any;
    const snapshot = {
      account,
      facilities: [facility],
      meters: [],
      meterData: [],
      meterGroups: [],
      predictors: [],
      predictorData: [],
      facilityAnalyses: [],
      accountAnalyses: [selectedAnalysisItem],
      accountReports: [],
      facilityReports: [],
      customEmissions: [],
      customFuels: [],
      customGWPs: [],
      energyUseGroups: [],
      energyUseEquipment: []
    } as unknown as AccountWorkspaceSnapshot;
    store.publish(snapshot, { facility, accountAnalysis: selectedAnalysisItem });

    const execute = vi.fn().mockImplementation(async (_options, persist) => {
      const value = await persist();
      return { value, change: {} };
    });
    const addFacilityAnalysis = vi.fn(async (value: any) => ({ ...value, guid: 'facility-analysis-new' }));
    const updateAccountAnalysis = vi.fn(async (value: any) => ({ ...value }));
    const selectFacilityAnalysis = vi.fn();
    const navigateByUrl = vi.fn();
    const setLoadingMessage = vi.fn();
    const setLoadingStatus = vi.fn();
    const accountAnalysisItem = new BehaviorSubject(undefined);

    TestBed.configureTestingModule({
      imports: [SelectItemTableComponentTestModule],
      providers: [
        { provide: AccountWorkspaceStore, useValue: store },
        { provide: AccountWorkspaceService, useValue: { selectFacilityAnalysis, reloadActiveWorkspace: vi.fn() } },
        { provide: WorkspaceCommandBoundary, useValue: { execute } },
        { provide: AnalysisCommandHandler, useValue: { addFacilityAnalysis, updateAccountAnalysis } },
        { provide: Router, useValue: { navigateByUrl } },
        { provide: LoadingService, useValue: { setLoadingMessage, setLoadingStatus } },
        { provide: AnalysisService, useValue: { accountAnalysisItem } },
        { provide: SharedDataService, useValue: { modalOpen: new BehaviorSubject(false) } },
        { provide: AccountStatusCheckService, useValue: { accountStatusCheck: new BehaviorSubject(null) } }
      ]
    });

    const component = TestBed.runInInjectionContext(() => new SelectItemTableComponent());

    await component.confirmCreateNew();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(addFacilityAnalysis).toHaveBeenCalledTimes(1);
    expect(updateAccountAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        guid: 'account-analysis-a',
        isAnalysisVisited: false,
        facilityAnalysisItems: [
          { facilityId: 'facility-a', analysisItemId: 'facility-analysis-new' }
        ]
      }),
      'account-a'
    );
    expect(accountAnalysisItem.getValue()).toEqual(
      expect.objectContaining({
        guid: 'account-analysis-a',
        isAnalysisVisited: false,
        facilityAnalysisItems: [
          { facilityId: 'facility-a', analysisItemId: 'facility-analysis-new' }
        ]
      })
    );
    expect(accountAnalysisItem.getValue()).not.toBe(selectedAnalysisItem);
    expect(selectFacilityAnalysis).toHaveBeenCalledWith('facility-analysis-new');
    expect(navigateByUrl).toHaveBeenCalledWith('/data-evaluation/facility/facility-a/analysis/run-analysis/analysis-setup');
  });
});
