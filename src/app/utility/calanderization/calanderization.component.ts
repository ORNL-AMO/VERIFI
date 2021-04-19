import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { CalanderizationFilters, CalanderizationService } from '../../shared/helper-services/calanderization.service';
import * as _ from 'lodash';

@Component({
  selector: 'app-calanderization',
  templateUrl: './calanderization.component.html',
  styleUrls: ['./calanderization.component.css']
})
export class CalanderizationComponent implements OnInit {


  itemsPerPage = 12;
  tablePageNumbers: Array<number>;
  calanderizedMeterData: Array<CalanderizedMeter>
  facilityMetersSub: Subscription;
  facilityMeterDataSub: Subscription;
  facilityMeters: Array<IdbUtilityMeter>;
  orderDataField: string = 'date';
  orderByDirection: string = 'desc';

  calanderizedDataFilters: CalanderizationFilters;
  calanderizedDataFiltersSub: Subscription;
  dataDisplay: "table" | "graph";
  displayGraphEnergy: "bar" | "scatter" | null;
  displayGraphCost:  "bar" | "scatter" | null;

  constructor(private calanderizationService: CalanderizationService, private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    this.displayGraphCost = this.calanderizationService.displayGraphCost;
    this.displayGraphEnergy = this.calanderizationService.displayGraphEnergy;
    this.dataDisplay = this.calanderizationService.dataDisplay;
    this.calanderizedDataFiltersSub = this.calanderizationService.calanderizedDataFilters.subscribe(val => {
      this.calanderizedDataFilters = val;
      this.setCalanderizedMeterData();
    });

    this.facilityMetersSub = this.utilityMeterDbService.facilityMeters.subscribe(facilityMeters => {
      this.facilityMeters = facilityMeters;
      this.setCalanderizedMeterData();
    });

    this.facilityMeterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(() => {
      this.setCalanderizedMeterData();
    });

  }

  ngOnDestroy() {
    this.facilityMetersSub.unsubscribe();
    this.facilityMeterDataSub.unsubscribe();
    this.calanderizedDataFiltersSub.unsubscribe();
    this.calanderizationService.calanderizedDataFilters.next({
      selectedSources: [],
      showAllSources: true,
      selectedDateMax: undefined,
      selectedDateMin: undefined,
      dataDateRange: undefined
    });
    this.calanderizationService.displayGraphCost = this.displayGraphCost;
    this.calanderizationService.displayGraphEnergy = this.displayGraphEnergy;
    this.calanderizationService.dataDisplay = this.dataDisplay;
  }

  setCalanderizedMeterData() {
    if (this.facilityMeters) {
      let filteredMeters: Array<IdbUtilityMeter> = this.filterMeters(this.facilityMeters);
      this.calanderizedMeterData = this.calanderizationService.getCalanderizedMeterData(filteredMeters, false);
      this.calanderizedMeterData = this.calanderizedMeterData.filter(data => { return data.monthlyData.length != 0 });
      this.setDateRange();
      this.calanderizedMeterData = this.filterMeterDataDateRanges(this.calanderizedMeterData);
      this.tablePageNumbers = this.calanderizedMeterData.map(() => { return 1 });
    }
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

  filterMeters(meters: Array<IdbUtilityMeter>): Array<IdbUtilityMeter> {
    let filteredMeters: Array<IdbUtilityMeter> = meters;
    //filter by source
    if (this.calanderizedDataFilters) {
      if (!this.calanderizedDataFilters.showAllSources) {
        let selectedSources: Array<string> = new Array();
        this.calanderizedDataFilters.selectedSources.forEach(sourceOption => {
          if (sourceOption.selected) {
            selectedSources.push(sourceOption.source);
          }
        })
        filteredMeters = filteredMeters.filter(meter => { return selectedSources.includes(meter.source) });
      }
    }
    return filteredMeters;
  }

  setDateRange() {
    if (!this.calanderizedDataFilters.selectedDateMax || !this.calanderizedDataFilters.selectedDateMin) {
      let allMeterData: Array<MonthlyData> = this.calanderizedMeterData.flatMap(calanderizedMeter => { return calanderizedMeter.monthlyData });
      let maxDateEntry: MonthlyData = _.maxBy(allMeterData, 'date');
      let minDateEntry: MonthlyData = _.minBy(allMeterData, 'date');
      if (minDateEntry && maxDateEntry) {
        this.calanderizedDataFilters.selectedDateMax = {
          year: maxDateEntry.year,
          month: maxDateEntry.monthNumValue
        };
        this.calanderizedDataFilters.selectedDateMin = {
          year: minDateEntry.year,
          month: minDateEntry.monthNumValue
        };
        this.calanderizedDataFilters.dataDateRange = {
          minDate: minDateEntry.date,
          maxDate: maxDateEntry.date
        }
        this.calanderizationService.calanderizedDataFilters.next(this.calanderizedDataFilters);
      }
    }
  }

  filterMeterDataDateRanges(calanderizedMeterData: Array<CalanderizedMeter>): Array<CalanderizedMeter> {
    if (this.calanderizedDataFilters.selectedDateMax && this.calanderizedDataFilters.selectedDateMin) {
      calanderizedMeterData.forEach(calanderizedMeter => {
        calanderizedMeter.monthlyData = calanderizedMeter.monthlyData.filter(monthlyDataItem => {
          return this.checkMonthlyDataItemInRange(monthlyDataItem);
        })
      });
    }
    return calanderizedMeterData;
  }

  checkMonthlyDataItemInRange(monthlyDataItem: MonthlyData): boolean {
    let isInRange: boolean = true;
    if (this.calanderizedDataFilters.selectedDateMax.year < monthlyDataItem.year) {
      isInRange = false;
    }
    if (this.calanderizedDataFilters.selectedDateMax.year == monthlyDataItem.year && this.calanderizedDataFilters.selectedDateMax.month < monthlyDataItem.monthNumValue) {
      isInRange = false;
    }
    if (this.calanderizedDataFilters.selectedDateMin.year > monthlyDataItem.year) {
      isInRange = false;
    }
    if (this.calanderizedDataFilters.selectedDateMin.year == monthlyDataItem.year && this.calanderizedDataFilters.selectedDateMin.month > monthlyDataItem.monthNumValue) {
      isInRange = false;
    }
    return isInRange;
  }

  setDataDisplay(str: "table" | "graph") {
    this.dataDisplay = str;
  }

  setDisplayGraphEnergy(str: "bar" | "scatter") {
    if(str == this.displayGraphEnergy){
      this.displayGraphEnergy = undefined;
    }else{
      this.displayGraphEnergy = str;      
    }
  }

  setDisplayGraphCost(str:  "bar" | "scatter") {
    if(str == this.displayGraphCost){
      this.displayGraphCost = undefined;
    }else{
      this.displayGraphCost = str;      
    }
  }

  getConsumptionUnit(meterData: IdbUtilityMeterData){
    let meter: IdbUtilityMeter = this.facilityMeters.find(meter => {return meter.id == meterData.id});
    
  }
}
