import { CUSTOM_ELEMENTS_SCHEMA, Component, EventEmitter, Input, NgModule, Output, Pipe, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { CalanderizationService } from '@shared/helper-services/calanderization.service';
import { AccountStatusCheckService } from '@shared/helper-services/account-status-check.service';
import { RouterGuardService } from '@shared/shared-router-guard-modal/router-guard-service';
import { AnalysisSetupComponent } from './analysis-setup.component';

@Pipe({ name: 'yearDisplay', standalone: false })
export class SetupYearDisplayPipe { transform(value: unknown, ..._args: unknown[]) { return value; } }
@Pipe({ name: 'invalidAnalysis', standalone: false })
export class SetupInvalidAnalysisPipe {
  transform(_value: unknown) { return { baselineYearAfterMeterDataEnd: false, baselineYearBeforeMeterDataStart: false }; }
}
@Component({ selector: 'app-select-banked-analysis', standalone: false, template: '' })
export class SetupBankedAnalysisStub {
  @Input() facilityAnalysisItems: unknown;
  @Input() analysisItem: unknown;
  @Input() facility: unknown;
  @Input() disabled: boolean;
  @Output() bankedItemSelected = new EventEmitter<string>();
}

@NgModule({ declarations: [AnalysisSetupComponent, SetupYearDisplayPipe, SetupInvalidAnalysisPipe, SetupBankedAnalysisStub], imports: [CommonModule, ReactiveFormsModule], schemas: [CUSTOM_ELEMENTS_SCHEMA] })
class AnalysisSetupTestModule { }

describe('AnalysisSetupComponent queued field intent', () => {
  let component: AnalysisSetupComponent;
  let analysis: IdbAnalysisItem;
  let selectedAnalysis: ReturnType<typeof signal<IdbAnalysisItem>>;
  let activeAccount: ReturnType<typeof signal<{ guid: string }>>;
  let execute: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let clearModels: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    analysis = {
      guid: 'analysis-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Original', groups: [],
      baselineYear: 2023, energyIsSource: true, energyUnit: 'MMBtu', waterUnit: 'gal', hasBanking: false
    } as IdbAnalysisItem;
    selectedAnalysis = signal(analysis);
    activeAccount = signal({ guid: 'account-a' });
    update = vi.fn(async () => analysis);
    clearModels = vi.fn(async () => analysis);
    execute = vi.fn(async (_options: unknown, persist: () => Promise<unknown>) => ({ value: await persist() }));
    TestBed.configureTestingModule({ imports: [AnalysisSetupTestModule], providers: [
      AnalysisSetupComponent,
      { provide: AccountWorkspaceStore, useValue: {
        account: activeAccount, selectedFacilityAnalysis: selectedAnalysis,
        selectedFacility: signal({ guid: 'facility-a' }), selectedFacilityAnalyses: signal([analysis])
      } },
      { provide: AccountWorkspaceQueryService, useValue: { getAccountAnalysesForFacilityAnalysis: () => [] } },
      { provide: WorkspaceCommandBoundary, useValue: { execute } },
      { provide: AnalysisCommandHandler, useValue: { updateFacilityAnalysisFields: update, clearFacilityAnalysisModels: clearModels } },
      { provide: AnalysisService, useValue: { hideInUseMessage: new BehaviorSubject(false) } },
      { provide: ActivatedRoute, useValue: {} }, { provide: Router, useValue: {} },
      { provide: CalanderizationService, useValue: { calanderizedMeters: new BehaviorSubject([]) } },
      { provide: AccountStatusCheckService, useValue: { selectedFacilityStatusCheck$: new BehaviorSubject(undefined) } }
    ] });
    component = TestBed.inject(AnalysisSetupComponent);
    TestBed.flushEffects();
  });

  afterEach(() => { TestBed.resetTestingModule(); vi.useRealTimers(); });

  it('queues a name reversion as an explicit field intent while an older save is pending', async () => {
    vi.useFakeTimers();
    let finish: (value: unknown) => void;
    const flight = new Promise(resolve => { finish = resolve; });
    execute.mockImplementation(() => flight);
    component.form.controls.name.setValue('First edit');
    const first = component.saveItem();
    component.form.controls.name.setValue('Original');
    const reverted = component.saveItem();
    expect(execute).toHaveBeenCalledTimes(2);
    await execute.mock.calls[0][1]();
    await execute.mock.calls[1][1]();
    expect(update).toHaveBeenNthCalledWith(1, 'analysis-a', { name: 'First edit' }, 'account-a');
    expect(update).toHaveBeenNthCalledWith(2, 'analysis-a', { name: 'Original' }, 'account-a');
    finish({ value: analysis });
    await Promise.all([first, reverted]);
  });

  it('retains failed field intent when a later edit to another field is saved', async () => {
    vi.useFakeTimers();
    const failure = new Error('persistence failed');
    update.mockRejectedValueOnce(failure);
    component.form.controls.name.setValue('Retained name');
    await expect(component.saveItem()).rejects.toBe(failure);
    component.form.controls.energyUnit.setValue('GJ');
    await component.saveItem();
    expect(update).toHaveBeenNthCalledWith(2, 'analysis-a', { name: 'Retained name', energyUnit: 'GJ' }, 'account-a');
  });

  it('uses the latest form values when retrying fields from a failed in-flight save', async () => {
    vi.useFakeTimers();
    const failure = new Error('persistence failed');
    let rejectSave!: (reason: unknown) => void;
    update.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSave = reject; }));
    component.form.controls.name.setValue('Submitted name');
    const first = component.saveItem();
    const rejected = expect(first).rejects.toBe(failure);
    component.form.controls.name.setValue('Newest name');
    component.form.controls.energyUnit.setValue('GJ');
    rejectSave(failure);
    await rejected;
    await component.saveItem();
    expect(update).toHaveBeenNthCalledWith(2, 'analysis-a', { name: 'Newest name', energyUnit: 'GJ' }, 'account-a');
  });

  it.each(['analysis', 'account'] as const)('does not restore a failed intent after the active %s changes', async owner => {
    vi.useFakeTimers();
    const failure = new Error('persistence failed');
    let rejectSave!: (reason: unknown) => void;
    update.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSave = reject; }));
    component.form.controls.name.setValue('Departed owner name');
    const first = component.saveItem();
    const rejected = expect(first).rejects.toBe(failure);
    const accountGuid = owner === 'account' ? 'account-b' : 'account-a';
    activeAccount.set({ guid: accountGuid });
    selectedAnalysis.set({ ...analysis, guid: 'analysis-b', accountId: accountGuid, name: 'New owner name' });
    TestBed.flushEffects();
    component.form.controls.energyUnit.setValue('GJ');
    rejectSave(failure);
    await rejected;
    await component.saveItem();
    expect(update).toHaveBeenNthCalledWith(2, 'analysis-b', { energyUnit: 'GJ' }, accountGuid);
    expect(component.form.controls.name.value).toBe('New owner name');
  });

  it('does not restore failed field intent after destruction', async () => {
    vi.useFakeTimers();
    const failure = new Error('persistence failed');
    let rejectSave!: (reason: unknown) => void;
    update.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSave = reject; }));
    component.form.controls.name.setValue('Departed draft');
    const first = component.saveItem();
    const rejected = expect(first).rejects.toBe(failure);
    TestBed.resetTestingModule();
    rejectSave(failure);
    await rejected;
    await component.saveItem();
    expect(update).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(1);
  });

});
