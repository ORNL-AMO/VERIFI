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
import { getTodoList, TodoItem, TodoListOptions } from '../../todo-list';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { DataWizardService } from '../../data-wizard.service';

@Component({
  selector: 'app-setup-checklist',
  standalone: false,

  templateUrl: './setup-checklist.component.html',
  styleUrl: './setup-checklist.component.css'
})
export class SetupChecklistComponent {

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
  showMenu: boolean = false;
  constructor(private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private predictorDbService: PredictorDbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private predictorDataDbService: PredictorDataDbService,
    private dataWizardService: DataWizardService
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
      {
        includeOutdatedMeters: true,
        includeOutdatedPredictors: true,
        outdatedDays: 60
      });

      this.showMenu = this.toDoItems.find(item => {
        return item.type == 'predictor' || item.type == 'meter'
      }) != undefined;
  }
  updateIncludedItems() {
    this.dataWizardService.todoListOptions.next(this.todoListOptions);
  }
}
