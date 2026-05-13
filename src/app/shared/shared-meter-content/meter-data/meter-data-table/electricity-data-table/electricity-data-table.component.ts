import { Component, computed, ElementRef, inject, output, signal, Signal, ViewChild, WritableSignal } from '@angular/core';
import * as _ from 'lodash';
import { CopyTableService } from 'src/app/shared/helper-services/copy-table.service';
import { ElectricityDataFilters, EmissionsFilters, GeneralInformationFilters } from 'src/app/models/meterDataFilter';
import { EmissionsResults, SubregionEmissions } from 'src/app/models/eGridEmissions';
import { getEmissions, setUtilityDataEmissionsValues } from 'src/app/calculations/emissions-calculations/emissions';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData, MeterDataCharge } from 'src/app/models/idbModels/utilityMeterData';
import { IdbCustomFuel } from 'src/app/models/idbModels/customFuel';
import { UtilityMeterDataService } from 'src/app/shared/shared-meter-content/utility-meter-data.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { ElectronService } from 'src/app/electron/electron.service';
import { OrderMeterDataByPipe } from '../order-meter-data-by.pipe';
import { toSignal } from '@angular/core/rxjs-interop';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { getDateFromMeterData } from 'src/app/shared/dateHelperFunctions';

type OrderByFields = 'readDate' | 'totalEnergyUse' | 'totalCost' | 'totalRealDemand' | 'totalBilledDemand' | 'totalMarketEmissions' | 'totalLocationEmissions' | 'RECs' | 'excessRECs' | 'excessRECsEmissions' | 'powerFactor';

@Component({
  selector: 'app-electricity-data-table',
  templateUrl: './electricity-data-table.component.html',
  styleUrls: ['./electricity-data-table.component.css'],
  standalone: false
})
export class ElectricityDataTableComponent {
  private utilityMeterDataService: UtilityMeterDataService = inject(UtilityMeterDataService);
  private copyTableService: CopyTableService = inject(CopyTableService);
  private eGridService: EGridService = inject(EGridService);
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private customFuelDbService: CustomFuelDbService = inject(CustomFuelDbService);
  private accountDbService: AccountdbService = inject(AccountdbService);
  private electronService: ElectronService = inject(ElectronService);
  private utilityMeterDbService: UtilityMeterdbService = inject(UtilityMeterdbService);
  private sharedDataService: SharedDataService = inject(SharedDataService);
  private utilityMeterDataDbService: UtilityMeterDatadbService = inject(UtilityMeterDatadbService);

  readonly setChecked = output<Set<string>>();
  readonly setEdit = output<IdbUtilityMeterData>();
  readonly setDelete = output<IdbUtilityMeterData>();

  itemsPerPage: Signal<number> = toSignal(this.sharedDataService.itemsPerPage);
  selectedMeter: Signal<IdbUtilityMeter> = toSignal(this.utilityMeterDbService.selectedMeter);
  facilityMeterData: Signal<Array<IdbUtilityMeterData>> = toSignal(this.utilityMeterDataDbService.facilityMeterData);
  customFuels: Signal<Array<IdbCustomFuel>> = toSignal(this.customFuelDbService.accountCustomFuels);
  facility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility);
  account: Signal<IdbAccount> = toSignal(this.accountDbService.selectedAccount);
  electricityDataFilters: Signal<ElectricityDataFilters> = toSignal(this.utilityMeterDataService.tableElectricityFilters);

  selectedMeterData: Signal<Array<IdbUtilityMeterData>> = computed(() => {
    const meterData: Array<IdbUtilityMeterData> = this.facilityMeterData();
    const selectedMeter: IdbUtilityMeter = this.selectedMeter();
    const customFuels: Array<IdbCustomFuel> = this.customFuels();
    const facility: IdbFacility = this.facility();
    const account: IdbAccount = this.account();
    if (!meterData || !selectedMeter || !customFuels || !facility || !account) {
      return [];
    }
    let selectedMeterData: Array<IdbUtilityMeterData> = meterData.filter(data => { return data.meterId == selectedMeter.guid });
    //set emissions
    if (selectedMeterData.length > 0 && selectedMeter) {
      let co2EmissionsRates: Array<SubregionEmissions> = this.eGridService.co2Emissions.map(rate => { return rate });
      selectedMeterData.forEach(dataItem => {
        let emissionsValues: EmissionsResults = getEmissions(selectedMeter, dataItem.totalEnergyUse, selectedMeter.energyUnit, dataItem.year, false, [facility],
          co2EmissionsRates, customFuels, 0, undefined, undefined, dataItem.heatCapacity, account.assessmentReportVersion, []);
        dataItem = setUtilityDataEmissionsValues(dataItem, emissionsValues);
      });
    }
    return selectedMeterData;
  });


  generalInformationFilters: Signal<GeneralInformationFilters> = computed(() => {
    let filters: ElectricityDataFilters = this.electricityDataFilters();
    return filters.generalInformationFilters;
  });
  emissionsFilters: Signal<EmissionsFilters> = computed(() => {
    let filters: ElectricityDataFilters = this.electricityDataFilters();
    return filters.emissionsFilters;
  });



  numDetailedCharges: Signal<number> = computed(() => {
    const selectedMeter: IdbUtilityMeter = this.selectedMeter();
    if (!selectedMeter || !selectedMeter.charges) {
      return 0;
    }
    let detailedChargesCount: number = 0;
    if (selectedMeter.charges) {
      selectedMeter.charges.forEach(charge => {
        if ((charge.chargeType == 'demand' || charge.chargeType == 'consumption') && charge.displayUsageInTable) {
          detailedChargesCount++;
        }
        if (charge.displayChargeInTable) {
          detailedChargesCount++;
        }
      });
    }
    return detailedChargesCount;
  });

  isRECs: Signal<boolean> = computed(() => {
    let selectedMeter: IdbUtilityMeter = this.selectedMeter();
    if (!selectedMeter) {
      return false;
    }
    return (selectedMeter.agreementType == 4 || selectedMeter.agreementType == 6);
  });

  numGeneralInformation: Signal<number> = computed(() => {
    const filters: GeneralInformationFilters = this.generalInformationFilters();
    const isRECs = this.isRECs();
    let numGeneralInformation: number = 0;
    if (isRECs) {
      if (filters.totalCost) {
        numGeneralInformation = 2;
      } else {
        numGeneralInformation = 1;
      }
    } else {
      Object.keys(filters).forEach(key => {
        if (key != 'showSection' && filters[key] == true) {
          numGeneralInformation++;
        }
      });
      numGeneralInformation += 2;
    }
    return numGeneralInformation;
  });

  numEmissions: Signal<number> = computed(() => {
    const filters: EmissionsFilters = this.emissionsFilters();
    const isRECs = this.isRECs();
    let emissionCount: number = 0;
    if (isRECs) {
      if (filters.recs) {
        emissionCount++;
      }
      if (filters.excessRECs) {
        emissionCount++;
      }
      if (filters.excessRECsEmissions) {
        emissionCount++;
      }
    } else {
      if (filters.marketEmissions) {
        emissionCount++;
      }
      if (filters.locationEmissions) {
        emissionCount++;
      }
      if (filters.recs) {
        emissionCount++;
      }
    }
    return emissionCount
  });

  showEstimated: Signal<boolean> = computed(() => {
    const meterData: Array<IdbUtilityMeterData> = this.selectedMeterData();
    if (!meterData) {
      return false;
    }
    return meterData.some(dataItem => { return dataItem.isEstimated == true });
  });

  orderedMeterData: Signal<Array<IdbUtilityMeterData>> = computed(() => {
    const meterData: Array<IdbUtilityMeterData> = this.selectedMeterData();
    if (!meterData) {
      return [];
    }
    const orderByField: OrderByFields = this.orderDataField();
    const orderByDirection: 'asc' | 'desc' = this.orderByDirection();
    const orderByCharge: 'amount' | 'usage' = this.orderByCharge();
    const orderByChargeId: string = this.orderByChargeId();
    let orderedMeterData: Array<IdbUtilityMeterData> = _.orderBy(meterData, (dataItem: IdbUtilityMeterData) => {
      if (orderByChargeId) {
        let chargeVal: MeterDataCharge = dataItem.charges?.find(charge => {
          return charge.chargeGuid === orderByChargeId;
        })
        if (chargeVal) {
          if (orderByCharge === 'amount') {
            return chargeVal.chargeAmount;
          } else {
            return chargeVal.chargeUsage;
          }
        }
      } else {
        if (orderByField === 'readDate') {
          return getDateFromMeterData(dataItem).getTime();
        } else {
          return dataItem[orderByField];
        }
      }
    }, orderByDirection);
    return orderedMeterData;
  });

  @ViewChild('meterTable', { static: false }) meterTable: ElementRef;
  orderDataField: WritableSignal<OrderByFields> = signal('readDate');
  orderByDirection: WritableSignal<'asc' | 'desc'> = signal('desc');
  orderByChargeId: WritableSignal<string> = signal(undefined);
  orderByCharge: WritableSignal<'amount' | 'usage'> = signal('usage');
  checkedItemGuids: WritableSignal<Set<string>> = signal(new Set<string>());

  allChecked: boolean;
  currentPageNumber: number = 1;
  copyingTable: boolean = false;
  readonly isElectron = this.electronService.isElectron;

  checkAll() {
    const orderedItems = this.orderedMeterData();
    const displayedItems = orderedItems.slice(((this.currentPageNumber - 1) * this.itemsPerPage()), (this.currentPageNumber * this.itemsPerPage()));
    this.checkedItemGuids.update(set => {
      const next = new Set(set);
      displayedItems.forEach(item => {
        this.allChecked ? next.add(item.guid) : next.delete(item.guid);
      });
      return next;
    });
    this.setChecked.emit(this.checkedItemGuids());
  }

  isChecked(guid: string): boolean {
    return this.checkedItemGuids().has(guid);
  }

  toggleChecked(guid: string) {
    this.checkedItemGuids.update(set => {
      const next = new Set(set);
      next.has(guid) ? next.delete(guid) : next.add(guid);
      return next;
    });
    const orderedData = this.orderedMeterData();
    const displayedItems = orderedData.slice(((this.currentPageNumber - 1) * this.itemsPerPage()), (this.currentPageNumber * this.itemsPerPage()));
    this.allChecked = displayedItems.every(item => this.checkedItemGuids().has(item.guid));
    this.setChecked.emit(this.checkedItemGuids());
  }

  setEditMeterData(meterData: IdbUtilityMeterData): void {
    this.setEdit.emit(meterData);
  }

  setDeleteMeterData(meterData: IdbUtilityMeterData): void {
    this.setDelete.emit(meterData);
  }

  setOrderDataField(str: OrderByFields, orderByChargeGuid?: string, orderByCharge?: 'amount' | 'usage') {
    if (!orderByChargeGuid) {
      this.orderByChargeId.set(undefined);
      if (str == this.orderDataField()) {
        this.orderByDirection.update(dir => dir === 'desc' ? 'asc' : 'desc');
      } else {
        this.orderDataField.set(str);
      }
    } else {
      if (orderByChargeGuid == this.orderByChargeId()) {
        if (orderByCharge == this.orderByCharge()) {
          this.orderByDirection.update(dir => dir === 'desc' ? 'asc' : 'desc');
        } else {
          this.orderByCharge.set(orderByCharge);
        }
      } else {
        this.orderByChargeId.set(orderByChargeGuid);
        this.orderByCharge.set(orderByCharge);
      }
    }
  }

  copyTable() {
    this.copyingTable = true;
    setTimeout(() => {
      this.copyTableService.copyTable(this.meterTable);
      this.copyingTable = false;
    }, 200)
  }
}
