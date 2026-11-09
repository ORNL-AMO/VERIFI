import { CUSTOM_ELEMENTS_SCHEMA, NgModule, Pipe, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { AnalysisGroup } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { CalanderizationService } from '@shared/helper-services/calanderization.service';
import { AccountStatusCheckService } from '@shared/helper-services/account-status-check.service';
import { GroupAnalysisOptionsComponent } from './group-analysis-options.component';

@Pipe({ name: 'monthLabel', standalone: false })
export class OptionsMonthLabelPipe { transform(value: unknown) { return value; } }
@Pipe({ name: 'settingsLabel', standalone: false })
export class OptionsSettingsLabelPipe { transform(value: unknown, ..._args: unknown[]) { return value; } }
@Pipe({ name: 'yearDisplay', standalone: false })
export class OptionsYearDisplayPipe { transform(value: unknown, ..._args: unknown[]) { return value; } }

@NgModule({ declarations: [GroupAnalysisOptionsComponent, OptionsMonthLabelPipe, OptionsSettingsLabelPipe, OptionsYearDisplayPipe], imports: [CommonModule, FormsModule], schemas: [CUSTOM_ELEMENTS_SCHEMA] })
class GroupOptionsTestModule { }

describe('GroupAnalysisOptionsComponent queued edits', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('rebuilds an adjustment from the latest group without mutating the committed editor input', async () => {
    const group = {
      idbGroupId: 'group-a', dataAdjustments: [{ year: 2024, amount: 1 }, { year: 2025, amount: 2 }],
      predictorVariables: []
    } as AnalysisGroup;
    const analysis = { guid: 'analysis-a', accountId: 'account-a', facilityId: 'facility-a', groups: [group] } as IdbAnalysisItem;
    const analyses = signal([analysis]);
    let finish: (value: unknown) => void;
    const queued = new Promise(resolve => { finish = resolve; });
    const execute = vi.fn((_options: unknown, _persist: () => Promise<unknown>) => queued);
    const update = vi.fn(async () => analyses()[0]);
    TestBed.configureTestingModule({ imports: [GroupOptionsTestModule], providers: [
      GroupAnalysisOptionsComponent,
      { provide: AccountWorkspaceStore, useValue: {
        account: signal({ guid: 'account-a' }), selectedFacilityAnalysis: signal(analysis), facilityAnalyses: analyses,
        selectedFacility: signal({ guid: 'facility-a' }), selectedFacilityAnalyses: analyses,
        accountAnalyses: signal([]), predictorData: signal([])
      } },
      { provide: WorkspaceCommandBoundary, useValue: { execute } },
      { provide: AnalysisCommandHandler, useValue: { updateFacilityAnalysisGroup: update } },
      { provide: AnalysisService, useValue: { selectedGroup: new BehaviorSubject(group), hideInUseMessage: new BehaviorSubject(false) } },
      { provide: Router, useValue: {} },
      { provide: CalanderizationService, useValue: { calanderizedMeters: new BehaviorSubject([]) } },
      { provide: AccountStatusCheckService, useValue: { selectedFacilityStatusCheck$: new BehaviorSubject(undefined) } }
    ] });
    const component = TestBed.inject(GroupAnalysisOptionsComponent);
    const saving = component.setAdjustment('dataAdjustments', 2024, 7);
    expect(group.dataAdjustments).toEqual([{ year: 2024, amount: 1 }, { year: 2025, amount: 2 }]);
    const latestGroup = { ...group, dataAdjustments: [{ year: 2024, amount: 1 }, { year: 2025, amount: 9 }] };
    analyses.set([{ ...analysis, groups: [latestGroup] }]);
    const [, persist] = execute.mock.calls[0];
    await persist();
    expect(update).toHaveBeenCalledWith('analysis-a', 'group-a', {
      dataAdjustments: [{ year: 2024, amount: 7 }, { year: 2025, amount: 9 }]
    }, 'account-a');
    finish({ value: analyses()[0] });
    await saving;
    expect(group.dataAdjustments[0].amount).toBe(1);
  });
});
