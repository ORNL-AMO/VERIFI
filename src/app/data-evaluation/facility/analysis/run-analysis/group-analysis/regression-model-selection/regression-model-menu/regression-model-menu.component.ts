import { Component, computed, effect, inject, Signal, signal, WritableSignal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AnalysisService } from 'src/app/data-evaluation/facility/analysis/analysis.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AnalysisGroup, AnalysisGroupPredictorVariable, JStatRegressionModel } from 'src/app/models/analysis';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { RegressionModelsService } from 'src/app/shared/shared-analysis/calculations/regression-models.service';
import * as _ from 'lodash';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { getFiscalYear, getNeededUnits } from 'src/app/calculations/shared-calculations/calanderizationFunctions';
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
import { AnalysisGroupValidationService } from 'src/app/shared/validation/services/analysis-group-validation.service';
import { emptyGroupAnalysisErrors } from 'src/app/shared/validation/groupAnalysisValidation';
import { GroupAnalysisErrors } from 'src/app/models/validation';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { RegressionModelsCalculator } from 'src/app/shared/shared-analysis/calculations/regression-models-calculator';

@Component({
  selector: 'app-regression-model-menu',
  templateUrl: './regression-model-menu.component.html',
  styleUrls: ['./regression-model-menu.component.css'],
  standalone: false
})
export class RegressionModelMenuComponent {

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
  private analysisGroupValidationService: AnalysisGroupValidationService = inject(AnalysisGroupValidationService);

  group: Signal<AnalysisGroup> = toSignal(this.analysisService.selectedGroup);
  calanderizedMeters: Signal<Array<CalanderizedMeter>> = toSignal(this.calanderizationService.calanderizedMeters);
  selectedFacility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility);
  analysisItem: Signal<IdbAnalysisItem> = toSignal(this.analysisDbService.selectedAnalysisItem);
  facilityPredictorData: Signal<Array<IdbPredictorData>> = toSignal(this.predictorDataDbService.facilityPredictorData);
  facilityMeterData: Signal<Array<IdbUtilityMeterData>> = toSignal(this.utilityMeterDataDbService.facilityMeterData);
  facilityMeters: Signal<Array<IdbUtilityMeter>> = toSignal(this.utilityMeterDbService.facilityMeters);
  generatedModelsPerGroup: Signal<{ [groupId: string]: Array<JStatRegressionModel> }> = toSignal(this.analysisDbService.generatedModelsPerGroup, { initialValue: {} });
  allGroupErrors = toSignal(this.analysisGroupValidationService.allGroupErrors, { initialValue: [] });
  selectedAccount: Signal<IdbAccount> = toSignal(this.accountDbService.selectedAccount);

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

  showUpdateModelsModal: boolean = false;
  noValidModels: Signal<boolean> = computed(() => {
    const generatedModels = this.generatedModels();
    if (generatedModels.length == 0) {
      return true;
    }
    return generatedModels.some(model => {
      return model.isValid === true;
    }) == false;
  });
  showConfirmPredictorChangeModel: boolean = false;
  modelingError: WritableSignal<boolean> = signal(false);
  generatingModels: WritableSignal<boolean> = signal(false);
  // isFormChange: boolean;
  months: Array<Month> = Months;
  changedModel: { modelId: string, oldModel: JStatRegressionModel, newModel: JStatRegressionModel } | null = null;
  showModelComparison: boolean = false;
  private worker: Worker;


  constructor() {
    effect(() => {
      const years = this.yearOptions();
      const group = this.group();
      if (group && years.length > 0) {
        const updates: Partial<AnalysisGroup> = {};
        if (!group.regressionModelStartMonth) {
          updates.regressionModelStartMonth = 0;
        }
        if (!group.regressionModelEndMonth) {
          updates.regressionModelEndMonth = 11;
        }
        if (!group.regressionStartYear) {
          updates.regressionStartYear = years[0];
        }
        if (!group.regressionEndYear) {
          updates.regressionEndYear = years[years.length - 1];
        }
        if (Object.keys(updates).length > 0) {
          //TODO: handle update
          // this.analysisService.updateGroup({ ...group, ...updates });
        }
      }
    });

    effect(() => {
      let _group: AnalysisGroup = _.cloneDeep(this.group());
      const numVariableOptions = this.numVariableOptions();
      if (_group && numVariableOptions.length > 0) {
        if (!numVariableOptions.includes(_group.maxModelVariables)) {
          _group.maxModelVariables = numVariableOptions[numVariableOptions.length - 1];
          this.saveItem(_group);
        }
      }
    });
  }

  ngOnInit() {
    const group = this.group();
    const generatedModels = this.generatedModels();
    if (group && group.models == undefined && group.isGeneratedModel && generatedModels.length == 0) {
      if (group.predictorVariables && group.predictorVariables.length < 7) {
        untracked(() => this.generateModels());
      }
    }
  }

  ngOnDestroy(): void {
    this.worker?.terminate();
  }

  async saveItem(group?: AnalysisGroup) {
    console.log('save...')
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

  async changeModelType() {
    const _group: AnalysisGroup = _.cloneDeep(this.group());
    //TODO handle generated models on change model type
    // this.generatedModels = undefined;
    _group.models = undefined;
    _group.selectedModelId = undefined;
    _group.dateModelsGenerated = undefined;
    this.analysisDbService.setGeneratedModelsForGroup(_group.idbGroupId, []);
    if (_group.isGeneratedModel) {
      _group.predictorVariables.forEach(variable => {
        variable.regressionCoefficient = undefined;
      });
      _group.regressionModelYear = undefined;
      _group.regressionConstant = undefined;
    }
    await this.saveItem(_group);
  }

  async generateModels(autoSelect?: boolean) {
    const _group = _.cloneDeep(this.group());
    const _analysisItem = this.analysisItem();
    const _selectedFacility = this.selectedFacility();
    const _meters = this.facilityMeters();
    const _meterData = this.facilityMeterData();
    const _predictorData = this.facilityPredictorData();
    const _account = this.selectedAccount();

    const previousSelectedModelId = _group.selectedModelId;
    const previousSelectedModel = _group?.models?.find(model => model.modelId === previousSelectedModelId);

    this.worker?.terminate();
    this.generatingModels.set(true);
    this.modelingError.set(false);

    const handleResult = async (generatedModels: Array<JStatRegressionModel>) => {
      if (generatedModels) {
        _group.dateModelsGenerated = new Date();
        const newSelectedModel = generatedModels.find(model => model.modelId === _group.selectedModelId);

        if (previousSelectedModelId) {
          const previousModelExists = generatedModels.find(model => model.modelId === previousSelectedModelId);
          if (previousModelExists) {
            _group.selectedModelId = previousSelectedModelId;
          }
          this.compareUpdatedModel(previousSelectedModel, newSelectedModel);
        }

        if (_group.selectedModelId) {
          const selectedModel = generatedModels.find(model => model.modelId === _group.selectedModelId);
          _group.models = selectedModel ? [selectedModel] : [];
          if (selectedModel) {
            _group.regressionConstant = selectedModel.coef[0];
            _group.regressionModelYear = selectedModel.modelYear;
            _group.predictorVariables.forEach(variable => {
              const coefIndex = selectedModel.predictorVariables.findIndex(pVariable => pVariable.id == variable.id);
              variable.regressionCoefficient = coefIndex !== -1 ? selectedModel.coef[coefIndex + 1] : 0;
            });
          }
        }

        if (autoSelect) {
          const bestModel: JStatRegressionModel = _.maxBy(generatedModels, 'adjust_R2');
          if (bestModel) {
            _group.selectedModelId = bestModel.modelId;
            _group.regressionConstant = bestModel.coef[0];
            _group.regressionModelYear = bestModel.modelYear;
            _group.predictorVariables.forEach(variable => {
              const coefIndex = bestModel.predictorVariables.findIndex(pVariable => pVariable.id == variable.id);
              variable.regressionCoefficient = coefIndex !== -1 ? bestModel.coef[coefIndex + 1] : 0;
            });
          }
          _group.models = bestModel ? [bestModel] : [];
        }

        this.analysisDbService.setGeneratedModelsForGroup(_group.idbGroupId, generatedModels);
        await this.saveItem(_group);
      } else {
        this.modelingError.set(true);
      }
      this.generatingModels.set(false);
    };

    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../../../../../../../web-workers/regression-models.worker', import.meta.url));
      this.worker.onmessage = async ({ data }) => {
        if (!data.error) {
          await handleResult(data.generatedModels);
        } else {
          this.modelingError.set(true);
          this.generatingModels.set(false);
        }
        this.worker.terminate();
      };
      this.worker.postMessage({
        group: JSON.parse(JSON.stringify(_group)),
        analysisItem: JSON.parse(JSON.stringify(_analysisItem)),
        facility: _selectedFacility,
        meters: _meters,
        meterData: _meterData,
        facilityPredictorData: _predictorData,
        assessmentReportVersion: _account?.assessmentReportVersion ?? 'AR6'
      });
    } else {
      // Fallback: no Web Worker support
      try {
        const calanderizedMeters = getCalanderizedMeterData(
          _meters, _meterData, _selectedFacility, false,
          { energyIsSource: _analysisItem.energyIsSource, neededUnits: getNeededUnits(_analysisItem) },
          [], [], [_selectedFacility], _account?.assessmentReportVersion ?? 'AR6', []
        );
        const calculator = new RegressionModelsCalculator(_predictorData);
        const generatedModels = calculator.getModels(_group, calanderizedMeters, _selectedFacility, _analysisItem);
        await handleResult(generatedModels);
      } catch {
        this.modelingError.set(true);
        this.generatingModels.set(false);
      }
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


  toggledPredictor: AnalysisGroupPredictorVariable;
  async togglePredictor(predictor: AnalysisGroupPredictorVariable) {
    this.toggledPredictor = predictor;
    predictor.productionInAnalysis = !predictor.productionInAnalysis;
    const group = this.group();
    if (group.isGeneratedModel && group.selectedModelId) {
      this.showConfirmPredictorChangeModel = true;
    } else if (group.isGeneratedModel) {
      await this.confirmTogglePredictor();
    } else {
      await this.saveItem();
    }
  }

  async cancelTogglePredictor() {
    let _group: AnalysisGroup = _.cloneDeep(this.group());
    _group.predictorVariables.forEach(variable => {
      if (variable.id === this.toggledPredictor.id) {
        variable.productionInAnalysis = !variable.productionInAnalysis;
      }
    });
    await this.saveItem(_group);
    this.showConfirmPredictorChangeModel = false;
    this.toggledPredictor = undefined;
  }

  async confirmTogglePredictor() {
    const _group: AnalysisGroup = _.cloneDeep(this.group());
    _group.predictorVariables.forEach(variable => {
      variable.regressionCoefficient = undefined;
    });
    _group.models = undefined;
    _group.selectedModelId = undefined;
    _group.dateModelsGenerated = undefined;
    _group.regressionModelYear = undefined;
    _group.regressionConstant = undefined;
    this.analysisDbService.setGeneratedModelsForGroup(_group.idbGroupId, []);
    await this.saveItem(_group);
    this.showConfirmPredictorChangeModel = false;
  }
}