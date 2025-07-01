import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { getTodoList, TodoItem, TodoListOptions } from '../todo-list';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { DataWizardService } from '../data-wizard.service';
import { WeatherPredictorManagementService } from 'src/app/weather-data/weather-predictor-management.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-data-wizard-home',
  standalone: false,

  templateUrl: './data-wizard-home.component.html',
  styleUrl: './data-wizard-home.component.css'
})
export class DataWizardHomeComponent {

  account: IdbAccount;
  accountSub: Subscription;

  facilities: Array<IdbFacility>;
  facilitiesSub: Subscription;

  metersSub: Subscription;
  meters: Array<IdbUtilityMeter>;

  predictors: Array<IdbPredictor>;
  predictorsSub: Subscription;

  meterData: Array<IdbUtilityMeterData>
  meterDataSub: Subscription;

  predictorDataSub: Subscription;
  predictorData: Array<IdbPredictorData>;

  toDoItems: Array<TodoItem> = [];

  todoListOptions: TodoListOptions;
  todoListOptionsSub: Subscription;

  outdatedDaysOptions: Array<number> = [30, 60, 90, 180, 365];
  showWeatherButton: boolean = false;

  showWeatherPredictorModal: boolean = false;
  showMenu: boolean = false;
  constructor(private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private predictorDbService: PredictorDbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private predictorDataDbService: PredictorDataDbService,
    private dataWizardService: DataWizardService,
    private weatherPredictorManagementService: WeatherPredictorManagementService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {

  }

  ngOnInit() {
    this.accountSub = this.accountDbService.selectedAccount.subscribe(account => {
      this.account = account;
      this.setTodoItems();
    });
    this.facilitiesSub = this.facilityDbService.accountFacilities.subscribe(facilities => {
      this.facilities = facilities;
      this.setTodoItems();
    });
    this.metersSub = this.utilityMeterDbService.accountMeters.subscribe(meters => {
      this.meters = meters;
      this.setTodoItems();
    });
    this.predictorsSub = this.predictorDbService.accountPredictors.subscribe(predictors => {
      this.predictors = predictors;
      this.setTodoItems();
    });
    this.meterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(meterData => {
      this.meterData = meterData;
      this.setTodoItems();
    });
    this.predictorDataSub = this.predictorDataDbService.accountPredictorData.subscribe(predictorData => {
      this.predictorData = predictorData;
      this.setTodoItems();
    });
    this.todoListOptionsSub = this.dataWizardService.todoListOptions.subscribe(options => {
      this.todoListOptions = options;
      this.setTodoItems();
    });
  }

  ngOnDestroy() {
    this.accountSub.unsubscribe();
    this.facilitiesSub.unsubscribe();
    this.metersSub.unsubscribe();
    this.predictorsSub.unsubscribe();
    this.meterDataSub.unsubscribe();
    this.predictorDataSub.unsubscribe();
    this.todoListOptionsSub.unsubscribe();
  }

  setTodoItems() {
    this.toDoItems = getTodoList(this.account,
      this.facilities,
      this.meters,
      this.predictors,
      this.meterData,
      this.predictorData,
      this.todoListOptions);
    this.showWeatherButton = this.toDoItems.find(item => {
      return item.isWeather && item.type === 'predictor';
    }) != undefined;

    this.showMenu = this.toDoItems.find(item => {
      return item.type == 'predictor' || item.type == 'meter'
    }) != undefined;

  }

  updateIncludedItems() {
    this.dataWizardService.todoListOptions.next(this.todoListOptions);
  }

  openWeatherPredictorModal() {
    this.showWeatherPredictorModal = true;
  }

  closeWeatherPredictorModal() {
    this.showWeatherPredictorModal = false;
  }

  async updateAccountWeatherPredictors() {
      this.closeWeatherPredictorModal();
    let results = await this.weatherPredictorManagementService.updateAccountWeatherPredictors();
    if (results === "success") {
      console.log('success....')
    } else {
      // Handle error case
      console.error("Error updating weather predictors");
    }
  }

  goToUpload(){
    this.router.navigate(['../import-data'], {relativeTo: this.activatedRoute});
  }
}
