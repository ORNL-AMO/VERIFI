import { Component, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { CopyTableService } from 'src/app/shared/helper-services/copy-table.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-meter-grouping-results-table',
  standalone: false,
  templateUrl: './meter-grouping-results-table.component.html',
  styleUrl: './meter-grouping-results-table.component.css',
})
export class MeterGroupingResultsTableComponent {

  @ViewChild('meterTable', { static: false }) meterTable: ElementRef;

  meterGroup: IdbUtilityMeterGroup;

  orderDataField: string = 'readDate';
  orderByDirection: string = 'desc';

  calanderizedMeterData: Array<CalanderizedMeter>;
  groupMonthlyData: Array<MonthlyData>;
  copyingTable: boolean = false;
  currentPageNumber: number = 1;
  energyUnit: string;
  consumptionUnit: string;
  itemsPerPageSub: Subscription;
  itemsPerPage: number;

  showConsumption: boolean = false;
  showEnergyUse: boolean = true;
  showCost: boolean = false;
  metersInGroup: Array<IdbUtilityMeter>;
  selectedFacility: IdbFacility;
  constructor(private activatedRoute: ActivatedRoute,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private router: Router,
    private facilityDbService: FacilitydbService,
    private accountDbService: AccountdbService,
    private copyTableService: CopyTableService,
    private sharedDataService: SharedDataService,
    private dbChangesService: DbChangesService
  ) { }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let meterGroupId: string = params['id'];
      this.meterGroup = this.utilityMeterGroupDbService.getGroupById(meterGroupId);
      if (!this.meterGroup) {
        this.cancel();
      } else {
        this.setCalanderizedMeterData();
      }
    });
    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
  }

  ngOnDestroy() {
    this.itemsPerPageSub.unsubscribe();
  }

  cancel() {
    this.router.navigate(['../..'], { relativeTo: this.activatedRoute });
  }

  viewGroupChartData() {
    this.router.navigate(['../../data-chart/' + this.meterGroup.guid], { relativeTo: this.activatedRoute });
  }

  editGroup() {
    this.router.navigate(['../../edit-group/' + this.meterGroup.guid], { relativeTo: this.activatedRoute });
  }

  setCalanderizedMeterData() {
    this.metersInGroup = this.utilityMeterDbService.getGroupMetersByGroupId(this.meterGroup.guid);
    let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
    this.selectedFacility = this.facilityDbService.selectedFacility.getValue();
    this.energyUnit = this.selectedFacility.energyUnit;
    this.consumptionUnit = this.selectedFacility.volumeLiquidUnit;
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.calanderizedMeterData = getCalanderizedMeterData(this.metersInGroup, facilityMeterData, this.selectedFacility, false, { energyIsSource: this.selectedFacility.energyIsSource, neededUnits: undefined }, [], [], [this.selectedFacility], account.assessmentReportVersion, []);
    this.groupMonthlyData = this.calanderizedMeterData.flatMap(meter => { return meter.monthlyData });
    //combine monthly data for meters in group with same month and year
    this.groupMonthlyData = this.groupMonthlyData.reduce((acc, monthlyData) => {
      let existingData = acc.find(data => { return data.month == monthlyData.month && data.year == monthlyData.year });
      if (existingData) {
        existingData.energyUse += monthlyData.energyUse;
        existingData.energyCost += monthlyData.energyCost;
        existingData.energyConsumption += monthlyData.energyConsumption;
      } else {
        acc.push({ ...monthlyData });
      }
      return acc;
    }, new Array<MonthlyData>());

    //check energy use and cost
    if (this.meterGroup.groupType == 'Energy') {
      this.showEnergyUse = this.groupMonthlyData.some(data => { return data.energyUse > 0 });
    } else {
      this.showEnergyUse = false;
    }
    if (this.meterGroup.groupType == 'Water') {
      this.showConsumption = this.groupMonthlyData.some(data => { return data.energyConsumption > 0 });
    } else {
      this.showConsumption = false;
    }
    this.showCost = this.groupMonthlyData.some(data => { return data.energyCost > 0 });
  }

  setOrderDataField(str: string) {
    if (str == this.orderDataField) {
      if (this.orderByDirection == 'desc') {
        this.orderByDirection = 'asc';
      } else {
        this.orderByDirection = 'desc';
      }
    } else {
      this.orderDataField = str;
    }
  }


  copyTable() {
    this.copyingTable = true;
    setTimeout(() => {
      this.copyTableService.copyTable(this.meterTable);
      this.copyingTable = false;
    }, 200)
  }

  async setFacilityEnergyIsSource(energyIsSource: boolean) {
    if (this.selectedFacility.energyIsSource != energyIsSource) {
      this.selectedFacility.energyIsSource = energyIsSource;
      await this.dbChangesService.updateFacilities(this.selectedFacility);
      this.setCalanderizedMeterData();
    }
  }

}
