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
  let activeAccount: ReturnType<typeof signal<{ guid: string }>>;
  let facilityAnalyses: ReturnType<typeof signal<IdbAnalysisItem[]>>;
  let execute: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let clearModels: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    analysis = {
      guid: 'analysis-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Original', groups: [],
      analysisCategory: 'energy', baselineYear: 2023, energyIsSource: true, energyUnit: 'MMBtu', waterUnit: 'gal', hasBanking: false
    } as IdbAnalysisItem;
    selectedAnalysis = signal(analysis);
    activeAccount = signal({ guid: 'account-a' });
    facilityAnalyses = signal([analysis]);
    update = vi.fn(async () => analysis);
    clearModels = vi.fn(async () => analysis);
    execute = vi.fn(async (_options: unknown, persist: () => Promise<unknown>) => ({ value: await persist() }));
    TestBed.configureTestingModule({ imports: [AnalysisSetupTestModule], providers: [
      AnalysisSetupComponent,
      { provide: AccountWorkspaceStore, useValue: {
        account: activeAccount, selectedFacilityAnalysis: selectedAnalysis,
        selectedFacility: signal({ guid: 'facility-a', fiscalYear: 'calendarYear', sustainabilityQuestions: {} }),
        selectedFacilityAnalyses: facilityAnalyses
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


  it('retries a failed name save with the latest name and baseline together', async () => {
    vi.useFakeTimers();
    update.mockRejectedValueOnce(new Error('disk unavailable'));
    component.form.controls.name.setValue('Failed name');
    expect(await component.flushChanges()).toBe(false);
    expect(component.autosave.error()).toContain('could not be saved');

    component.form.controls.name.setValue('');
    component.form.controls.baselineYear.setValue(2024);
    component.form.controls.name.setValue('Newest name');
    expect(update).toHaveBeenCalledTimes(1);
    expect(await component.flushChanges()).toBe(true);
    expect(update).toHaveBeenNthCalledWith(2, 'analysis-a', { name: 'Newest name', baselineYear: 2024 }, 'account-a');
    expect(component.form.controls.name.value).toBe('Newest name');
    expect(component.form.controls.baselineYear.value).toBe(2024);
    expect(component.autosave.dirty()).toBe(false);
    expect(component.autosave.error()).toBeUndefined();
  });

  it('does not leak a departed owner failure into the current owner retry', async () => {
    vi.useFakeTimers();
    let rejectSave!: (reason: unknown) => void;
    update.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSave = reject; }));
    component.form.controls.name.setValue('Departed owner name');
    const departedSave = component.flushChanges();
    activeAccount.set({ guid: 'account-b' });
    selectedAnalysis.set({ ...analysis, guid: 'analysis-b', accountId: 'account-b', name: 'New owner baseline', baselineYear: 2022 });
    TestBed.flushEffects();
    component.form.controls.name.setValue('Current owner name');
    component.form.controls.baselineYear.setValue(2025);
    const currentSave = component.flushChanges();
    rejectSave(new Error('departed owner disk failure'));

    expect(await departedSave).toBe(false);
    expect(await currentSave).toBe(true);
    expect(update).toHaveBeenNthCalledWith(2, 'analysis-b', { name: 'Current owner name', baselineYear: 2025 }, 'account-b');
    expect(component.form.controls.name.value).toBe('Current owner name');
    expect(component.form.controls.baselineYear.value).toBe(2025);
    expect(component.autosave.error()).toBeUndefined();
    expect(component.autosave.dirty()).toBe(false);
  });

  function hydrateBanking(energyIsSource: boolean, targets: IdbAnalysisItem[]): void {
    analysis = { ...analysis, energyIsSource, hasBanking: true, bankedAnalysisItemId: 'banked-source' };
    facilityAnalyses.set([analysis, ...targets]);
    selectedAnalysis.set(analysis);
    TestBed.flushEffects();
  }

  it('saves a source-to-site edit together with cleared banking when no same-category site target remains', async () => {
    const sourceTarget = { ...analysis, guid: 'banked-source', energyIsSource: true };
    const waterTarget = { ...analysis, guid: 'water-site', energyIsSource: false, analysisCategory: 'water' as const };
    hydrateBanking(true, [sourceTarget, waterTarget]);
    update.mockImplementation(async (_guid: string, changes: Partial<IdbAnalysisItem>) => {
      analysis = { ...analysis, ...changes };
      selectedAnalysis.set(analysis);
      return analysis;
    });
    expect(execute).not.toHaveBeenCalled();

    component.form.controls.energyIsSource.setValue(false);
    expect(await component.flushChanges()).toBe(true);

    expect(update).toHaveBeenCalledExactlyOnceWith('analysis-a', {
      energyIsSource: false, hasBanking: false, bankedAnalysisItemId: undefined
    }, 'account-a');
    expect(selectedAnalysis()).toMatchObject({ energyIsSource: false, hasBanking: false });
    expect(selectedAnalysis().bankedAnalysisItemId).toBeUndefined();
    expect(component.form.controls.bankedAnalysisItemId.value).toBeNull();
    expect(component.facilityAnalysisItems()).toEqual([]);
  });

  it('keeps banking enabled but waits for a compatible target when another site target is available', async () => {
    const sourceTarget = { ...analysis, guid: 'banked-source', energyIsSource: true };
    const siteTarget = { ...analysis, guid: 'banked-site', energyIsSource: false };
    hydrateBanking(true, [sourceTarget, siteTarget]);

    component.form.controls.energyIsSource.setValue(false);
    expect(component.facilityAnalysisItems()).toEqual([siteTarget]);
    expect(component.form.controls.hasBanking.value).toBe(true);
    expect(component.form.controls.bankedAnalysisItemId.value).toBeNull();
    expect(await component.flushChanges()).toBe(false);
    expect(update).not.toHaveBeenCalled();

    component.setBankedAnalysisItemId(siteTarget.guid);
    expect(await component.flushChanges()).toBe(true);
    expect(update).toHaveBeenCalledExactlyOnceWith('analysis-a', {
      energyIsSource: false, bankedAnalysisItemId: 'banked-site'
    }, 'account-a');
  });

  it('preserves a bank target when the edited boundary makes its saved reference compatible', async () => {
    const sourceTarget = { ...analysis, guid: 'banked-source', energyIsSource: true };
    hydrateBanking(false, [sourceTarget]);
    expect(execute).not.toHaveBeenCalled();

    component.form.controls.energyIsSource.setValue(true);
    expect(await component.flushChanges()).toBe(true);
    expect(component.form.controls.hasBanking.value).toBe(true);
    expect(component.form.controls.bankedAnalysisItemId.value).toBe(sourceTarget.guid);
    expect(update).toHaveBeenCalledExactlyOnceWith('analysis-a', { energyIsSource: true }, 'account-a');
  });

  it('preserves compatible banking when changing the analysis unit', async () => {
    const sourceTarget = { ...analysis, guid: 'banked-source', energyIsSource: true };
    hydrateBanking(true, [sourceTarget]);

    component.form.controls.energyUnit.setValue('kWh');
    expect(await component.flushChanges()).toBe(true);
    expect(component.form.controls.hasBanking.value).toBe(true);
    expect(component.form.controls.bankedAnalysisItemId.value).toBe(sourceTarget.guid);
    expect(update).toHaveBeenCalledExactlyOnceWith('analysis-a', { energyUnit: 'kWh' }, 'account-a');
  });

  it('opens incompatible saved banking without a write and leaves its switch available to turn off', async () => {
    const sourceTarget = { ...analysis, guid: 'banked-source', energyIsSource: true };
    hydrateBanking(false, [sourceTarget]);
    const fixture = TestBed.createComponent(AnalysisSetupComponent);
    fixture.detectChanges();
    const rendered = fixture.componentInstance;
    expect(rendered.facilityAnalysisItems()).toEqual([]);
    expect(rendered.form.controls.bankedAnalysisItemId.value).toBe('banked-source');
    const banking = fixture.nativeElement.querySelector('#hasBanking') as HTMLInputElement;
    expect(banking).not.toBeNull();
    expect(banking.checked).toBe(true);
    expect(banking.disabled).toBe(false);
    expect(execute).not.toHaveBeenCalled();

    banking.click();
    expect(await rendered.flushChanges()).toBe(true);
    expect(update).toHaveBeenCalledExactlyOnceWith('analysis-a', {
      hasBanking: false, bankedAnalysisItemId: undefined
    }, 'account-a');
    fixture.destroy();
  });

});
