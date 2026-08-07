import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, computed, inject, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { PredictorCommandHandler } from 'src/app/account-workspace/handlers/predictor-command-handler.service';
import { AnalysisCommandHandler } from 'src/app/account-workspace/handlers/analysis-command-handler.service';
import { AnalysisGroup, AnalysisGroupPredictorVariable, JStatRegressionModel } from 'src/app/models/analysis';
import { getSelectedRegressionModel } from '../../shared-analysis/calculations/regression-model-recovery';
import { WeatherStation } from 'src/app/models/degreeDays';
import { getNewIdbPredictor, IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { WeatherDataService } from 'src/app/weather-data/weather-data.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { getWeatherSearchFromFacility } from 'src/app/shared/sharedHelperFunctions';
import { toSignal } from '@angular/core/rxjs-interop';
import { PredictorStatusCheck } from 'src/app/calculations/status-check-calculations/predictorStatusCheck';
import { AccountStatusCheckService } from '../../helper-services/account-status-check.service';
import { FacilityStatusCheck } from 'src/app/calculations/status-check-calculations/facilityStatusCheck';

interface PredictorListItem {
  predictor: IdbPredictor,
  statusCheck: PredictorStatusCheck,
}

@Component({
  selector: 'app-predictor-table',
  templateUrl: './predictor-table.component.html',
  styleUrl: './predictor-table.component.css',
  standalone: false
})
export class PredictorTableComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private commandBoundary: WorkspaceCommandBoundary = inject(WorkspaceCommandBoundary);
  private predictorHandler: PredictorCommandHandler = inject(PredictorCommandHandler);
  private analysisHandler: AnalysisCommandHandler = inject(AnalysisCommandHandler);
  private router: Router = inject(Router);
  private loadingService: LoadingService = inject(LoadingService);
  private weatherDataService: WeatherDataService = inject(WeatherDataService);
  private toastNotificationService: ToastNotificationsService = inject(ToastNotificationsService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  facilityPredictors: Signal<Array<IdbPredictor>> = computed(() => [...this.accountWorkspaceStore.facilityPredictors()]);
  selectedFacility: Signal<IdbFacility> = this.accountWorkspaceStore.selectedFacility;
  facilityStatusCheck: Signal<FacilityStatusCheck> = toSignal(this.accountStatusCheckService.selectedFacilityStatusCheck$);

  predictorToDelete: IdbPredictor;

  standardPredictors: Signal<Array<PredictorListItem>> = computed(() => {
    const predictors = this.facilityPredictors();
    const facilityStatusCheck = this.facilityStatusCheck();
    if (!predictors || !facilityStatusCheck) return [];
    return predictors.filter(predictor => (predictor.predictorType == 'Standard' || !predictor.predictorType)).map(predictor => {
      return {
        predictor: predictor,
        statusCheck: facilityStatusCheck.predictorsStatusChecks.find(check => check.predictorId == predictor.guid)
      }
    });
  });
  degreeDayPredictors: Signal<Array<PredictorListItem>> = computed(() => {
    const predictors = this.facilityPredictors();
    const facilityStatusCheck = this.facilityStatusCheck();
    if (!predictors || !facilityStatusCheck) return [];
    return predictors.filter(predictor => predictor.predictorType == 'Weather').map(predictor => {
      return {
        predictor: predictor,
        statusCheck: facilityStatusCheck.predictorsStatusChecks.find(check => check.predictorId == predictor.guid)
      }
    });
  });

  hasWeatherDataWarning: Signal<boolean> = computed(() => {
    const degreeDayPredictorsList = this.degreeDayPredictors();
    if (!degreeDayPredictorsList) return false;
    return degreeDayPredictorsList.some(item => item.statusCheck && item.statusCheck.hasWeatherDataWarning);
  });

  hasIgnoredWeatherDataWarning: Signal<boolean> = computed(() => {
    const degreeDayPredictorsList = this.degreeDayPredictors();
    if (!degreeDayPredictorsList) return false;
    return degreeDayPredictorsList.some(item => item.predictor.ignoreWeatherDataWarning);
  });

  predictorUsedGroupIds: Array<string> = [];
  displayDeletePredictor: boolean = false;
  showIgnoreAllWarningsModal: boolean = false;

  selectDelete(predictor: IdbPredictor) {
    this.predictorToDelete = predictor;
    //check if predictor is used in analysis.
    let facilityAnalysisItems: Array<IdbAnalysisItem> = [...this.accountWorkspaceStore.selectedFacilityAnalyses()];
    let allFacilityGroups: Array<AnalysisGroup> = facilityAnalysisItems.flatMap(item => { return item.groups });
    this.predictorUsedGroupIds = new Array();
    for (let i = 0; i < allFacilityGroups.length; i++) {
      let predictorVariables: Array<AnalysisGroupPredictorVariable> = [];
      let group: AnalysisGroup = allFacilityGroups[i];
      if (group.analysisType == 'regression') {
        if (group.selectedModelId) {
          let selectedModel: JStatRegressionModel = getSelectedRegressionModel(group);
          predictorVariables = selectedModel?.predictorVariables
            ?? group.predictorVariables.filter(variable => variable.productionInAnalysis);
        } else {
          predictorVariables = group.predictorVariables.filter(variable => {
            return (variable.productionInAnalysis == true);
          });
        }
      } else if (group.analysisType != 'absoluteEnergyConsumption') {
        predictorVariables = group.predictorVariables.filter(variable => {
          return (variable.productionInAnalysis == true);
        });
      }
      let isUsed: AnalysisGroupPredictorVariable = predictorVariables.find(predictorUsed => { return predictorUsed.id == predictor.guid });
      if (isUsed) {
        this.predictorUsedGroupIds.push(group.idbGroupId)
      }
    };
    this.displayDeletePredictor = true;
  }

  async confirmDelete() {
    this.loadingService.setLoadingMessage('Deleting Predictor Data...');
    this.loadingService.setLoadingStatus(true);
    this.displayDeletePredictor = false;
    const predictor = this.predictorToDelete;
    const accountGuid = this.accountWorkspaceStore.account()?.guid;
    const predictorData: Array<IdbPredictorData> = this.accountWorkspaceQuery.getPredictorData(predictor.guid);
    await this.commandBoundary.execute(
      { entityKind: 'predictor', changeKind: 'delete', entityGuid: predictor.guid, label: 'Delete Predictor' },
      async () => {
        await this.predictorHandler.deletePredictor(predictor, accountGuid);
        for (const data of predictorData) {
          await this.predictorHandler.deletePredictorData(data.id);
        }
        await this.analysisHandler.deleteAnalysisPredictor(predictor);
      }
    );
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Predictor Deleted', undefined, 1000, false, 'alert-success');
    this.cancelDelete();
  }

  cancelDelete() {
    this.displayDeletePredictor = false;
    this.predictorToDelete = undefined;
  }

  async selectEditPredictor(predictor: IdbPredictor) {
    const facility: IdbFacility = this.selectedFacility();
    if (this.router.url.includes('data-management')) {
      predictor.sidebarOpen = true;
      const accountGuid = this.accountWorkspaceStore.account()?.guid;
      await this.commandBoundary.execute(
        { entityKind: 'predictor', changeKind: 'update', entityGuid: predictor.guid, label: 'Open Predictor' },
        () => this.predictorHandler.updatePredictor(predictor, accountGuid)
      );
      this.router.navigateByUrl('/data-management/' + predictor.accountId + '/facilities/' + predictor.facilityId + '/predictors/' + predictor.guid);
    } else {
      this.router.navigateByUrl('/data-evaluation/facility/' + facility.guid + '/utility/predictors/manage/edit-predictor/' + predictor.guid);
    }
  }

  async addPredictor() {
    const facility: IdbFacility = this.selectedFacility();
    if (this.router.url.includes('data-management')) {
      let newPredictor: IdbPredictor = getNewIdbPredictor(facility.accountId, facility.guid);
      const accountGuid = this.accountWorkspaceStore.account()?.guid;
      const result = await this.commandBoundary.execute(
        { entityKind: 'predictor', changeKind: 'add', label: 'Add Predictor' },
        async () => {
          const added = await this.predictorHandler.addPredictor(newPredictor, this.accountWorkspaceStore.account()?.guid);
          await this.analysisHandler.addAnalysisPredictor(added);
          return added;
        }
      );
      this.loadingService.setLoadingStatus(false);
      this.toastNotificationService.showToast('New Predictor Added!', undefined, undefined, false, 'alert-success');
      this.selectEditPredictor(result.value);
    } else {
      this.router.navigateByUrl('/data-evaluation/facility/' + facility.guid + '/utility/predictors/manage/add-predictor');
    }
  }

  uploadData() {
    let selectedAccount: IdbAccount = this.accountWorkspaceStore.account();
    this.router.navigateByUrl('/data-management/' + selectedAccount.guid + '/import-data');
  }


  async viewWeatherData(predictor: IdbPredictor) {
    const degreeDayPredictors = this.degreeDayPredictors();
    //ISSUE 1822
    // let weatherStation: WeatherStation | 'error' = await this.degreeDaysService.getStationById(predictor.weatherStationId)
    let weatherStation: WeatherStation | 'error' = await this.weatherDataService.getStation(predictor.weatherStationId);
    if (weatherStation && weatherStation != 'error') {
      this.weatherDataService.selectedStation = weatherStation;
      if (predictor.weatherDataType == 'CDD') {
        this.weatherDataService.coolingTemp = predictor.coolingBaseTemperature;
        let predictorPair: IdbPredictor = degreeDayPredictors.find(predictorPair => { return predictorPair.predictor.weatherStationId == predictor.weatherStationId && predictorPair.predictor.weatherDataType == 'HDD' })?.predictor;
        if (predictorPair) {
          this.weatherDataService.heatingTemp = predictorPair.heatingBaseTemperature;
          this.weatherDataService.weatherDataSelection = 'degreeDays';
        } else {
          this.weatherDataService.weatherDataSelection = 'CDD';
        }
      } else if (predictor.weatherDataType == 'HDD') {
        this.weatherDataService.heatingTemp = predictor.heatingBaseTemperature;
        let predictorPair: IdbPredictor = degreeDayPredictors.find(predictorPair => { return predictorPair.predictor.weatherStationId == predictor.weatherStationId && predictorPair.predictor.weatherDataType == 'CDD' })?.predictor;
        if (predictorPair) {
          this.weatherDataService.coolingTemp = predictorPair.coolingBaseTemperature;
          this.weatherDataService.weatherDataSelection = 'degreeDays';
        } else {
          this.weatherDataService.weatherDataSelection = 'HDD';
        }
      } else if (predictor.weatherDataType == 'relativeHumidity') {
        this.weatherDataService.weatherDataSelection = 'relativeHumidity';
      } else if (predictor.weatherDataType == 'dryBulbTemp') {
        this.weatherDataService.weatherDataSelection = 'dryBulbTemp';
      } else if (predictor.weatherDataType == 'wetBulbTemp') {
        this.weatherDataService.weatherDataSelection = 'wetBulbTemp';
      } else if (predictor.weatherDataType == 'dewPointTemp') {
        this.weatherDataService.weatherDataSelection = 'dewPointTemp';
      } else if (predictor.weatherDataType == 'precipitation') {
        this.weatherDataService.weatherDataSelection = 'precipitation';
      }
      let endDate: Date = new Date(weatherStation.end);
      endDate.setFullYear(endDate.getFullYear() - 1);
      this.weatherDataService.selectedYear = endDate.getFullYear();
      this.weatherDataService.selectedDate = endDate;
      this.weatherDataService.selectedMonth = endDate;
    }
    const selectedFacility = this.selectedFacility();
    this.weatherDataService.selectedFacility = selectedFacility;
    this.weatherDataService.addressSearchStr = getWeatherSearchFromFacility(selectedFacility);
    if (this.router.url.includes('data-management')) {
      this.router.navigateByUrl('/data-management/' + selectedFacility.accountId + '/weather-data/annual-station');
    } else {
      this.router.navigateByUrl('/data-evaluation/weather-data/annual-station');
    }
  }

  goToWeatherData() {
    const selectedFacility = this.selectedFacility();
    this.weatherDataService.selectedFacility = selectedFacility;
    this.weatherDataService.addressSearchStr = getWeatherSearchFromFacility(selectedFacility);
    if (this.router.url.includes('data-management')) {
      this.router.navigateByUrl('/data-management/' + selectedFacility.accountId + '/weather-data');
    } else {
      this.router.navigateByUrl('/data-evaluation/weather-data');
    }
  }

  openIgnoreAllWarningsModal() {
    this.showIgnoreAllWarningsModal = true;
  }

  cancelIgnoreAllWarningsModal() {
    this.showIgnoreAllWarningsModal = false;
  }

  async confirmIgnoreAllWarningsModal() {
    this.showIgnoreAllWarningsModal = false;
    await this.setAllIgnoreWeatherDataWarning(true);
  }

  async setAllIgnoreWeatherDataWarning(ignoreWarning: boolean) {
    const predictorsToUpdate = this.degreeDayPredictors()
      .map(item => item.predictor)
      .filter(predictor => Boolean(predictor.ignoreWeatherDataWarning) !== ignoreWarning);
    if (predictorsToUpdate.length === 0) {
      return;
    }
    const accountGuid = this.accountWorkspaceStore.account()?.guid;
    await this.commandBoundary.execute(
      { entityKind: 'predictor', changeKind: 'bulk', label: 'Update Weather Warning' },
      async () => {
        for (const predictor of predictorsToUpdate) {
          predictor.ignoreWeatherDataWarning = ignoreWarning;
          await this.predictorHandler.updatePredictor(predictor, accountGuid);
        }
      }
    );
    this.toastNotificationService.showToast(
      ignoreWarning ? 'Weather gap warnings dismissed' : 'Weather gap warnings re-enabled',
      undefined,
      1200,
      false,
      'alert-success'
    );
  }

  navigateToPredictorData(predictor: IdbPredictor) {
    const facility = this.selectedFacility();
    if (this.router.url.includes('data-management')) {
      this.router.navigateByUrl(`/data-management/${predictor.accountId}/facilities/${predictor.facilityId}/predictors/${predictor.guid}/predictor-data`);
    } else {
      this.router.navigateByUrl(`/data-evaluation/facility/${facility.guid}/utility/predictors/predictor/${predictor.guid}/entries-table`);
    }
  }
}
