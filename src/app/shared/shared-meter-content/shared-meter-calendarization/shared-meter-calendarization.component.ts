import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { CalanderizationFilters, CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { CalanderizationService } from '../../../shared/helper-services/calanderization.service';
import * as _ from 'lodash';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbCustomFuel } from 'src/app/models/idbModels/customFuel';

@Component({
  selector: 'app-shared-meter-calendarization',
  templateUrl: './shared-meter-calendarization.component.html',
  styleUrl: './shared-meter-calendarization.component.css',
  standalone: false
})
export class SharedMeterCalendarizationComponent {
  @Input({ required: true })
  selectedMeter: IdbUtilityMeter;

  itemsPerPage: number;
  itemsPerPageSub: Subscription;
  calanderizedMeter: CalanderizedMeter;
  orderDataField: string = 'date';
  orderByDirection: string = 'desc';

  calanderizedDataFilters: CalanderizationFilters;
  calanderizedDataFiltersSub: Subscription;
  dataDisplay: "table" | "graph";
  displayGraphEnergy: "bar" | "scatter" | null;
  displayGraphCost: "bar" | "scatter" | null;

  dataApplicationMeter: IdbUtilityMeter;

  selectedFacility: IdbFacility;
  displayDataApplicationModal: boolean = false;
  hasMeterData: boolean;
  consumptionLabel: 'Consumption' | 'Distance';
  isRECs: boolean;
  constructor(private calanderizationService: CalanderizationService, private utilityMeterDbService: UtilityMeterdbService,
    private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService, private accountDbService: AccountdbService,
    private sharedDataService: SharedDataService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private eGridService: EGridService,
    private customFuelDbService: CustomFuelDbService) { }

  ngOnInit(): void {
    this.displayGraphCost = this.calanderizationService.displayGraphCost;
    this.displayGraphEnergy = this.calanderizationService.displayGraphEnergy;
    this.dataDisplay = this.calanderizationService.dataDisplay;
    this.selectedFacility = this.facilityDbService.selectedFacility.getValue();
    this.setHasMeterData();
    this.calanderizedDataFiltersSub = this.calanderizationService.calanderizedDataFilters.subscribe(val => {
      this.calanderizedDataFilters = val;
      this.setCalanderizedMeterData();
    });

    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedMeter'] && !changes['selectedMeter'].firstChange) {
      this.setHasMeterData();
      this.setCalanderizedMeterData();
    }
  }

  ngOnDestroy() {
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


  setCalanderizedMeterData() {
    if (this.selectedMeter && this.calanderizedDataFilters) {
      let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
      let customFuels: Array<IdbCustomFuel> = this.customFuelDbService.accountCustomFuels.getValue();
      let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
      let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
      let allCalanderizedMeterData: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, facilityMeterData, this.selectedFacility, false, undefined, this.eGridService.co2Emissions, customFuels, [this.selectedFacility], selectedAccount.assessmentReportVersion);

      let calanderizedMeterData: Array<CalanderizedMeter> = allCalanderizedMeterData.filter(cMeter => {
        return cMeter.meter.guid == this.selectedMeter.guid
      });
      calanderizedMeterData = this.filterMeterDataDateRanges(calanderizedMeterData);
      this.calanderizedMeter = calanderizedMeterData[0];
      if (this.selectedMeter.scope != 2) {
        this.consumptionLabel = 'Consumption';
      } else {
        this.consumptionLabel = 'Distance';
      }
      if (this.selectedMeter.source != 'Electricity') {
        this.isRECs = false;
      } else {
        this.isRECs = (this.selectedMeter.agreementType == 4 || this.selectedMeter.agreementType == 6);
      }
      this.setDateRange(allCalanderizedMeterData)
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
    if (calanderizedMeterData.length != 0) {
      if (!this.calanderizedDataFilters.selectedDateMax || !this.calanderizedDataFilters.selectedDateMin) {
        let allMeterData: Array<MonthlyData> = calanderizedMeterData.flatMap(calanderizedMeter => { return calanderizedMeter.monthlyData });
        if (allMeterData.length != 0) {
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
      } else {
        let allMeterData: Array<MonthlyData> = calanderizedMeterData.flatMap(calanderizedMeter => { return calanderizedMeter.monthlyData });
        if (allMeterData.length != 0) {
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
    this.sharedDataService.modalOpen.next(true);
    this.dataApplicationMeter = JSON.parse(JSON.stringify(this.selectedMeter));
    this.displayDataApplicationModal = true;
  }

  cancelSetDataApplication() {
    this.sharedDataService.modalOpen.next(false);
    this.displayDataApplicationModal = false;
    this.dataApplicationMeter = undefined;
  }

  async setDataApplication() {
    await firstValueFrom(this.utilityMeterDbService.updateWithObservable(this.dataApplicationMeter));
    this.selectedMeter = this.dataApplicationMeter;
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setMeters(selectedAccount, this.selectedFacility)
    this.cancelSetDataApplication();
    this.setCalanderizedMeterData();
  }

  async setCalanderizeData(calanderize: 'fullMonth' | 'backward' | 'fullYear') {
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

  setHasMeterData() {
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataFromMeterId(this.selectedMeter.guid);
    if (meterData.length != 0) {
      this.hasMeterData = true;
      this.setCalanderizedMeterData();
    } else {
      this.hasMeterData = false;
    }
  }
}
