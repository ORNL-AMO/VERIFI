import { Component } from '@angular/core';
import { HelpPanelService } from '../help-panel/help-panel.service';
import { AccountdbService } from '../indexedDB/account-db.service';
import { IdbAccount, IdbFacility, IdbPredictorEntry, PredictorData } from '../models/idb';
import { Subscription } from 'rxjs';
import { WeatherDataService } from './weather-data.service';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { PredictordbService } from '../indexedDB/predictors-db.service';
import { LoadingService } from '../core-components/loading/loading.service';
import { Router } from '@angular/router';
import { AnalysisDbService } from '../indexedDB/analysis-db.service';

@Component({
  selector: 'app-weather-data',
  templateUrl: './weather-data.component.html',
  styleUrls: ['./weather-data.component.css']
})
export class WeatherDataComponent {

  zipCode: string;
  applyToFacility: boolean;
  applyToFacilitySub: Subscription;
  selectedFacility: IdbFacility;
  facilities: Array<IdbFacility>;
  constructor(private helpPanelService: HelpPanelService, private accountDbService: AccountdbService,
    private weatherDataService: WeatherDataService,
    private facilityDbService: FacilitydbService,
    private predictorDbService: PredictordbService,
    private loadingService: LoadingService,
    private router: Router,
    private analysisDbService: AnalysisDbService) {

  }

  ngOnInit() {
    this.applyToFacilitySub = this.weatherDataService.applyToFacility.subscribe(val => {
      this.applyToFacility = val;
      if (this.applyToFacility) {
        this.facilities = this.facilityDbService.accountFacilities.getValue();
        if (this.weatherDataService.selectedFacility) {
          let facilityExists: IdbFacility = this.facilities.find(facility => { return facility.guid == this.weatherDataService.selectedFacility.guid });
          if (facilityExists) {
            this.selectedFacility = this.weatherDataService.selectedFacility;
          }
        }
      }
    });

    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.zipCode = selectedAccount.zip;
  }

  ngOnDestroy() {
    this.applyToFacilitySub.unsubscribe();
  }

  toggleHelpPanel() {
    let helpPanelOpen: boolean = this.helpPanelService.helpPanelOpen.getValue();
    this.helpPanelService.helpPanelOpen.next(!helpPanelOpen);
  }

  cancelApplyToFacility() {
    this.weatherDataService.applyToFacility.next(false);
  }

  async confirmCreate() {
    this.weatherDataService.applyToFacility.next(false);
    this.loadingService.setLoadingMessage('Updating Predictors...');
    this.loadingService.setLoadingStatus(true);
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    let facilityPredictorEntries: Array<IdbPredictorEntry> = accountPredictorEntries.filter(entry => { return entry.facilityId == this.selectedFacility.guid })
    let facilityPredictors: Array<PredictorData> = [];
    if (facilityPredictorEntries.length > 0) {
      facilityPredictors = facilityPredictorEntries[0].predictors
    }
    let facilityPredictorsCopy: Array<PredictorData> = JSON.parse(JSON.stringify(facilityPredictors));
    let hddPredictor: PredictorData = this.predictorDbService.getNewPredictor(facilityPredictorsCopy);
    hddPredictor.name = 'HDD Generated';
    hddPredictor.predictorType = 'Weather';
    hddPredictor.weatherDataType = 'HDD';
    hddPredictor.heatingBaseTemperature = this.weatherDataService.heatingTemp;
    hddPredictor.weatherStationId = this.weatherDataService.selectedStation.ID;
    facilityPredictorsCopy.push(hddPredictor);
    let cddPredictor: PredictorData = this.predictorDbService.getNewPredictor(facilityPredictorsCopy)
    cddPredictor.name = 'CDD Generated';
    cddPredictor.predictorType = 'Weather';
    cddPredictor.weatherDataType = 'CDD';
    cddPredictor.coolingBaseTemperature = this.weatherDataService.coolingTemp;
    cddPredictor.weatherStationId = this.weatherDataService.selectedStation.ID;
    facilityPredictorsCopy.push(cddPredictor);

    await this.predictorDbService.updateFacilityPredictorEntriesInAccount(facilityPredictorsCopy, this.selectedFacility);
    await this.predictorDbService.createPredictorHeatingCoolingDegreeDays(this.selectedFacility, hddPredictor, cddPredictor);
    this.loadingService.setLoadingMessage('Updating Analysis Items...');
    await this.analysisDbService.updateAnalysisPredictors(facilityPredictorsCopy, this.selectedFacility.guid);
    this.loadingService.setLoadingStatus(false);
    this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/utility/predictors/manage/predictor-table')
    // this.cancel();
    //todo: success toast and navigate to facility
  }


}


