import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { WeatherPredictorManagementService } from '@v0/weather-data/weather-predictor-management.service';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { FileReference } from '@v0/data-management/data-management-import/import-services/upload-data-models';
import { getEarliestMeterDataDate, getEarliestPredictorDataDate, getLatestMeterDataDate, getLatestPredictorDataDate } from '@shared/dateHelperFunctions';

@Component({
  selector: 'app-update-weather-predictors-modal',
  standalone: false,
  templateUrl: './update-weather-predictors-modal.component.html',
  styleUrl: './update-weather-predictors-modal.component.css'
})
export class UpdateWeatherPredictorsModalComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  @Output('emitClose') emitClose = new EventEmitter<void>();
  @Input() fileReference: FileReference;


  showWeatherPredictorModal: boolean = false;

  facilityList: Array<{
    facilityId: string,
    startDate: Date,
    endDate: Date
  }>
  invalidForm: boolean;

  constructor(
    private weatherPredictorManagementService: WeatherPredictorManagementService,
    private cd: ChangeDetectorRef

  ) { }

  ngOnInit() {
    this.setFacilityList();
    this.setInvalidForm();
  }


  ngAfterViewInit() {
    this.openWeatherPredictorModal();
    this.cd.detectChanges();
  }

  openWeatherPredictorModal() {
    this.showWeatherPredictorModal = true;
  }

  closeWeatherPredictorModal() {
    this.emitClose.emit();
  }

  async updateAccountWeatherPredictors() {
    this.closeWeatherPredictorModal();
    let results = await this.weatherPredictorManagementService.updateAccountWeatherPredictors(this.facilityList);
    if (results === "success") {
      console.log('success....')
    } else {
      // Handle error case
      console.error("Error updating weather predictors");
    }
  }

  setFacilityList() {
    this.facilityList = new Array();
    let facilities: Array<IdbFacility> = [...this.accountWorkspaceStore.facilities()];
    if (this.fileReference) {
      facilities = this.fileReference.importFacilities;
    }
    facilities.forEach(facility => {
      let facilityPredictors: Array<IdbPredictor> = this.accountWorkspaceQuery.getFacilityPredictors(facility.guid);
      let weatherPredictors: Array<IdbPredictor> = facilityPredictors.filter(predictor => {
        return predictor.predictorType == 'Weather';
      });
      if (weatherPredictors.length > 0) {
        let startDate: Date;
        let endDate: Date;
        weatherPredictors.forEach(predictor => {
          let predictorData: Array<IdbPredictorData> = this.accountWorkspaceQuery.getPredictorData(predictor.guid);
          if (predictorData.length > 0) {
            let tmpStartDate: Date = getEarliestPredictorDataDate(predictorData);
            let tmpEndDate: Date = getLatestPredictorDataDate(predictorData);
            if (!startDate || tmpStartDate.getTime() < startDate.getTime()) {
              startDate = new Date(tmpStartDate);
            }
            if (!endDate || tmpEndDate.getTime() > endDate.getTime()) {
              endDate = new Date(tmpEndDate);
            }
          }
        });
        if (!startDate || !endDate) {
          // Handle case where no valid dates were found
          let facilityMeterData: Array<IdbUtilityMeterData> = this.accountWorkspaceQuery.getFacilityMeterData(facility.guid);
          if (facilityMeterData.length > 0) {
            let tmpStartDate: Date = getEarliestMeterDataDate(facilityMeterData);
            let tmpEndDate: Date = getLatestMeterDataDate(facilityMeterData);
            if (!startDate || tmpStartDate.getTime() < startDate.getTime()) {
              startDate = new Date(tmpStartDate);
            }
            if (!endDate || tmpEndDate.getTime() > endDate.getTime()) {
              endDate = new Date(tmpEndDate);
            }
          }
        }
        this.facilityList.push({
          facilityId: facility.guid,
          startDate: startDate,
          endDate: endDate
        });
      }
    });
  }



  async setEndDate(eventData: string, facilityIndex: number) {
    //eventData format = yyyy-mm = 2022-06
    let yearMonth: Array<string> = eventData.split('-');
    //-1 on month
    this.facilityList[facilityIndex].endDate = new Date(Number(yearMonth[0]), Number(yearMonth[1]) - 1, 1);
    this.setInvalidForm();
  }

  async setStartDate(eventData: string, facilityIndex: number) {
    //eventData format = yyyy-mm = 2022-06
    let yearMonth: Array<string> = eventData.split('-');
    //-1 on month
    this.facilityList[facilityIndex].startDate = new Date(Number(yearMonth[0]), Number(yearMonth[1]) - 1, 1);
    this.setInvalidForm();
  }

  setInvalidForm() {
    this.invalidForm = this.facilityList.find(facilityItem => {
      return !facilityItem.startDate || !facilityItem.endDate || facilityItem.startDate.getTime() > facilityItem.endDate.getTime();
    }) !== undefined;
  }

  setEndDateToCurrentDate() {
    const currentDate = new Date();
    const latestMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    this.facilityList.forEach(facilityItem => {
      facilityItem.endDate = new Date(latestMonth);
    });
    this.setInvalidForm();
  }

  openCalendar(event: Event, inputElement: HTMLInputElement): void {
    event.preventDefault();
    try {
      if (typeof inputElement.showPicker === 'function') {
        inputElement.showPicker();
      } else {
        inputElement.click();
      }
    } catch {
      inputElement.focus();
      inputElement.click();
    }
  }

  setBulkDates(event: Event, dateType: 'start' | 'end') {
    const input = event.target as HTMLInputElement;

    if (!input.value) {
      return;
    }
    const [year, month] = input.value.split('-').map(Number);
    if (!year || !month) {
      return;
    }

    const newDate = new Date(year, month - 1, 1);
    this.facilityList.forEach(facilityItem => {
      if (dateType === 'start') {
        facilityItem.startDate = new Date(newDate);
      } else {
        facilityItem.endDate = new Date(newDate);
      }
    });
    this.setInvalidForm();
  }
}
