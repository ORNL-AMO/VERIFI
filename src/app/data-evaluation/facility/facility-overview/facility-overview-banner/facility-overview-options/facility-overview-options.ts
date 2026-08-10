import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, Injector } from '@angular/core';
import { FacilityOverviewService } from '../../facility-overview.service';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { FacilityCommandHandler } from 'src/app/account-workspace/handlers/facility-command-handler.service';
import { Subscription } from 'rxjs';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { Month, Months } from 'src/app/shared/form-data/months';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import * as _ from 'lodash';
import { IdbAccount } from 'src/app/models/idbModels/account';

@Component({
  selector: 'app-facility-overview-options',
  standalone: false,
  templateUrl: './facility-overview-options.html',
  styleUrl: './facility-overview-options.css',
})
export class FacilityOverviewOptions {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  emissionsDisplay: 'market' | 'location';
  emissionsDisplaySub: Subscription;
  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;

  minMonth: number;
  minYear: number;
  maxMonth: number;
  maxYear: number;
  months: Array<Month> = Months;
  years: Array<number>;
  errorMessage: string = '';
  dateRangeSub: Subscription;
  displayMenu: boolean = true;

  account: IdbAccount;
  accountSub: Subscription;
  constructor(
    private facilityOverviewService: FacilityOverviewService,
    private commandBoundary: WorkspaceCommandBoundary,
    private facilityHandler: FacilityCommandHandler,
    private injector: Injector
  ) { }

  ngOnInit() {
    this.selectedFacilitySub = toObservable(this.accountWorkspaceStore.selectedFacility, { injector: this.injector }).subscribe(val => {
      this.selectedFacility = val;
      this.setYears();
    });

    this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(val => {
      this.emissionsDisplay = val;
    })

    this.dateRangeSub = this.facilityOverviewService.dateRange.subscribe(dateRange => {
      if (dateRange) {
        this.minMonth = dateRange.startDate.getMonth();
        this.minYear = dateRange.startDate.getFullYear();
        this.maxMonth = dateRange.endDate.getMonth();
        this.maxYear = dateRange.endDate.getFullYear();
      }
    });

    this.accountSub = toObservable(this.accountWorkspaceStore.account, { injector: this.injector }).subscribe(account => {
      this.account = account;
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
    this.emissionsDisplaySub.unsubscribe();
    this.dateRangeSub.unsubscribe();
    this.accountSub.unsubscribe();
  }

  async setFacilityEnergyIsSource() {
    await this.commandBoundary.execute(
      { entityKind: 'facility', changeKind: 'update', entityGuid: this.selectedFacility.guid, label: 'Updating facility' ,
        publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'facilities', upsert: [value] }] }) }},
      () => this.facilityHandler.update({ ...this.selectedFacility }, this.account?.guid)
    );
  }

  setEmissions() {
    this.facilityOverviewService.emissionsDisplay.next(this.emissionsDisplay);
  }
  //date validation
  setDate() {
    let startDate: Date = new Date(this.minYear, this.minMonth, 1);
    let endDate: Date = new Date(this.maxYear, this.maxMonth, 1);

    // compare start and end date
    if (startDate.getTime() >= endDate.getTime()) {
      this.errorMessage = 'Start date cannot be later than the end date';
      return;
    }

    this.errorMessage = '';

    // Proceed with valid date range
    this.facilityOverviewService.dateRange.next({
      startDate: startDate,
      endDate: endDate
    });
  }

  setYears() {
    let facilityMeterData: Array<IdbUtilityMeterData> = [...this.accountWorkspaceStore.facilityMeterData()];
    let allYears: Array<number> = facilityMeterData.flatMap(meterData => { return meterData.year });
    allYears = _.uniq(allYears);
    this.years = _.orderBy(allYears, (year) => { return year }, 'desc');
  }
}
