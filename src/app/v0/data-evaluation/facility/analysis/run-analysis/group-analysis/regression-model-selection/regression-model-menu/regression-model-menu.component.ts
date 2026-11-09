import { AnalysisAutosave } from '../../../analysis-autosave';
import { RouterGuardService } from '@shared/shared-router-guard-modal/router-guard-service';
import { getAnalysisGroupChanges } from '../../../analysis-edits';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler, AnalysisGroupChanges } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { DestroyRef, HostListener, Component, computed, effect, inject, untracked, Signal, signal, WritableSignal } from '@angular/core';
import { FormArray, FormControl, FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { AnalysisGroup, JStatRegressionModel } from '@data/models/analysis';
import { CalanderizedMeter } from '@data/models/calanderization';
import * as _ from 'lodash';
import { SharedDataService } from '@shared/helper-services/shared-data.service';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { Month, Months } from '@shared/form-data/months';
import { CalanderizationService } from '@shared/helper-services/calanderization.service';
import { getAllYearsWithData } from '@domain/calculations/shared-calculations/calculationsHelpers';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountStatusCheckService } from '@shared/helper-services/account-status-check.service';
import { RegressionModelsService } from '@shared/shared-analysis/calculations/regression-models.service';
import { FacilityStatusCheck } from '@domain/calculations/status-check-calculations/facilityStatusCheck';
import { AnalysisGroupStatusCheck } from '@domain/calculations/status-check-calculations/analysisGroupStatusCheck';
import { RegressionModelStateService } from '@data/account-workspace/regression-model-state.service';

interface RegressionDraft {
  accountGuid: string;
  analysisGuid: string;
  groupGuid: string;
  values: AnalysisGroupChanges;
}

type PredictorVariableForm = FormGroup<{
  productionInAnalysis: FormControl<boolean>;
  regressionCoefficient: FormControl<number>;
}>;

type RegressionMenuForm = FormGroup<{
  isGeneratedModel: FormControl<boolean>;
  maxModelVariables: FormControl<number>;
  regressionConstant: FormControl<number>;
  regressionModelYear: FormControl<number>;
  regressionModelStartMonth: FormControl<number>;
  regressionStartYear: FormControl<number>;
  regressionModelEndMonth: FormControl<number>;
  regressionEndYear: FormControl<number>;
  regressionModelNotes: FormControl<string>;
  predictorVariables: FormArray<PredictorVariableForm>;
}>;

@Component({
  selector: 'app-regression-model-menu',
  templateUrl: './regression-model-menu.component.html',
  styleUrls: ['./regression-model-menu.component.css'],
  standalone: false
})
export class RegressionModelMenuComponent {
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly analysisHandler = inject(AnalysisCommandHandler);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly routerGuardService = inject(RouterGuardService);

  // --- Services (DI) ---
  private analysisService: AnalysisService = inject(AnalysisService);
  private regressionModelState = inject(RegressionModelStateService);
  private sharedDataService: SharedDataService = inject(SharedDataService);
  private calanderizationService: CalanderizationService = inject(CalanderizationService);
  private fb: NonNullableFormBuilder = inject(NonNullableFormBuilder);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);
  private regressionModelsService: RegressionModelsService = inject(RegressionModelsService);

  // --- Signals ---
  group: Signal<AnalysisGroup> = toSignal(this.analysisService.selectedGroup);
  calanderizedMeters: Signal<Array<CalanderizedMeter>> = toSignal(this.calanderizationService.calanderizedMeters);
  selectedFacility: Signal<IdbFacility> = this.accountWorkspaceStore.selectedFacility;
  analysisItem: Signal<IdbAnalysisItem> = this.accountWorkspaceStore.selectedFacilityAnalysis;
  facilityPredictorData: Signal<Array<IdbPredictorData>> = computed(() => [...this.accountWorkspaceStore.facilityPredictorData()]);
  facilityMeterData: Signal<Array<IdbUtilityMeterData>> = computed(() => [...this.accountWorkspaceStore.facilityMeterData()]);
  facilityMeters: Signal<Array<IdbUtilityMeter>> = computed(() => [...this.accountWorkspaceStore.facilityMeters()]);
  generatedModelsPerGroup = this.regressionModelState.modelsByGroup;
  facilityStatusCheck: Signal<FacilityStatusCheck> = toSignal(this.accountStatusCheckService.selectedFacilityStatusCheck$);
  selectedAccount: Signal<IdbAccount> = this.accountWorkspaceStore.account;

  // --- Computed Signals ---
  yearOptions: Signal<Array<number>> = computed(() => {
    const calanderizedMeters = this.calanderizedMeters();
    const selectedFacility = this.selectedFacility();
    if (calanderizedMeters && selectedFacility) {
      let years = getAllYearsWithData(calanderizedMeters, selectedFacility);
      years.sort((a, b) => a - b);
      return years;
    }
    return [];
  });

  calendarYearOptions = computed(() => {
    const facility = this.selectedFacility();
    const meters = this.calanderizedMeters() ?? [];

    if (!facility) {
      return [];
    }

    const years = meters
      .filter(meter => meter.meter.facilityId === facility.guid)
      .flatMap(meter => meter.monthlyData)
      .map(month => new Date(month.date).getFullYear());

    return [...new Set(years)].sort((first, second) => first - second);
  });

  numVariableOptions: Signal<Array<number>> = computed(() => {
    const group = this.group();
    let options: Array<number> = new Array();
    let variableNum: number = 1;
    if (group) {
      group.predictorVariables.forEach(pVariable => {
        if (pVariable.productionInAnalysis) {
          options.push(variableNum);
          variableNum++;
        }
      });
    }
    return options;
  });

  hasLaterDate: Signal<boolean> = computed(() => {
    const group = this.group();
    const predictorData = this.facilityPredictorData();
    const meterData = this.facilityMeterData();
    const meters = this.facilityMeters();
    if (group && predictorData && meterData) {
      let modelDate: Date = new Date(group.dateModelsGenerated);
      let hasLaterPredictorData = predictorData.find(predictor => {
        return new Date(predictor.modifiedDate) > modelDate;
      });
      if (hasLaterPredictorData) {
        return true;
      } else {
        let groupMeters: Array<IdbUtilityMeter> = meters.filter(meter => { return meter.groupId == group.idbGroupId });
        let groupMeterIds: Array<string> = groupMeters.map(meter => { return meter.guid });
        let groupMeterData: Array<IdbUtilityMeterData> = meterData.filter(meterData => { return groupMeterIds.includes(meterData.meterId) })
        let hasLaterMeterData = groupMeterData.find(meterData => {
          return new Date(meterData.dbDate) > modelDate;
        });
        if (hasLaterMeterData) {
          return true;
        }
      }
    }
    return false;
  });

  generatedModels: Signal<Array<JStatRegressionModel>> = computed(() => {
    const group = this.group();
    const generatedModelsPerGroup = this.generatedModelsPerGroup();
    if (group && generatedModelsPerGroup && generatedModelsPerGroup[group.idbGroupId]) {
      return generatedModelsPerGroup[group.idbGroupId];
    }
    return [];
  });

  groupStatusCheck: Signal<AnalysisGroupStatusCheck> = computed(() => {
    const selectedGroup = this.group();
    const facilityStatusCheck = this.facilityStatusCheck();
    const analysisItem = this.analysisItem();
    if (selectedGroup && analysisItem && facilityStatusCheck) {
      return facilityStatusCheck.getGroupStatusChecksByGroupId(selectedGroup.idbGroupId, analysisItem.guid);
    }
    return null;
  });

  // --- UI State ---
  showUpdateModelsModal: boolean = false;
  showConfirmModelTypeChange: boolean = false;
  noValidModels: Signal<boolean> = computed(() => {
    const generatedModels = this.generatedModels();
    if (generatedModels.length == 0) {
      return true;
    } else if (generatedModels.length == 1) {
      //one model means just the selected model
      return false;
    }
    return generatedModels.some(model => model.isValid === true) == false;
  });
  showConfirmPredictorChangeModel: boolean = false;
  modelingError: WritableSignal<boolean> = signal(false);
  generatingModels: WritableSignal<boolean> = signal(false);
  months: Array<Month> = Months;
  changedModel: { modelId: string, oldModel: JStatRegressionModel, newModel: JStatRegressionModel } | null = null;
  showModelComparison: boolean = false;
  private lastPredictorIds: Array<string> = [];
  private ownerKey: string;
  private modelFields: AnalysisGroupChanges = {};
  readonly autosave = new AnalysisAutosave<RegressionDraft>((draft, baseline) => this.persistDraft(draft, baseline));

  // --- Form ---
  form: RegressionMenuForm = this.fb.group({
    isGeneratedModel: this.fb.control<boolean>(true),
    maxModelVariables: this.fb.control<number>(4),
    regressionConstant: this.fb.control<number>(undefined),
    regressionModelYear: this.fb.control<number>(undefined),
    regressionModelStartMonth: this.fb.control<number>(undefined),
    regressionStartYear: this.fb.control<number>(undefined),
    regressionModelEndMonth: this.fb.control<number>(undefined),
    regressionEndYear: this.fb.control<number>(undefined),
    regressionModelNotes: this.fb.control<string>(''),
    predictorVariables: this.fb.array<PredictorVariableForm>([]),
  });

  get predictorVariablesArray(): FormArray<PredictorVariableForm> {
    return this.form.controls.predictorVariables;
  }

  constructor() {
    effect(() => {
      const group = this.group();
      const analysisGuid = this.analysisItem()?.guid;
      const accountGuid = this.selectedAccount()?.guid;
      if (!group || !analysisGuid) { return; }
      untracked(() => {
        const ownerKey = accountGuid + ':' + analysisGuid + ':' + group.idbGroupId;
        const changedOwner = this.ownerKey !== ownerKey;
        this.reconcilePredictors(group, changedOwner);
        if (changedOwner || !this.autosave.hasPending) {
          this.ownerKey = ownerKey;
          this.writeDraft(this.draftFromGroup(group));
          // Clamp only the local presentation; loading an editor never saves a setting.
          const options = this.numVariableOptions();
          if (options.length && !options.includes(this.form.controls.maxModelVariables.value)) {
            this.form.controls.maxModelVariables.setValue(options[options.length - 1], { emitEvent: false });
          }
          this.form.markAsPristine();
          this.autosave.hydrate(this.readDraft(), this.form.valid);
        }
      });
    });
    this.destroyRef.onDestroy(() => this.autosave.destroy());
  }

  private reconcilePredictors(group: AnalysisGroup, changedOwner: boolean): void {
    const incomingIds = group.predictorVariables.map(variable => variable.id);
    if (!changedOwner && _.isEqual(this.lastPredictorIds, incomingIds)) { return; }
    const existing = new Map(this.lastPredictorIds.map((id, index) => [id, this.predictorVariablesArray.at(index)]));
    this.predictorVariablesArray.clear({ emitEvent: false });
    group.predictorVariables.forEach(variable => {
      const control = !changedOwner && existing.get(variable.id) || this.fb.group({
        productionInAnalysis: this.fb.control(variable.productionInAnalysis ?? false),
        regressionCoefficient: this.fb.control(variable.regressionCoefficient)
      }) as PredictorVariableForm;
      this.predictorVariablesArray.push(control, { emitEvent: false });
    });
    this.lastPredictorIds = incomingIds;
  }

  // --- Form Helpers ---
  private updateFieldDisabledStates(isGeneratedModel: boolean): void {
    this.form.controls.regressionConstant.setValidators(isGeneratedModel ? null : Validators.required);
    this.form.controls.regressionConstant.updateValueAndValidity({ emitEvent: false });
    const disableWhenGenerated = [this.form.controls.regressionConstant, this.form.controls.regressionModelYear];
    disableWhenGenerated.forEach(control => isGeneratedModel ? control.disable({ emitEvent: false }) : control.enable({ emitEvent: false }));
    for (const control of [this.form.controls.regressionModelStartMonth, this.form.controls.regressionStartYear,
      this.form.controls.regressionModelEndMonth, this.form.controls.regressionEndYear]) {
      control.setValidators(isGeneratedModel ? null : Validators.required);
      control.updateValueAndValidity({ emitEvent: false });
    }
    this.predictorVariablesArray.controls.forEach(control => {
      const coefficient = control.controls.regressionCoefficient;
      coefficient.setValidators(!isGeneratedModel && control.controls.productionInAnalysis.value ? Validators.required : null);
      isGeneratedModel ? coefficient.disable({ emitEvent: false }) : coefficient.enable({ emitEvent: false });
      coefficient.updateValueAndValidity({ emitEvent: false });
    });
  }

  private formValueToGroup(): AnalysisGroup {
    const raw = this.form.getRawValue();
    const currentGroup = this.group();
    return {
      ...currentGroup,
      ...this.modelFields,
      isGeneratedModel: raw.isGeneratedModel,
      maxModelVariables: raw.maxModelVariables,
      regressionConstant: raw.regressionConstant,
      regressionModelYear: raw.regressionModelYear,
      regressionModelStartMonth: raw.regressionModelStartMonth,
      regressionStartYear: raw.regressionStartYear,
      regressionModelEndMonth: raw.regressionModelEndMonth,
      regressionEndYear: raw.regressionEndYear,
      regressionModelNotes: raw.regressionModelNotes,
      predictorVariables: currentGroup.predictorVariables.map((v, i) => {
        const rawVar = raw.predictorVariables[this.lastPredictorIds.indexOf(v.id)];
        return {
          ...v,
          productionInAnalysis: rawVar !== undefined ? rawVar.productionInAnalysis : v.productionInAnalysis,
          regressionCoefficient: rawVar !== undefined ? rawVar.regressionCoefficient : v.regressionCoefficient,
        };
      }),
    };
  }

  private draftFromGroup(group: AnalysisGroup): RegressionDraft {
    return {
      accountGuid: this.selectedAccount()?.guid, analysisGuid: this.analysisItem()?.guid, groupGuid: group.idbGroupId,
      values: {
        isGeneratedModel: group.isGeneratedModel, maxModelVariables: group.maxModelVariables,
        regressionConstant: group.regressionConstant, regressionModelYear: group.regressionModelYear,
        regressionModelStartMonth: group.regressionModelStartMonth, regressionStartYear: group.regressionStartYear,
        regressionModelEndMonth: group.regressionModelEndMonth, regressionEndYear: group.regressionEndYear,
        regressionModelNotes: group.regressionModelNotes ?? '', models: group.models,
        selectedModelId: group.selectedModelId, dateModelsGenerated: group.dateModelsGenerated,
        predictorVariables: group.predictorVariables.map(variable => ({
          id: variable.id, productionInAnalysis: variable.productionInAnalysis ?? false,
          regressionCoefficient: variable.regressionCoefficient
        }))
      }
    };
  }

  private readDraft(): RegressionDraft {
    const { predictorVariables, ...fields } = this.form.getRawValue();
    return {
      accountGuid: this.selectedAccount()?.guid, analysisGuid: this.analysisItem()?.guid, groupGuid: this.group()?.idbGroupId,
      values: { ...this.modelFields, ...fields, predictorVariables: predictorVariables.map((variable, index) => ({
        id: this.lastPredictorIds[index], ...variable
      })) }
    };
  }

  private writeDraft(draft: RegressionDraft): void {
    const { predictorVariables, models, selectedModelId, dateModelsGenerated, ...fields } = draft.values;
    this.modelFields = { models, selectedModelId, dateModelsGenerated };
    for (const field of Object.keys(fields)) {
      const control = this.form.controls[field];
      if (control && !_.isEqual(control.value, fields[field])) { control.setValue(fields[field], { emitEvent: false }); }
    }
    predictorVariables?.forEach(variable => {
      const index = this.lastPredictorIds.indexOf(variable.id);
      if (index < 0) { return; }
      const control = this.predictorVariablesArray.at(index);
      for (const field of ['productionInAnalysis', 'regressionCoefficient']) {
        if (!_.isEqual(control.controls[field].value, variable[field])) {
          control.controls[field].setValue(variable[field], { emitEvent: false });
        }
      }
    });
    this.updateFieldDisabledStates(this.form.controls.isGeneratedModel.value);
  }

  ngOnDestroy(): void { this.regressionModelsService.terminateCurrentWorker(); }

  saveFormValue(immediate = false): Promise<boolean> {
    this.updateFieldDisabledStates(this.form.controls.isGeneratedModel.value);
    return this.autosave.capture(this.readDraft(), this.form.valid, immediate);
  }

  private async persistDraft(draft: RegressionDraft, baseline: RegressionDraft): Promise<void> {
    const changes = getAnalysisGroupChanges(baseline.values, draft.values);
    if (!Object.keys(changes).length) { return; }
    await this.commandBoundary.execute(
      { entityKind: 'facilityAnalysis', changeKind: 'update', entityGuid: draft.analysisGuid, label: 'Save Facility Analysis',
        publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'facilityAnalyses', upsert: [value] }] }) } },
      () => this.analysisHandler.updateFacilityAnalysisGroup(draft.analysisGuid, draft.groupGuid, changes, draft.accountGuid)
    );
    if (this.isCurrentOwner(draft.accountGuid, draft.analysisGuid, draft.groupGuid)
      && ((Object.prototype.hasOwnProperty.call(changes, 'models') && !draft.values.models?.length)
        || Object.prototype.hasOwnProperty.call(changes, 'isGeneratedModel')
        || Object.prototype.hasOwnProperty.call(changes, 'maxModelVariables')
        || changes.predictorVariables?.some(variable => Object.prototype.hasOwnProperty.call(variable, 'productionInAnalysis')))) {
      this.regressionModelState.setForGroup(draft.groupGuid, []);
    }
  }

  saveItem(group?: AnalysisGroup, before = this.group()): Promise<boolean> {
    return this.captureChanges(getAnalysisGroupChanges(before, group ?? this.group()));
  }

  saveModelSelection(group: AnalysisGroup): Promise<boolean> {
    if (group.idbGroupId !== this.group()?.idbGroupId) { return Promise.resolve(false); }
    return this.captureChanges({
      selectedModelId: group.selectedModelId, regressionConstant: group.regressionConstant,
      regressionModelYear: group.regressionModelYear, models: _.cloneDeep(group.models),
      predictorVariables: group.predictorVariables.map(variable => ({ id: variable.id, regressionCoefficient: variable.regressionCoefficient }))
    });
  }

  private captureChanges(changes: AnalysisGroupChanges): Promise<boolean> {
    const draft = this.readDraft();
    const previous = this.autosave.value;
    if (this.destroyRef.destroyed || !previous || previous.accountGuid !== draft.accountGuid
      || previous.analysisGuid !== draft.analysisGuid || previous.groupGuid !== draft.groupGuid) { return Promise.resolve(false); }
    if (this.autosave.hasPending && !this.autosave.valid) {
      this.writeDraft(previous);
      this.form.markAllAsTouched();
      return Promise.resolve(false);
    }
    const { predictorVariables, ...fields } = _.cloneDeep(changes);
    draft.values = { ...draft.values, ...fields, predictorVariables: draft.values.predictorVariables.map(variable => ({
      ...variable, ...predictorVariables?.find(change => change.id === variable.id)
    })) };
    this.writeDraft(draft);
    // Capture the complete latest intent synchronously, before another leave decision can run.
    return this.autosave.capture(draft, true, true);
  }

  flushChanges(): Promise<boolean> { return this.autosave.flush(); }

  canDeactivate(): Promise<boolean> {
    return this.autosave.canDeactivate(this.routerGuardService, draft => this.writeDraft(draft));
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.autosave.hasPending) { event.preventDefault(); event.returnValue = ''; }
  }

  private isCurrentOwner(accountGuid: string, analysisGuid: string, groupGuid: string): boolean {
    return !this.destroyRef.destroyed && this.accountWorkspaceStore.account()?.guid === accountGuid
      && this.analysisItem()?.guid === analysisGuid && this.group()?.idbGroupId === groupGuid;
  }

  // --- Model Management ---
  onModelTypeChange() {
    const generatedModels = this.generatedModels();
    if (generatedModels.length > 0) {
      this.showConfirmModelTypeChange = true;
    } else {
      this.changeModelType();
    }
  }

  cancelModelTypeChange() {
    // Revert the select back to its previous value
    const current = this.form.controls.isGeneratedModel.value;
    this.form.controls.isGeneratedModel.setValue(!current, { emitEvent: false });
    // revert maxModelVariables to previous value if switching back to generated model and options have changed
    this.form.controls.maxModelVariables.setValue(this.group().maxModelVariables, { emitEvent: false });

    this.showConfirmModelTypeChange = false;
  }

  async changeModelType() {
    this.showConfirmModelTypeChange = false;
    const isGeneratedModel = this.form.controls.isGeneratedModel.value;
    const group = this.group();
    await this.captureChanges({
      isGeneratedModel, maxModelVariables: this.form.controls.maxModelVariables.value,
      models: undefined, selectedModelId: undefined, dateModelsGenerated: undefined,
      ...(isGeneratedModel ? {
        regressionModelYear: undefined, regressionConstant: undefined,
        predictorVariables: group.predictorVariables.map(variable => ({ id: variable.id, regressionCoefficient: undefined }))
      } : {})
    });
  }

  async generateModels() {
    const accountGuid = this.selectedAccount()?.guid;
    const analysisGuid = this.analysisItem()?.guid;
    const groupGuid = this.group()?.idbGroupId;
    if (!accountGuid || !analysisGuid || !groupGuid) { return; }
    if (this.autosave.hasPending && !await this.flushChanges()) { this.form.markAllAsTouched(); return; }
    if (!this.isCurrentOwner(accountGuid, analysisGuid, groupGuid)) { return; }
    const group = _.cloneDeep(this.formValueToGroup());
    const _analysisItem = this.analysisItem();
    const _selectedFacility = this.selectedFacility();
    const _meters = this.facilityMeters();
    const _meterData = this.facilityMeterData();
    const _predictorData = this.facilityPredictorData();
    const assessmentReportVersion = this.selectedAccount()?.assessmentReportVersion ?? 'AR6';

    const previousSelectedModelId = group.selectedModelId;
    const previousSelectedModel = group?.models?.find(model => model.modelId === previousSelectedModelId);

    this.generatingModels.set(true);
    this.modelingError.set(false);

    try {
      const generatedModels = await this.regressionModelsService.generateModels(
        group, _analysisItem, _selectedFacility, _meters, _meterData, _predictorData, assessmentReportVersion
      );
      if (!this.isCurrentOwner(accountGuid, _analysisItem.guid, group.idbGroupId)) { return; }
      await this.handleGenerateResult(generatedModels, group, previousSelectedModelId, previousSelectedModel, accountGuid, _analysisItem);
    } catch {
      if (this.isCurrentOwner(accountGuid, _analysisItem.guid, group.idbGroupId)) {
        this.modelingError.set(true);
        this.generatingModels.set(false);
      }
    }
  }

  private async handleGenerateResult(
    generatedModels: Array<JStatRegressionModel>,
    group: AnalysisGroup,
    previousSelectedModelId: string | undefined,
    previousSelectedModel: JStatRegressionModel | undefined,
    accountGuid: string,
    analysisItem: IdbAnalysisItem
  ): Promise<void> {
    const { updatedGroup, newSelectedModel } = this.regressionModelsService.applyGeneratedModelsToGroup(
      group,
      generatedModels,
      previousSelectedModelId,
      previousSelectedModel,
      this.selectedFacility(),
      analysisItem.baselineYear
    );
    if (previousSelectedModelId) {
      this.compareUpdatedModel(previousSelectedModel, newSelectedModel);
    }
    this.regressionModelState.setForGroup(
      updatedGroup.idbGroupId,
      updatedGroup.isGeneratedModel ? generatedModels : []
    );
    // Regeneration can change the selected model's coefficients even when the
    // logical model is equivalent, so refresh the form from the saved group.
    await this.saveItem(updatedGroup, group);
    if (this.isCurrentOwner(accountGuid, analysisItem.guid, group.idbGroupId)) {
      this.generatingModels.set(false);
    }
  }

  compareUpdatedModel(previousModel: JStatRegressionModel, newModel: JStatRegressionModel) {
    this.changedModel = null;

    if (previousModel && newModel) {
      if (previousModel.R2 !== newModel.R2 || previousModel.adjust_R2 !== newModel.adjust_R2 || previousModel.modelPValue !== newModel.modelPValue ||
        !_.isEqual(previousModel.coef, newModel.coef)) {
        this.changedModel = {
          modelId: previousModel.modelId,
          oldModel: previousModel,
          newModel: newModel
        };
      }
    }
  }

  // --- Modals ---
  openModelComparisonModal() {
    this.showModelComparison = true;
  }

  closeModal() {
    this.showModelComparison = false;
  }

  updateModels() {
    this.sharedDataService.modalOpen.next(true);
    this.showUpdateModelsModal = true;
  }

  closeUpdateModelsModal() {
    this.sharedDataService.modalOpen.next(false);
    this.showUpdateModelsModal = false;
  }

  async confirmUpdateModals() {
    const accountGuid = this.selectedAccount()?.guid;
    const analysisGuid = this.analysisItem()?.guid;
    const groupGuid = this.group()?.idbGroupId;
    await this.generateModels();
    if (this.isCurrentOwner(accountGuid, analysisGuid, groupGuid)) { this.closeUpdateModelsModal(); }
  }


  // --- Predictor Management ---
  toggledPredictorIndex: number | null = null;

  async onPredictorChange(index: number) {
    const isGeneratedModel = this.form.controls.isGeneratedModel.value;
    this.toggledPredictorIndex = index;
    if (isGeneratedModel && this.modelFields.selectedModelId) {
      this.showConfirmPredictorChangeModel = true;
    } else if (isGeneratedModel) {
      await this.confirmTogglePredictor();
    } else {
      await this.saveFormValue(true);
    }
  }

  async cancelTogglePredictor() {
    if (this.toggledPredictorIndex !== null) {
      const ctrl = this.predictorVariablesArray.at(this.toggledPredictorIndex);
      ctrl.controls.productionInAnalysis.setValue(!ctrl.controls.productionInAnalysis.value, { emitEvent: false });
    }
    this.showConfirmPredictorChangeModel = false;
    this.toggledPredictorIndex = null;
  }

  async confirmTogglePredictor() {
    const group = this.group();
    const index = this.toggledPredictorIndex;
    if (index === null || !group.predictorVariables[index]) { return; }
    const toggledId = group.predictorVariables[index].id;
    const productionInAnalysis = this.predictorVariablesArray.at(index).controls.productionInAnalysis.value;
    const accountGuid = this.selectedAccount()?.guid;
    const analysisGuid = this.analysisItem()?.guid;
    const saved = await this.captureChanges({
      models: undefined, selectedModelId: undefined, dateModelsGenerated: undefined,
      regressionModelYear: undefined, regressionConstant: undefined,
      predictorVariables: group.predictorVariables.map(variable => ({
        id: variable.id, regressionCoefficient: undefined,
        ...(variable.id === toggledId ? { productionInAnalysis } : {})
      }))
    });
    if (!saved) { return; }
    if (this.isCurrentOwner(accountGuid, analysisGuid, group.idbGroupId)) {
      this.showConfirmPredictorChangeModel = false;
      this.toggledPredictorIndex = null;
    }
  }
}
