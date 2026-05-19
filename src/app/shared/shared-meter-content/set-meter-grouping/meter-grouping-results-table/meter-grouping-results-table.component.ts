import { Component, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { CopyTableService } from 'src/app/shared/helper-services/copy-table.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { MeterGroupingDataService } from '../meter-grouping-data.service';

@Component({
  selector: 'app-meter-grouping-results-table',
  standalone: false,
  templateUrl: './meter-grouping-results-table.component.html',
  styleUrl: './meter-grouping-results-table.component.css',
})
export class MeterGroupingResultsTableComponent {

  @ViewChild('meterTable', { static: false }) meterTable: ElementRef;

  meterGroup: IdbUtilityMeterGroup;

  orderDataField: string = 'date';
  orderByDirection: string = 'desc';

  calanderizedMeters: Array<CalanderizedMeter>;
  calanderizedMetersSub: Subscription;

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
  selectedFacility: IdbFacility;
  calculatingMeterGroups: boolean | 'error' = false;
  calculatingMeterGroupsSub: Subscription;

  constructor(private activatedRoute: ActivatedRoute,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private router: Router,
    private facilityDbService: FacilitydbService,
    private copyTableService: CopyTableService,
    private sharedDataService: SharedDataService,
    private dbChangesService: DbChangesService,
    private meterGroupingDataService: MeterGroupingDataService
  ) { }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let meterGroupId: string = params['id'];
      this.meterGroup = this.utilityMeterGroupDbService.getGroupById(meterGroupId);
      if (!this.meterGroup) {
        this.cancel();
      }
    });
    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });

    this.calculatingMeterGroupsSub = this.meterGroupingDataService.calanderizingMeterData.subscribe(calculating => {
        this.calculatingMeterGroups = calculating;
    });
    
    this.calanderizedMetersSub = this.meterGroupingDataService.calanderizedMeters.subscribe(calanderizedMeters => {
       if (calanderizedMeters.length > 0) {
         this.setCalanderizedMeterData(calanderizedMeters);
       }
     });
  }

  ngOnDestroy() {
    this.itemsPerPageSub.unsubscribe();
    this.calanderizedMetersSub.unsubscribe();
    this.calculatingMeterGroupsSub.unsubscribe();
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

  setCalanderizedMeterData(calanderizedMeters: Array<CalanderizedMeter>) {
    this.calanderizedMeters = calanderizedMeters.filter(cMeter => {
      return cMeter.meter.groupId == this.meterGroup.guid;
    });
    this.selectedFacility = this.facilityDbService.selectedFacility.getValue();
    this.energyUnit = this.selectedFacility.energyUnit;
    this.consumptionUnit = this.selectedFacility.volumeLiquidUnit;
    this.groupMonthlyData = this.calanderizedMeters.flatMap(meter => { return meter.monthlyData });
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
    }
  }

}
