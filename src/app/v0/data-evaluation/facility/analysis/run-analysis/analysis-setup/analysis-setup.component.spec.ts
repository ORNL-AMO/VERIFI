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

describe('AnalysisSetupComponent local autosave', () => {
  let component: AnalysisSetupComponent;
  let analysis: IdbAnalysisItem;
  let selectedAnalysis: ReturnType<typeof signal<IdbAnalysisItem>>;
  let execute: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let clearModels: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    analysis = {
      guid: 'analysis-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Original', groups: [],
      baselineYear: 2023, energyIsSource: true, energyUnit: 'MMBtu', waterUnit: 'gal', hasBanking: false
    } as IdbAnalysisItem;
    selectedAnalysis = signal(analysis);
    update = vi.fn(async () => analysis);
    clearModels = vi.fn(async () => analysis);
    execute = vi.fn(async (_options: unknown, persist: () => Promise<unknown>) => ({ value: await persist() }));
    TestBed.configureTestingModule({ imports: [AnalysisSetupTestModule], providers: [
      AnalysisSetupComponent,
      { provide: AccountWorkspaceStore, useValue: {
        account: signal({ guid: 'account-a' }), selectedFacilityAnalysis: selectedAnalysis,
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

  it('hydrates silently and flushes the latest debounced name before leaving', async () => {
    vi.useFakeTimers();
    expect(execute).not.toHaveBeenCalled();
    component.form.controls.name.setValue('Latest name');
    await vi.advanceTimersByTimeAsync(299);
    expect(execute).not.toHaveBeenCalled();
    expect(await component.canDeactivate()).toBe(true);
    expect(update).toHaveBeenCalledExactlyOnceWith('analysis-a', { name: 'Latest name' }, 'account-a');
  });

  it('keeps a cleared invalid name local and restores it only when the user discards', async () => {
    component.form.controls.name.setValue('');
    expect(await component.flushChanges()).toBe(false);
    expect(execute).not.toHaveBeenCalled();
    const guard = TestBed.inject(RouterGuardService);
    const leaving = component.canDeactivate();
    await Promise.resolve();
    expect(guard.showSave.value).toBe(false);
    guard.setModalAction('discard');
    expect(await leaving).toBe(true);
    expect(component.form.controls.name.value).toBe('Original');
    expect(execute).not.toHaveBeenCalled();
  });

  it('does not replace newer invalid text when an older committed name arrives', async () => {
    let finish: (value: unknown) => void;
    execute.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    component.form.controls.name.setValue('First edit');
    const saving = component.flushChanges();
    component.form.controls.name.setValue('');
    selectedAnalysis.set({ ...analysis, name: 'First edit' });
    TestBed.flushEffects();
    finish({ value: selectedAnalysis() });
    await saving;
    expect(component.form.controls.name.value).toBe('');
    expect(component.autosave.dirty()).toBe(true);
    expect(execute).toHaveBeenCalledTimes(1);
  });
  it('retries a failed model clear together with newer settings in one command', async () => {
    clearModels.mockRejectedValueOnce(new Error('disk unavailable'));
    await component.confirmEnableForm();
    expect(component.autosave.error()).toContain('could not be saved');
    component.cancelEnableForm();
    component.form.controls.name.setValue('Edited after failure');
    expect(await component.flushChanges()).toBe(true);
    expect(clearModels).toHaveBeenLastCalledWith('analysis-a', 'account-a', { name: 'Edited after failure' });
    expect(update).not.toHaveBeenCalled();
    expect(component.form.controls.name.value).toBe('Edited after failure');
    expect(component.autosave.dirty()).toBe(false);
  });

  it('saves a name reversion after the older name write completes', async () => {
    let finish: (value: unknown) => void;
    const pending = new Promise(resolve => { finish = resolve; });
    execute.mockImplementation(() => pending);
    component.form.controls.name.setValue('First edit');
    const first = component.saveItem();
    component.form.controls.name.setValue('Original');
    const reverted = component.saveItem();
    expect(execute).toHaveBeenCalledTimes(1);
    await execute.mock.calls[0][1]();
    finish({ value: analysis });
    await Promise.all([first, reverted]);
    expect(execute).toHaveBeenCalledTimes(2);
    await execute.mock.calls[1][1]();
    expect(update).toHaveBeenNthCalledWith(1, 'analysis-a', { name: 'First edit' }, 'account-a');
    expect(update).toHaveBeenNthCalledWith(2, 'analysis-a', { name: 'Original' }, 'account-a');
  });

});
