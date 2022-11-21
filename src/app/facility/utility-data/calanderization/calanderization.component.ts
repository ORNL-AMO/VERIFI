import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { CalanderizationFilters, CalanderizationOptions, CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { IdbAccount, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { CalanderizationService } from '../../../shared/helper-services/calanderization.service';
import * as _ from 'lodash';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { UtilityColors } from 'src/app/shared/utilityColors';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-calanderization',
  templateUrl: './calanderization.component.html',
  styleUrls: ['./calanderization.component.css']
})
export class CalanderizationComponent implements OnInit {


  itemsPerPage: number;
  itemsPerPageSub: Subscription;
  calanderizedMeter: CalanderizedMeter;
  facilityMetersSub: Subscription;
  facilityMeterDataSub: Subscription;
  facilityMeters: Array<IdbUtilityMeter>;
  orderDataField: string = 'date';
  orderByDirection: string = 'desc';

  calanderizedDataFilters: CalanderizationFilters;
  calanderizedDataFiltersSub: Subscription;
  dataDisplay: "table" | "graph";
  displayGraphEnergy: "bar" | "scatter" | null;
  displayGraphCost: "bar" | "scatter" | null;

  dataApplicationMeter: IdbUtilityMeter;

  selectedMeter: IdbUtilityMeter;
  selectedFacility: IdbFacility;
  displayDataApplicationModal: boolean = false;
  constructor(private calanderizationService: CalanderizationService, private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService, private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService, private accountDbService: AccountdbService,
    private sharedDataService: SharedDataService) { }

  ngOnInit(): void {
    this.displayGraphCost = this.calanderizationService.displayGraphCost;
    this.displayGraphEnergy = this.calanderizationService.displayGraphEnergy;
    this.dataDisplay = this.calanderizationService.dataDisplay;
    this.selectedFacility = this.facilityDbService.selectedFacility.getValue();
    this.facilityMetersSub = this.utilityMeterDbService.facilityMeters.subscribe(facilityMeters => {
      this.facilityMeters = facilityMeters;
      this.initializeSelectedMeter();
      this.setCalanderizedMeterData();
    });

    this.calanderizedDataFiltersSub = this.calanderizationService.calanderizedDataFilters.subscribe(val => {
      this.calanderizedDataFilters = val;
      this.setCalanderizedMeterData();
    });


    this.facilityMeterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(() => {
      this.setCalanderizedMeterData();
    });

    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
  }

  ngOnDestroy() {
    this.facilityMetersSub.unsubscribe();
    this.facilityMeterDataSub.unsubscribe();
    this.calanderizedDataFiltersSub.unsubscribe();
    this.itemsPerPageSub.unsubscribe();
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

  initializeSelectedMeter() {
    if (!this.selectedMeter) {
      this.selectedMeter = this.facilityMeters[0];
    } else {
      let meterInFacility: IdbUtilityMeter = this.facilityMeters.find(meter => { return meter.id == this.selectedMeter.id });
      if (!meterInFacility) {
        this.selectedMeter = this.facilityMeters[0];
      }
    }
  }

  setCalanderizedMeterData() {
    if (this.selectedMeter && this.calanderizedDataFilters) {
      let calanderizationOptions: CalanderizationOptions = {
        energyIsSource: this.selectedFacility.energyIsSource
      }
      let calanderizedMeterData: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMeterData([this.selectedMeter], false, false, calanderizationOptions);
      this.setDateRange(calanderizedMeterData);
      calanderizedMeterData = this.filterMeterDataDateRanges(calanderizedMeterData);
      this.calanderizedMeter = calanderizedMeterData[0];
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

  setDateRange(calanderizedMeterData: Array<CalanderizedMeter>) {
    if (!this.calanderizedDataFilters.selectedDateMax || !this.calanderizedDataFilters.selectedDateMin) {
      let allMeterData: Array<MonthlyData> = calanderizedMeterData.flatMap(calanderizedMeter => { return calanderizedMeter.monthlyData });
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
    } else {
      let allMeterData: Array<MonthlyData> = calanderizedMeterData.flatMap(calanderizedMeter => { return calanderizedMeter.monthlyData });
      let maxDateEntry: MonthlyData = _.maxBy(allMeterData, 'date');
      let minDateEntry: MonthlyData = _.minBy(allMeterData, 'date');
      if (minDateEntry && this.calanderizedDataFilters.dataDateRange.maxDate < minDateEntry.date || this.calanderizedDataFilters.dataDateRange.minDate > maxDateEntry.date) {
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
    let maxDate: Date = new Date(this.calanderizedDataFilters.selectedDateMax.year, this.calanderizedDataFilters.selectedDateMax.month + 1);
    let minDate: Date = new Date(this.calanderizedDataFilters.selectedDateMin.year, this.calanderizedDataFilters.selectedDateMin.month - 1);
    let itemDate: Date = new Date(monthlyDataItem.date);
    return (maxDate > itemDate) && (minDate < itemDate);
  }

  setDataDisplay(str: "table" | "graph") {
    this.dataDisplay = str;
  }

  setDisplayGraphEnergy(str: "bar" | "scatter") {
    if (str == this.displayGraphEnergy) {
      this.displayGraphEnergy = undefined;
    } else {
      this.displayGraphEnergy = str;
    }
  }

  setDisplayGraphCost(str: "bar" | "scatter") {
    if (str == this.displayGraphCost) {
      this.displayGraphCost = undefined;
    } else {
      this.displayGraphCost = str;
    }
  }

  showDataApplicationModal() {
    this.dataApplicationMeter = JSON.parse(JSON.stringify(this.selectedMeter));
    this.displayDataApplicationModal = true;
  }

  cancelSetDataApplication() {
    this.displayDataApplicationModal = false;
    this.dataApplicationMeter = undefined;
  }

  async setDataApplication() {
    await this.utilityMeterDbService.updateWithObservable(this.dataApplicationMeter).toPromise();
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setMeters(selectedAccount, this.selectedFacility)
    this.selectedMeter = this.dataApplicationMeter;
    this.cancelSetDataApplication();
  }

  async setCalanderizeData(calanderize: 'fullMonth' | 'backward') {
    this.dataApplicationMeter = this.selectedMeter;
    this.dataApplicationMeter.meterReadingDataApplication = calanderize;
    await this.setDataApplication();
  }

  async setFacilityEnergyIsSource(energyIsSource: boolean) {
    if (this.selectedFacility.energyIsSource != energyIsSource) {
      this.selectedFacility.energyIsSource = energyIsSource;
      await this.dbChangesService.updateFacilities(this.selectedFacility);
      this.setCalanderizedMeterData();
    }
  }

  selectMeter(meter: IdbUtilityMeter) {
    this.selectedMeter = meter;
    this.setCalanderizedMeterData();
  }

  
  getColor(): string {
    return UtilityColors[this.selectedMeter.source].color
  }
}
