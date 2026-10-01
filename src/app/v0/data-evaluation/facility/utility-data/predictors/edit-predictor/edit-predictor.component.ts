import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { from, map, Observable, of, switchAll, take } from 'rxjs';
import { LoadingService } from '@app/core-components/loading/loading.service';
import { ToastNotificationsService } from '@shared/notifications/toast-notifications.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { PredictorCommandHandler } from '@data/account-workspace/handlers/predictor-command-handler.service';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { DetailDegreeDay } from '@data/models/degreeDays';
import { IdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbPredictor, IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
// import { DegreeDaysService } from '@shared/helper-services/degree-days.service';
import { PredictorDataHelperService } from '@shared/helper-services/predictor-data-helper.service';
import { EditPredictorFormService } from '@v0/shared/shared-predictors-content/edit-predictor-form.service';
import { getDegreeDayAmount } from '@shared/sharedHelperFunctions';
import { WeatherDataReading, WeatherDataService } from '@v0/weather-data/weather-data.service';
import * as _ from 'lodash';
import { getDetailedDataForMonth, hasWeatherDataWarning } from '@v0/weather-data/weatherDataCalculations';
import { getDateFromPredictorData } from '@shared/dateHelperFunctions';
import { RouterGuardService } from '@shared/shared-router-guard-modal/router-guard-service';
import { WeatherPredictorCreationService } from '@v0/shared/shared-predictors-content/weather-predictor-creation.service';

@Component({
  selector: 'app-edit-predictor',
  templateUrl: './edit-predictor.component.html',
  styleUrl: './edit-predictor.component.css',
  standalone: false,
  host: {
    '(window:keydown)': 'handleKeyDown($event)'
  }
})
export class EditPredictorComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly predictorHandler = inject(PredictorCommandHandler);
  private readonly analysisHandler = inject(AnalysisCommandHandler);

  addOrEdit: 'edit' | 'add';
  predictor: IdbPredictor;
  predictorForm: FormGroup;
  facility: IdbFacility;
  destroyed: boolean = false;
  latestMeterReading: Date;
  firstMeterReading: Date;

  handleKeyDown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      if (!this.predictorForm.invalid) {
        this.saveChanges();
      }
    }
  }

  constructor(
    private activatedRoute: ActivatedRoute,
    private toastNotificationService: ToastNotificationsService,
    private router: Router,
    private editPredictorFormService: EditPredictorFormService,
    private loadingService: LoadingService,
    private predictorDataHelperService: PredictorDataHelperService,
    private weatherDataService: WeatherDataService,
    private routerGuardService: RouterGuardService,
    private weatherPredictorCreationService: WeatherPredictorCreationService

  ) {
  }

  ngOnInit() {
    this.facility = this.accountWorkspaceStore.selectedFacility();
    this.activatedRoute.params.subscribe(params => {
      let predictorId: string = params['id'];
      if (predictorId) {
        this.addOrEdit = 'edit';
        this.setPredictorDataEdit(predictorId);
      } else {
        this.addOrEdit = 'add';
        this.setPredictorDataNew();
      }
    });
  }

  ngOnDestroy() {
    this.destroyed = true;
  }

  setPredictorDataEdit(predictorId: string) {
    let predictorData: IdbPredictor = this.accountWorkspaceQuery.getPredictorByGuid(predictorId);
    if (predictorData) {
      this.predictor = JSON.parse(JSON.stringify(predictorData));
      this.setPredictorForm();
    } else {
      this.toastNotificationService.showToast('Predictor Not Found', undefined, 2000, false, 'alert-danger');
      this.cancel();
    }
  }
  setPredictorDataNew() {
    this.predictor = getNewIdbPredictor(this.facility.accountId, this.facility.guid);
    this.setPredictorForm();
  }

  setPredictorForm() {
    this.predictorForm = this.editPredictorFormService.getFormFromPredictor(this.predictor);
  }

  cancel() {
    this.router.navigateByUrl('/data-evaluation/facility/' + this.facility.guid + '/utility/predictors/manage/predictor-table')
  }

  async saveChanges() {
    this.loadingService.setLoadingMessage('Updating Predictors...');
    this.loadingService.setLoadingStatus(true);
    let needsWeatherDataUpdate: boolean = this.editPredictorFormService.setPredictorDataFromForm(this.predictor, this.predictorForm);
    const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;

    if (this.addOrEdit == 'add' && this.predictorForm.controls.predictorType.value === 'Weather') {
      try {
        await this.commandBoundary.execute(
          { entityKind: 'predictor', changeKind: 'bulk', label: 'Create Weather Predictor' },
          () => this.weatherPredictorCreationService.createFromForm({
            predictorForm: this.predictorForm,
            facility: this.facility,
            activeAccountGuid,
            weatherStationName: this.predictor.weatherStationName,
            shouldStop: () => this.destroyed
          })
        );
      } catch (error) {
        this.loadingService.setLoadingStatus(false);
        throw error;
      }
      this.predictorForm.markAsPristine();
      this.loadingService.setLoadingStatus(false);
      this.toastNotificationService.showToast('Weather Predictors Created!', undefined, undefined, false, 'alert-success');
      this.cancel();
      return;
    }

    try {
      await this.commandBoundary.execute(
        { entityKind: 'predictor', changeKind: this.addOrEdit === 'add' ? 'add' : 'update', entityGuid: this.predictor.guid, label: 'Saving predictor' },
        async () => {
          if (this.addOrEdit == 'add') {
            await this.predictorHandler.addPredictor(this.predictor, this.accountWorkspaceStore.account()?.guid);
            await this.analysisHandler.addAnalysisPredictor(this.predictor);
          } else {
            await this.predictorHandler.updatePredictor(this.predictor, activeAccountGuid);

            if (this.predictor.predictorType == 'Weather' && needsWeatherDataUpdate) {
              let predictorData: Array<IdbPredictorData> = this.accountWorkspaceQuery.getPredictorData(this.predictor.guid);
              if (!predictorData || predictorData.length == 0) {
                await this.analysisHandler.updateAnalysisPredictor(this.predictor);
                return;
              }
              let predictorDates: Array<Date> = predictorData.map(pData => { return getDateFromPredictorData(pData) });
              let minDate: Date = _.min(predictorDates);
              let maxDate: Date = _.max(predictorDates);
              let parsedData: Array<WeatherDataReading> | 'error' = await this.weatherDataService.getHourlyData(this.predictor.weatherStationId, minDate, maxDate, ['humidity']);
              if (parsedData != 'error') {
                for (let i = 0; i < predictorData.length; i++) {
                  if (!predictorData[i].weatherOverride) {
                    this.loadingService.setLoadingMessage('Updating Weather Predictors: (' + i + '/' + predictorData.length + ')');
                    let degreeDays: Array<DetailDegreeDay> = getDetailedDataForMonth(parsedData, predictorData[i].month - 1, predictorData[i].year, this.predictor.heatingBaseTemperature, this.predictor.coolingBaseTemperature, this.predictor.weatherStationId, this.predictor.weatherStationName);
                    const updated: IdbPredictorData = {
                      ...predictorData[i],
                      amount: getDegreeDayAmount(degreeDays, this.predictor.weatherDataType),
                      weatherDataWarning: hasWeatherDataWarning(degreeDays, this.predictor.weatherDataType),
                      weatherDataChanged: false
                    };
                    await this.predictorHandler.updatePredictorData(updated, activeAccountGuid);
                  }
                }
              } else {
                this.toastNotificationService.weatherDataErrorToast();
              }
            }
            await this.analysisHandler.updateAnalysisPredictor(this.predictor);
          }
        }
      );
    } catch (error) {
      this.loadingService.setLoadingStatus(false);
      throw error;
    }
    this.predictorForm.markAsPristine();
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Predictor Entries Updated!', undefined, undefined, false, 'alert-success');
    this.cancel();
  }

  setLastMeterReading() {
    this.latestMeterReading = this.predictorDataHelperService.getLastMeterDate(this.facility);
    this.firstMeterReading = this.predictorDataHelperService.getFirstMeterDate(this.facility);
  }

  canDeactivate(): Observable<boolean> {
    if (this.predictorForm && this.predictorForm.dirty) {
      this.routerGuardService.setShowSave(true);
      this.routerGuardService.setShowModal(true);
      return this.routerGuardService.getModalAction().pipe(map(action => {
        if (action == 'save') {
          return from(this.saveChanges()).pipe(map(() => true));
        } else if (action == 'discard') {
          return of(true);
        }
        return of(false);
      }),
        take(1), switchAll());
    }
    return of(true);
  }

}
