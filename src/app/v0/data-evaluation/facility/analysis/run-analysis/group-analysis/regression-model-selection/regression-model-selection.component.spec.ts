import { CUSTOM_ELEMENTS_SCHEMA, NgModule, Pipe, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { RegressionModelStateService } from '@data/account-workspace/regression-model-state.service';
import { AnalysisGroup, JStatRegressionModel } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { CalanderizationService } from '@shared/helper-services/calanderization.service';
import { AccountStatusCheckService } from '@shared/helper-services/account-status-check.service';
import { RegressionModelSelectionComponent } from './regression-model-selection.component';

@Pipe({ name: 'yearDisplay', standalone: false })
export class SelectionYearDisplayPipe { transform(value: unknown, ..._args: unknown[]) { return value; } }
@Pipe({ name: 'regressionNumber', standalone: false })
export class SelectionRegressionNumberPipe { transform(value: unknown, ..._args: unknown[]) { return value; } }
@NgModule({ declarations: [RegressionModelSelectionComponent, SelectionYearDisplayPipe, SelectionRegressionNumberPipe], imports: [CommonModule, FormsModule], schemas: [CUSTOM_ELEMENTS_SCHEMA] })
class RegressionSelectionTestModule { }

describe('RegressionModelSelectionComponent model intent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('queues the original model when the user reselects it before another choice commits', async () => {
    const variable = { id: 'predictor-a', name: 'Production', productionInAnalysis: true, regressionCoefficient: 2 };
    const firstModel = { modelId: 'model-a', coef: [10, 2], modelYear: 2023, predictorVariables: [variable], isValid: true } as JStatRegressionModel;
    const secondModel = { ...firstModel, modelId: 'model-b', coef: [20, 3] };
    const group = {
      idbGroupId: 'group-a', selectedModelId: 'model-a', isGeneratedModel: true, models: [firstModel],
      regressionConstant: 10, regressionModelYear: 2023, predictorVariables: [variable]
    } as AnalysisGroup;
    const analysis = { guid: 'analysis-a', accountId: 'account-a', facilityId: 'facility-a', groups: [group] } as IdbAnalysisItem;
    let finish: (value: unknown) => void;
    const pending = new Promise(resolve => { finish = resolve; });
    const execute = vi.fn((_options: unknown, _persist: () => Promise<unknown>) => pending);
    const update = vi.fn(async () => analysis);
    TestBed.configureTestingModule({ imports: [RegressionSelectionTestModule], providers: [
      RegressionModelSelectionComponent,
      { provide: AccountWorkspaceStore, useValue: {
        account: signal({ guid: 'account-a' }), selectedFacilityAnalysis: signal(analysis), selectedFacility: signal({ guid: 'facility-a' })
      } },
      { provide: AccountWorkspaceQueryService, useValue: { getAccountAnalysesForFacilityAnalysis: () => [] } },
      { provide: WorkspaceCommandBoundary, useValue: { execute } },
      { provide: AnalysisCommandHandler, useValue: { updateFacilityAnalysisGroup: update } },
      { provide: AnalysisService, useValue: { selectedGroup: new BehaviorSubject(group), hideInUseMessage: new BehaviorSubject(false) } },
      { provide: RegressionModelStateService, useValue: { modelsByGroup: signal({ 'group-a': [firstModel, secondModel] }), setForGroup: vi.fn() } },
      { provide: CalanderizationService, useValue: { calanderizedMeters: new BehaviorSubject([]) } },
      { provide: AccountStatusCheckService, useValue: { selectedFacilityStatusCheck$: new BehaviorSubject(undefined) } }
    ] });
    const component = TestBed.inject(RegressionModelSelectionComponent);
    TestBed.flushEffects();
    const choosing = component.selectModel('model-b');
    const reverting = component.selectModel('model-a');
    expect(execute).toHaveBeenCalledTimes(1);
    await execute.mock.calls[0][1]();
    finish({ value: analysis });
    await Promise.all([choosing, reverting]);
    expect(execute).toHaveBeenCalledTimes(2);
    await execute.mock.calls[1][1]();
    expect(update).toHaveBeenNthCalledWith(1, 'analysis-a', 'group-a', expect.objectContaining({ selectedModelId: 'model-b', regressionConstant: 20 }), 'account-a');
    expect(update).toHaveBeenNthCalledWith(2, 'analysis-a', 'group-a', expect.objectContaining({ selectedModelId: 'model-a', regressionConstant: 10 }), 'account-a');
  });
});
