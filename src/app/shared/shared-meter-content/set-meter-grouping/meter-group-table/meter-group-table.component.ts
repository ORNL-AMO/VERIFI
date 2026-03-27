import { Component, Input, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { getLatestYearWithData } from 'src/app/calculations/shared-calculations/calculationsHelpers';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import * as _ from 'lodash';

@Component({
  selector: 'app-meter-group-table',
  standalone: false,

  templateUrl: './meter-group-table.component.html',
  styleUrl: './meter-group-table.component.css'
})
export class MeterGroupTableComponent {
  @Input()
  meterGroup: IdbUtilityMeterGroup | undefined;
  @Input()
  showHeader: boolean;
  @Input()
  calanderizedMeterData: Array<CalanderizedMeter>;

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
  constructor(private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private facilityDbService: FacilitydbService,
    private accountDbService: AccountdbService
  ) { }

  ngOnInit() {
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
      this.setCalanderizedMeterData();
      this.setMeterList();
    });
    this.meterDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(meterData => {
      this.meterData = meterData;
      this.setCalanderizedMeterData();
      this.setMeterList();
    });
  }

  ngOnDestroy() {
    this.metersSub.unsubscribe();
    this.meterDataSub.unsubscribe();
    this.facilitySub.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['calanderizedMeterData'] && !changes['calanderizedMeterData'].firstChange) {
      this.setMeterList();
    }
  }

  setCalanderizedMeterData() {
    //TODO: don't call calanderizeMeterData here unless needed.
    
    if (!this.calanderizedMeterData && this.meters && this.meterData) {
      this.energyUnit = this.facility.energyUnit;
      this.consumptionUnit = this.facility.volumeLiquidUnit;
      let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
      this.calanderizedMeterData = getCalanderizedMeterData(this.meters, this.meterData, this.facility, false, { energyIsSource: this.facility.energyIsSource, neededUnits: undefined }, [], [], [this.facility], account.assessmentReportVersion, []);
    }
  }

  setMeterList() {
    this.meterList = new Array();
    if (this.calanderizedMeterData && this.meterData) {
      let allMonthlyData: Array<MonthlyData> = this.calanderizedMeterData.flatMap(cMeter => {
        return cMeter.monthlyData;
      });
      if (allMonthlyData.length > 0) {
        this.lastFullYear = getLatestYearWithData(this.calanderizedMeterData, [this.facility])
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
        this.calanderizedMeterData.forEach(cMeter => {
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
      }else{
        this.meterList = this.calanderizedMeterData.map(cMeter => {
          return {
            meter: cMeter.meter,
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
