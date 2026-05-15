import { Component, computed, effect, inject, Signal, signal, WritableSignal } from '@angular/core';
import { FormArray, FormControl, FormGroup, NonNullableFormBuilder } from '@angular/forms';
import { firstValueFrom, map } from 'rxjs';
import { AnalysisService } from 'src/app/data-evaluation/facility/analysis/analysis.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AnalysisGroup, JStatRegressionModel } from 'src/app/models/analysis';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import * as _ from 'lodash';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { Month, Months } from 'src/app/shared/form-data/months';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { getAllYearsWithData } from 'src/app/calculations/shared-calculations/calculationsHelpers';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { emptyGroupAnalysisErrors } from 'src/app/shared/validation/groupAnalysisValidation';
import { GroupAnalysisErrors } from 'src/app/models/validation';
import { RegressionModelsService } from 'src/app/shared/shared-analysis/calculations/regression-models.service';

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

  // --- Services (DI) ---
  private analysisDbService: AnalysisDbService = inject(AnalysisDbService);
  private analysisService: AnalysisService = inject(AnalysisService);
  private dbChangesService: DbChangesService = inject(DbChangesService);
  private accountDbService: AccountdbService = inject(AccountdbService);
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private utilityMeterDbService: UtilityMeterdbService = inject(UtilityMeterdbService);
  private utilityMeterDataDbService: UtilityMeterDatadbService = inject(UtilityMeterDatadbService);
  private sharedDataService: SharedDataService = inject(SharedDataService);
  private predictorDataDbService: PredictorDataDbService = inject(PredictorDataDbService);
  private calanderizationService: CalanderizationService = inject(CalanderizationService);
  private fb: NonNullableFormBuilder = inject(NonNullableFormBuilder);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);
  private regressionModelsService: RegressionModelsService = inject(RegressionModelsService);

  // --- Signals ---
  group: Signal<AnalysisGroup> = toSignal(this.analysisService.selectedGroup);
  calanderizedMeters: Signal<Array<CalanderizedMeter>> = toSignal(this.calanderizationService.calanderizedMeters);
  selectedFacility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility);
  analysisItem: Signal<IdbAnalysisItem> = toSignal(this.analysisDbService.selectedAnalysisItem);
  facilityPredictorData: Signal<Array<IdbPredictorData>> = toSignal(this.predictorDataDbService.facilityPredictorData);
  facilityMeterData: Signal<Array<IdbUtilityMeterData>> = toSignal(this.utilityMeterDataDbService.facilityMeterData);
  facilityMeters: Signal<Array<IdbUtilityMeter>> = toSignal(this.utilityMeterDbService.facilityMeters);
  generatedModelsPerGroup: Signal<{ [groupId: string]: Array<JStatRegressionModel> }> = toSignal(this.analysisDbService.generatedModelsPerGroup, { initialValue: {} });
  allGroupErrors = toSignal(this.accountStatusCheckService.accountStatusCheck.pipe(
    map(check => check?.allGroupErrors ?? [])
  ), { initialValue: [] });
  selectedAccount: Signal<IdbAccount> = toSignal(this.accountDbService.selectedAccount);

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

  groupErrors: Signal<GroupAnalysisErrors> = computed(() => {
    const selectedGroup = this.group();
    const allGroupErrors = this.allGroupErrors();
    const analysisItem = this.analysisItem();
    if (selectedGroup && analysisItem) {
      const groupError = allGroupErrors.find(groupError => {
        return groupError.groupId == selectedGroup.idbGroupId && groupError.analysisId == analysisItem.guid
      });
      if (groupError) {
        return groupError;
      } else {
        return emptyGroupAnalysisErrors();
      }
    }
    return emptyGroupAnalysisErrors();
  });

  // --- UI State ---
  showUpdateModelsModal: boolean = false;
  showConfirmModelTypeChange: boolean = false;
  noValidModels: Signal<boolean> = computed(() => {
    const generatedModels = this.generatedModels();
    if (generatedModels.length == 0) {
      return true;
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
    // Rebuild form whenever the group changes
    effect(() => {
      const group = this.group();
      if (!group) return;

      // Only rebuild FormArray when the predictor list itself changes (IDs added/removed).
      // For value-only changes (coefficients, productionInAnalysis), patchValue below updates
      // the existing controls that the template's formControlName directives are bound to.
      // Rebuilding on value changes creates new FormControl instances that the already-live
      // formControlName directives are NOT registered with, so the DOM never updates.
      const incomingIds = group.predictorVariables.map(v => v.id);
      if (!_.isEqual(this.lastPredictorIds, incomingIds)) {
        this.lastPredictorIds = incomingIds;
        this.predictorVariablesArray.clear({ emitEvent: false });
        group.predictorVariables.forEach(v => {
          this.predictorVariablesArray.push(
            this.fb.group({
              productionInAnalysis: this.fb.control<boolean>(v.productionInAnalysis ?? false),
              regressionCoefficient: this.fb.control<number>(v.regressionCoefficient),
            }) as PredictorVariableForm,
            { emitEvent: false }
          );
        });
      }
      // Patch the scalar fields without triggering valueChanges
      this.form.patchValue({
        isGeneratedModel: group.isGeneratedModel,
        maxModelVariables: group.maxModelVariables,
        regressionConstant: group.regressionConstant,
        regressionModelYear: group.regressionModelYear,
        regressionModelStartMonth: group.regressionModelStartMonth,
        regressionStartYear: group.regressionStartYear,
        regressionModelEndMonth: group.regressionModelEndMonth,
        regressionEndYear: group.regressionEndYear,
        regressionModelNotes: group.regressionModelNotes ?? '',
        predictorVariables: group.predictorVariables.map(v => ({
          productionInAnalysis: v.productionInAnalysis ?? false,
          regressionCoefficient: v.regressionCoefficient,
        })),
      }, { emitEvent: false });

      // Keep generated-model fields disabled/enabled
      this.updateFieldDisabledStates(group.isGeneratedModel);
    });

    // Clamp maxModelVariables to available options when options change
    effect(() => {
      const numVariableOptions = this.numVariableOptions();
      const current = this.form.controls.maxModelVariables.value;
      if (numVariableOptions.length > 0 && !numVariableOptions.includes(current)) {
        this.form.controls.maxModelVariables.setValue(
          numVariableOptions[numVariableOptions.length - 1],
          { emitEvent: false }
        );
        this.saveFormValue();
      }
    });
  }

  // --- Form Helpers ---
  private updateFieldDisabledStates(isGeneratedModel: boolean): void {
    const disableWhenGenerated = [
      this.form.controls.regressionConstant,
      this.form.controls.regressionModelYear,
    ];
    disableWhenGenerated.forEach(ctrl => {
      isGeneratedModel ? ctrl.disable({ emitEvent: false }) : ctrl.enable({ emitEvent: false });
    });
    this.predictorVariablesArray.controls.forEach(ctrl => {
      isGeneratedModel
        ? ctrl.controls.regressionCoefficient.disable({ emitEvent: false })
        : ctrl.controls.regressionCoefficient.enable({ emitEvent: false });
    });
  }

  private formValueToGroup(): AnalysisGroup {
    const raw = this.form.getRawValue();
    const currentGroup = this.group();
    return {
      ...currentGroup,
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
        const rawVar = raw.predictorVariables[i];
        return {
          ...v,
          productionInAnalysis: rawVar !== undefined ? rawVar.productionInAnalysis : v.productionInAnalysis,
          regressionCoefficient: rawVar !== undefined ? rawVar.regressionCoefficient : v.regressionCoefficient,
        };
      }),
    };
  }

  // --- Lifecycle ---
  ngOnInit() {
    const group = this.group();
    const generatedModels = this.generatedModels();
    if (group && group.models == undefined && group.isGeneratedModel && generatedModels.length == 0) {
      if (group.predictorVariables && group.predictorVariables.length < 7) {
        this.generateModels();
      }
    }
  }

  ngOnDestroy(): void {
    this.regressionModelsService.terminateCurrentWorker();
  }

  // --- Persistence ---
  async saveFormValue(): Promise<void> {
    await this.saveItem(this.formValueToGroup());
  }

  async saveItem(group?: AnalysisGroup) {
    const _group: AnalysisGroup = group ?? this.group();
    const _analysisItemCurrent: IdbAnalysisItem = this.analysisItem();
    const groupIndex: number = _analysisItemCurrent.groups.findIndex(g => g.idbGroupId == _group.idbGroupId);
    const updatedGroups = [..._analysisItemCurrent.groups];
    updatedGroups[groupIndex] = _group;
    const _analysisItem: IdbAnalysisItem = { ..._analysisItemCurrent, isAnalysisVisited: false, groups: updatedGroups };
    await firstValueFrom(this.analysisDbService.updateWithObservable(_analysisItem));
    const selectedAccount: IdbAccount = this.selectedAccount();
    this.dbChangesService.setAnalysisItems(selectedAccount, false, this.selectedFacility());
    this.analysisDbService.selectedAnalysisItem.next(_analysisItem);
    this.analysisService.selectedGroup.next(_group);
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
    const currentGroup = this.group();
    const _group: AnalysisGroup = {
      ...this.formValueToGroup(),
      models: undefined,
      selectedModelId: undefined,
      dateModelsGenerated: undefined,
      ...(isGeneratedModel ? {
        regressionModelYear: undefined,
        regressionConstant: undefined,
        predictorVariables: currentGroup.predictorVariables.map(v => ({ ...v, regressionCoefficient: undefined })),
      } : {}),
    };
    this.analysisDbService.setGeneratedModelsForGroup(_group.idbGroupId, []);
    this.updateFieldDisabledStates(isGeneratedModel);
    await this.saveItem(_group);
  }

  async generateModels(autoSelect = false) {
    const group = _.cloneDeep(this.group());
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
      await this.handleGenerateResult(generatedModels, group, autoSelect, previousSelectedModelId, previousSelectedModel);
    } catch {
      this.modelingError.set(true);
      this.generatingModels.set(false);
    }
  }

  private async handleGenerateResult(
    generatedModels: Array<JStatRegressionModel>,
    group: AnalysisGroup,
    autoSelect: boolean,
    previousSelectedModelId: string | undefined,
    previousSelectedModel: JStatRegressionModel | undefined
  ): Promise<void> {
    const { updatedGroup, newSelectedModel } = this.regressionModelsService.applyGeneratedModelsToGroup(
      group, generatedModels, autoSelect, previousSelectedModelId
    );
    if (previousSelectedModelId) {
      this.compareUpdatedModel(previousSelectedModel, newSelectedModel);
    }
    this.analysisDbService.setGeneratedModelsForGroup(updatedGroup.idbGroupId, generatedModels);
    await this.saveItem(updatedGroup);
    this.generatingModels.set(false);
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
    await this.generateModels();
    this.closeUpdateModelsModal();
  }


  // --- Predictor Management ---
  toggledPredictorIndex: number | null = null;

  async onPredictorChange(index: number) {
    const group = this.group();
    this.toggledPredictorIndex = index;
    if (group.isGeneratedModel && group.selectedModelId) {
      this.showConfirmPredictorChangeModel = true;
    } else if (group.isGeneratedModel) {
      await this.confirmTogglePredictor();
    } else {
      await this.saveFormValue();
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
    const baseGroup = this.formValueToGroup();
    const _group: AnalysisGroup = {
      ...baseGroup,
      models: undefined,
      selectedModelId: undefined,
      dateModelsGenerated: undefined,
      regressionModelYear: undefined,
      regressionConstant: undefined,
      predictorVariables: baseGroup.predictorVariables.map(v => ({
        ...v,
        regressionCoefficient: undefined,
      })),
    };
    this.analysisDbService.setGeneratedModelsForGroup(_group.idbGroupId, []);
    await this.saveItem(_group);
    this.showConfirmPredictorChangeModel = false;
    this.toggledPredictorIndex = null;
  }
}