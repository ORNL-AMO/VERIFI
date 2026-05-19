import { Component } from '@angular/core';
import { firstValueFrom, Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { WeatherPredictorManagementService } from 'src/app/weather-data/weather-predictor-management.service';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountStatusCheck } from 'src/app/calculations/status-check-calculations/accountStatusCheck';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { STATUS_CHECK_OPTIONS, StatusCheckAction } from 'src/app/calculations/status-check-calculations/statusCheckModels';

interface FacilityActionGroup {
  facility: IdbFacility;
  facilityStatus: STATUS_CHECK_OPTIONS;
  showMeterItems: boolean;
  meterTodoItems: Array<StatusCheckAction>;
  showPredictorItems: boolean;
  predictorTodoItems: Array<StatusCheckAction>;
  numberOfItems: number;
}

@Component({
  selector: 'app-data-management-home',
  standalone: false,

  templateUrl: './data-management-home.component.html',
  styleUrl: './data-management-home.component.css'
})
export class DataManagementHomeComponent {

  account: IdbAccount;
  accountSub: Subscription;

  showWeatherButton: boolean = false;

  showWeatherPredictorModal: boolean = false;

  toDoItems: {
    facilityTodoItems: Array<FacilityActionGroup>,
    otherItems: Array<StatusCheckAction>
  } = { facilityTodoItems: [], otherItems: [] };
  hasTodoItems: boolean = false;
  totalTodoItems: number = 0;
  allTodoItems: Array<StatusCheckAction> = [];
  hasInitialSetupItems: boolean;

  statusCheckSub: Subscription;
  loadingSub: Subscription;

  constructor(
    private accountDbService: AccountdbService,
    private accountStatusCheckService: AccountStatusCheckService,
    private weatherPredictorManagementService: WeatherPredictorManagementService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private loadingService: LoadingService,
    private dbChangesService: DbChangesService,
    private toastNotificationService: ToastNotificationsService
  ) {

  }

  ngOnInit() {
    this.accountSub = this.accountDbService.selectedAccount.subscribe(account => {
      this.account = account;
    });

    this.statusCheckSub = this.accountStatusCheckService.accountStatusCheck.subscribe(statusCheck => {
      if (statusCheck) {
        this.setDisplayItems(statusCheck);
      }
    });

    this.loadingSub = this.loadingService.navigationAfterLoading.subscribe((context) => {
      if (context === 'updating-weather-predictors') {
        this.showToast();
        this.loadingService.navigationAfterLoading.next(undefined);
      }
    });
  }

  ngOnDestroy() {
    this.accountSub.unsubscribe();
    this.statusCheckSub.unsubscribe();
    this.loadingSub.unsubscribe();
  }

  setDisplayItems(statusCheck: AccountStatusCheck) {
    const facilityTodoItems: Array<FacilityActionGroup> = statusCheck.facilityStatusChecks
      .filter(fc => fc.allActions.length > 0)
      .map(fc => {
        const meterActions = [...fc.actions.filter(a => a.type === 'meter'), ...fc.metersStatusChecks.flatMap(m => m.actions)];
        const predictorActions = [...fc.actions.filter(a => a.type === 'predictor'), ...fc.predictorsStatusChecks.flatMap(p => p.actions)];
        return {
          facility: fc.facility,
          facilityStatus: fc.status,
          showMeterItems: false,
          meterTodoItems: meterActions,
          showPredictorItems: false,
          predictorTodoItems: predictorActions,
          numberOfItems: meterActions.length + predictorActions.length
        };
      });
    //order facility items by status (error, then warning, then good) and then alphabetically by facility name
    facilityTodoItems.sort((a, b) => {
      const statusOrder = { 'error': 0, 'warning': 1, 'good': 2 };
      const statusComparison = statusOrder[a.facilityStatus] - statusOrder[b.facilityStatus];
      if (statusComparison !== 0) return statusComparison;
      return a.facility.name.localeCompare(b.facility.name);
    });

    this.toDoItems = {
      facilityTodoItems,
      otherItems: statusCheck.actions
    };

    this.allTodoItems = facilityTodoItems.flatMap(f => f.meterTodoItems.concat(f.predictorTodoItems));

    this.showWeatherButton = this.allTodoItems.some(item => item.isWeather && item.type === 'predictor');
    this.hasTodoItems = this.allTodoItems.length > 0 || statusCheck.actions.length > 0;
    this.totalTodoItems = this.allTodoItems.length + statusCheck.actions.length;
    this.hasInitialSetupItems = statusCheck.actions.some(item => item.trackGuid?.endsWith('_upload_data'));
  }

  async showToast() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.selectAccount(selectedAccount, true);
    let hasWarning = this.weatherPredictorManagementService.hasWarning;
    if (hasWarning) {
      this.toastNotificationService.showToast("Weather Predictors Updated", "One or more entries were calculated with gaps in data. Be sure to double check your predictor data for errors.", undefined, false, "alert-warning")
    } else {
      this.toastNotificationService.showToast("Weather Predictors Updated", "No gaps in data found while calculating weather predictors.", undefined, false, "alert-success")
    }
  }

  openWeatherPredictorModal() {
    this.showWeatherPredictorModal = true;
  }

  closeWeatherPredictorModal() {
    this.showWeatherPredictorModal = false;
  }

  goToUpload() {
    this.router.navigate(['../import-data'], { relativeTo: this.activatedRoute });
  }

  toggleShowPredictorItem(facilityIndex: number) {
    this.toDoItems.facilityTodoItems[facilityIndex].showPredictorItems = !this.toDoItems.facilityTodoItems[facilityIndex].showPredictorItems;
  }

  toggleShowMeterItem(facilityIndex: number) {
    this.toDoItems.facilityTodoItems[facilityIndex].showMeterItems = !this.toDoItems.facilityTodoItems[facilityIndex].showMeterItems;
  }
}
