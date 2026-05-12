import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { AccountStatusCheck } from 'src/app/calculations/status-check-calculations/accountStatusCheck';
import { StatusCheckAction } from 'src/app/calculations/status-check-calculations/statusCheckModels';

interface FacilityActionGroup {
  facility: IdbFacility;
  showMeterItems: boolean;
  meterTodoItems: Array<StatusCheckAction>;
  showPredictorItems: boolean;
  predictorTodoItems: Array<StatusCheckAction>;
  numberOfItems: number;
}

@Component({
  selector: 'app-setup-checklist',
  standalone: false,

  templateUrl: './setup-checklist.component.html',
  styleUrl: './setup-checklist.component.css'
})
export class SetupChecklistComponent {

  account: IdbAccount;
  accountSub: Subscription;

  toDoItems: {
    facilityTodoItems: Array<FacilityActionGroup>,
    otherItems: Array<StatusCheckAction>
  } = { facilityTodoItems: [], otherItems: [] };
  hasTodoItems: boolean = false;
  totalTodoItems: number = 0;
  allTodoItems: Array<StatusCheckAction> = [];

  outdatedDaysOptions: Array<number> = [30, 60, 90, 180, 365];

  statusCheckSub: Subscription;

  constructor(
    private accountDbService: AccountdbService,
    private accountStatusCheckService: AccountStatusCheckService
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
  }

  ngOnDestroy() {
    this.accountSub.unsubscribe();
    this.statusCheckSub.unsubscribe();
  }

  setDisplayItems(statusCheck: AccountStatusCheck) {
    const facilityTodoItems: Array<FacilityActionGroup> = statusCheck.facilityStatusChecks
      .filter(fc => fc.allActions.length > 0)
      .map(fc => {
        const meterActions = [...fc.actions.filter(a => a.type === 'meter'), ...fc.metersStatusChecks.flatMap(m => m.actions)];
        const predictorActions = [...fc.actions.filter(a => a.type === 'predictor'), ...fc.predictorsStatusChecks.flatMap(p => p.actions)];
        return {
          facility: fc.facility,
          showMeterItems: false,
          meterTodoItems: meterActions,
          showPredictorItems: false,
          predictorTodoItems: predictorActions,
          numberOfItems: meterActions.length + predictorActions.length
        };
      });

    this.toDoItems = {
      facilityTodoItems,
      otherItems: statusCheck.actions
    };

    this.allTodoItems = facilityTodoItems.flatMap(f => f.meterTodoItems.concat(f.predictorTodoItems));
    this.hasTodoItems = this.allTodoItems.length > 0 || statusCheck.actions.length > 0;
    this.totalTodoItems = this.allTodoItems.length + statusCheck.actions.length;
  }

  toggleShowPredictorItem(facilityIndex: number) {
    this.toDoItems.facilityTodoItems[facilityIndex].showPredictorItems = !this.toDoItems.facilityTodoItems[facilityIndex].showPredictorItems;
  }

  toggleShowMeterItem(facilityIndex: number) {
    this.toDoItems.facilityTodoItems[facilityIndex].showMeterItems = !this.toDoItems.facilityTodoItems[facilityIndex].showMeterItems;
  }
}
