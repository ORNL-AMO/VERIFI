import { Component } from '@angular/core';
import { firstValueFrom, Subscription } from 'rxjs';
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
import { FacilityTodoItem, getTodoList, TodoItem } from '../todo-list';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { WeatherPredictorManagementService } from 'src/app/weather-data/weather-predictor-management.service';
import { ActivatedRoute, Router } from '@angular/router';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';

@Component({
  selector: 'app-data-management-home',
  standalone: false,

  templateUrl: './data-management-home.component.html',
  styleUrl: './data-management-home.component.css'
})
export class DataManagementHomeComponent {

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

  meterGroupsSub: Subscription;
  meterGroups: Array<IdbUtilityMeterGroup>;

  outdatedDaysOptions: Array<number> = [30, 60, 90, 180, 365];
  showWeatherButton: boolean = false;

  showWeatherPredictorModal: boolean = false;

  toDoItems: {
    facilityTodoItems: Array<FacilityTodoItem>,
    otherItems: Array<TodoItem>
  };
  hasTodoItems: boolean = false;
  totalTodoItems: number = 0;
  allTodoItems: Array<TodoItem> = [];
  hasInitialSetupItems: boolean;
  constructor(private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private predictorDbService: PredictorDbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private predictorDataDbService: PredictorDataDbService,
    private weatherPredictorManagementService: WeatherPredictorManagementService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService
  ) {

  }

  ngOnInit() {
    this.accountSub = this.accountDbService.selectedAccount.subscribe(account => {
      this.account = account;
      if(!this.account.toDoListOutdatedDays){
        this.account.toDoListOutdatedDays = 60;
      }
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
    this.meterGroupsSub = this.utilityMeterGroupDbService.accountMeterGroups.subscribe(meterGroups => {
      this.meterGroups = meterGroups;
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
    this.meterGroupsSub.unsubscribe();
  }

  setTodoItems() {
    this.toDoItems = getTodoList(this.account,
      this.facilities,
      this.meters,
      this.predictors,
      this.meterData,
      this.predictorData,
      this.meterGroups);
    
    this.allTodoItems = this.toDoItems.facilityTodoItems.flatMap(f => f.meterTodoItems.concat(f.predictorTodoItems));

    this.showWeatherButton = this.allTodoItems.find(item => {
      return item.isWeather && item.type === 'predictor';
    }) != undefined;
    this.hasTodoItems = this.allTodoItems.length > 0 || this.toDoItems.otherItems.length > 0;
    this.totalTodoItems = this.allTodoItems.length + this.toDoItems.otherItems.length;

    this.hasInitialSetupItems = this.toDoItems.otherItems.find(item => {
      return item.label == 'Upload data'
    }) != undefined;
  }

  async updateIncludedItems() {
    this.account = await firstValueFrom(this.accountDbService.updateWithObservable(this.account));
    this.accountDbService.selectedAccount.next(this.account);
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

  goToUpload() {
    this.router.navigate(['../import-data'], { relativeTo: this.activatedRoute });
  }

  toggleShowPredictorItem(facilityIndex: number){
    this.toDoItems.facilityTodoItems[facilityIndex].showPredictorItems = !this.toDoItems.facilityTodoItems[facilityIndex].showPredictorItems;
  }

  toggleShowMeterItem(facilityIndex: number) {
    this.toDoItems.facilityTodoItems[facilityIndex].showMeterItems = !this.toDoItems.facilityTodoItems[facilityIndex].showMeterItems;
  }
}
