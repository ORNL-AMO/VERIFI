import { Component, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { getLatestYearWithData } from 'src/app/calculations/shared-calculations/calculationsHelpers';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import * as _ from 'lodash';
import { MeterGroupingDataService } from '../meter-grouping-data.service';

@Component({
  selector: 'app-meter-group-table',
  standalone: false,

  templateUrl: './meter-group-table.component.html',
  styleUrl: './meter-group-table.component.css'
})
export class MeterGroupTableComponent {
  @Input({required: true})
  meterGroup: IdbUtilityMeterGroup;
  @Input()
  showHeader: boolean;


  calanderizedMeters: Array<CalanderizedMeter>;
  calanderizedMetersSub: Subscription;

  meters: Array<IdbUtilityMeter>;
  metersSub: Subscription;

  meterData: Array<IdbUtilityMeterData>;
  meterDataSub: Subscription;
  energyUnit: string;
  consumptionUnit: string;

  meterList: Array<{
    meter: IdbUtilityMeter,
    lastReading: IdbUtilityMeterData,
    lastTwelveMonthsConsumption: number
    lastFullYearConsumption: number
  }>
  lastTwelveMonthsConsumptionTotal: number;
  lastFullYearConsumptionTotal: number;
  lastFullYear: number;
  lastTwelveMonthsStartDate: Date;
  lastTwelveMonthsEndDate: Date;

  facility: IdbFacility;
  facilitySub: Subscription;

  calculatingMeterGroups: boolean | 'error' = false ;
  calculatingMeterGroupsSub: Subscription;
  constructor(private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private facilityDbService: FacilitydbService,
    private meterGroupingDataService: MeterGroupingDataService
  ) { }

  ngOnInit() {
    this.calculatingMeterGroupsSub = this.meterGroupingDataService.calanderizingMeterData.subscribe(calculating => {
        this.calculatingMeterGroups = calculating;
    });

    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facility = facility;
    });
    this.metersSub = this.utilityMeterDbService.facilityMeters.subscribe(meters => {
      this.meters = meters.filter(m => {
        if (this.meterGroup == undefined) {
          return m.groupId == undefined;
        } else {
          return m.groupId == this.meterGroup.guid;
        }
      });
      this.setMeterList();
    });
    this.meterDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(meterData => {
      this.meterData = meterData;
      this.setMeterList();
    });

    this.calanderizedMetersSub = this.meterGroupingDataService.calanderizedMeters.subscribe(calanderizedMeters => {
      this.calanderizedMeters = calanderizedMeters;
      this.setMeterList();
    });
  }

  ngOnDestroy() {
    this.metersSub.unsubscribe();
    this.meterDataSub.unsubscribe();
    this.facilitySub.unsubscribe();
    this.calanderizedMetersSub.unsubscribe();
    this.calculatingMeterGroupsSub.unsubscribe();
  }

  setMeterList() {
    this.meterList = new Array();
    if (this.calanderizedMeters && this.meterData) {
      let groupCalanderizedMeters: Array<CalanderizedMeter> = this.calanderizedMeters.filter(cMeter => {
        return cMeter.meter.groupId == this.meterGroup.guid;
      });
      let allMonthlyData: Array<MonthlyData> = groupCalanderizedMeters.flatMap(cMeter => {
        return cMeter.monthlyData;
      });
      if (allMonthlyData.length > 0) {
        this.lastFullYear = getLatestYearWithData(groupCalanderizedMeters, [this.facility])
        let latestMonthWithData: MonthlyData = _.maxBy(allMonthlyData, (mData: MonthlyData) => {
          return new Date(mData.year, mData.monthNumValue).getTime();
        });
        this.lastTwelveMonthsEndDate = new Date(latestMonthWithData.year, latestMonthWithData.monthNumValue, 1);
        this.lastTwelveMonthsStartDate = new Date(this.lastTwelveMonthsEndDate);
        this.lastTwelveMonthsStartDate.setFullYear(this.lastTwelveMonthsStartDate.getFullYear() - 1);
        // add one month to start date, currently 13 months of data, want 12
        this.lastTwelveMonthsStartDate.setMonth(this.lastTwelveMonthsStartDate.getMonth() + 1);
        this.lastFullYearConsumptionTotal = this.getLastFullYearConsumptionTotal(allMonthlyData);
        this.lastTwelveMonthsConsumptionTotal = this.getLastTwelveMonthsConsumption(allMonthlyData);
        groupCalanderizedMeters.forEach(cMeter => {
          let meterReadings: Array<IdbUtilityMeterData> = this.meterData.filter(m => m.meterId == cMeter.meter.guid);
          let lastReading: IdbUtilityMeterData = _.maxBy(meterReadings, (mData: IdbUtilityMeterData) => {
            return new Date(mData.year, mData.month, mData.day).getTime();
          });
          let lastFullYearConsumption: number = this.getLastFullYearConsumptionTotal(cMeter.monthlyData);
          let lastTwelveMonthsConsumption: number = this.getLastTwelveMonthsConsumption(cMeter.monthlyData);
          this.meterList.push({
            meter: cMeter.meter,
            lastReading: lastReading,
            lastFullYearConsumption: lastFullYearConsumption,
            lastTwelveMonthsConsumption: lastTwelveMonthsConsumption
          });
        })
      } else {
        let groupMeters: Array<IdbUtilityMeter> = this.meters.filter(m => {
          return m.groupId == this.meterGroup.guid;
        });
        this.meterList = groupMeters.map(meter => {
          return {
            meter: meter,
            lastReading: undefined,
            lastFullYearConsumption: undefined,
            lastTwelveMonthsConsumption: undefined
          }
        });
      }
    }
  }

  getLastFullYearConsumptionTotal(monthlyData: Array<MonthlyData>): number {
    let lastFullYearMonthlyData: Array<MonthlyData> = monthlyData.filter(m => m.fiscalYear == this.lastFullYear);
    return _.sumBy(lastFullYearMonthlyData, (m: MonthlyData) => {
      if (this.meterGroup && this.meterGroup.groupType == 'Energy') {
        return m.energyUse;
      } else {
        return m.energyConsumption
      }
    });
  }

  getLastTwelveMonthsConsumption(monthlyData: Array<MonthlyData>): number {
    //double check use of dates here...
    let lastTwelveMonthsMonthlyData: Array<MonthlyData> = monthlyData.filter(m => {
      let monthDate = new Date(m.year, m.monthNumValue, 1);
      return monthDate >= this.lastTwelveMonthsStartDate && monthDate <= this.lastTwelveMonthsEndDate;
    });
    return _.sumBy(lastTwelveMonthsMonthlyData, (m: MonthlyData) => {
      if (this.meterGroup && this.meterGroup.groupType == 'Energy') {
        return m.energyUse;
      } else {
        return m.energyConsumption
      }
    });

  }
}
