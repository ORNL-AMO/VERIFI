import { Component, computed, effect, ElementRef, inject, output, signal, Signal, ViewChild, WritableSignal } from '@angular/core';
import * as _ from 'lodash';
import { toSignal } from '@angular/core/rxjs-interop';
import { CopyTableService } from 'src/app/shared/helper-services/copy-table.service';
import { GeneralUtilityDataFilters } from 'src/app/models/meterDataFilter';
import { checkShowEmissionsOutputRate, checkShowHeatCapacity, getIsEnergyMeter, getIsEnergyUnit } from 'src/app/shared/sharedHelperFunctions';
import { EmissionsResults } from 'src/app/models/eGridEmissions';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { getEmissions, setUtilityDataEmissionsValues } from 'src/app/calculations/emissions-calculations/emissions';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData, MeterDataCharge } from 'src/app/models/idbModels/utilityMeterData';
import { IdbCustomFuel } from 'src/app/models/idbModels/customFuel';
import { UtilityMeterDataService } from 'src/app/shared/shared-meter-content/utility-meter-data.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { ElectronService } from 'src/app/electron/electron.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { getDateFromMeterData } from 'src/app/shared/dateHelperFunctions';

@Component({
  selector: 'app-general-utility-data-table',
  templateUrl: './general-utility-data-table.component.html',
  styleUrls: ['./general-utility-data-table.component.css'],
  standalone: false
})
export class GeneralUtilityDataTableComponent {
  private utilityMeterDataService = inject(UtilityMeterDataService);
  private copyTableService = inject(CopyTableService);
  private eGridService = inject(EGridService);
  private facilityDbService = inject(FacilitydbService);
  private customFuelDbService = inject(CustomFuelDbService);
  private accountDbService = inject(AccountdbService);
  private electronService = inject(ElectronService);
  private utilityMeterDbService = inject(UtilityMeterdbService);
  private sharedDataService = inject(SharedDataService);
  private utilityMeterDataDbService = inject(UtilityMeterDatadbService);

  readonly setChecked = output<Set<string>>();
  readonly setEdit = output<IdbUtilityMeterData>();
  readonly setDelete = output<IdbUtilityMeterData>();

  itemsPerPage: Signal<number> = toSignal(this.sharedDataService.itemsPerPage);
  selectedMeter: Signal<IdbUtilityMeter> = toSignal(this.utilityMeterDbService.selectedMeter);
  facilityMeterData: Signal<Array<IdbUtilityMeterData>> = toSignal(this.utilityMeterDataDbService.facilityMeterData);
  customFuels: Signal<Array<IdbCustomFuel>> = toSignal(this.customFuelDbService.accountCustomFuels);
  facility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility);
  account: Signal<IdbAccount> = toSignal(this.accountDbService.selectedAccount);
  generalUtilityDataFilters: Signal<GeneralUtilityDataFilters> = toSignal(this.utilityMeterDataService.tableGeneralUtilityFilters);

  selectedMeterData: Signal<Array<IdbUtilityMeterData>> = computed(() => {
    const meterData = this.facilityMeterData();
    const selectedMeter = this.selectedMeter();
    const customFuels = this.customFuels();
    const facility = this.facility();
    const account = this.account();
    if (!meterData || !selectedMeter || !customFuels || !facility || !account) {
      return [];
    }
    let filteredData: Array<IdbUtilityMeterData> = meterData.filter(d => d.meterId === selectedMeter.guid);
    if (filteredData.length > 0 && checkShowEmissionsOutputRate(selectedMeter)) {
      filteredData.forEach(dataItem => {
        const emissionsValues: EmissionsResults = getEmissions(
          selectedMeter, dataItem.totalEnergyUse, selectedMeter.energyUnit, dataItem.year, false,
          [facility], this.eGridService.co2Emissions, customFuels,
          dataItem.totalVolume, undefined, undefined, dataItem.heatCapacity,
          account.assessmentReportVersion, []
        );
        dataItem = setUtilityDataEmissionsValues(dataItem, emissionsValues);
      });
    }
    return filteredData;
  });

  showEmissions: Signal<boolean> = computed(() => {
    const meter = this.selectedMeter();
    return meter ? checkShowEmissionsOutputRate(meter) : false;
  });

  showVolumeColumn: Signal<boolean> = computed(() => {
    return this.selectedMeterData().some(d => d.totalVolume !== undefined && d.totalVolume !== 0);
  });

  showEnergyColumn: Signal<boolean> = computed(() => {
    const meter = this.selectedMeter();
    if (!meter) return false;
    return meter.source === 'Other'
      ? getIsEnergyUnit(meter.startingUnit) === true
      : getIsEnergyMeter(meter.source);
  });

  showHeatCapacity: Signal<boolean> = computed(() => {
    const meter = this.selectedMeter();
    if (!meter) return false;
    return checkShowHeatCapacity(meter.source, meter.startingUnit, meter.scope);
  });

  showEstimated: Signal<boolean> = computed(() => {
    return this.selectedMeterData().some(d => d.isEstimated === true);
  });

  showEmissionsSection: Signal<boolean> = computed(() => {
    const filters = this.generalUtilityDataFilters();
    const meter = this.selectedMeter();
    if (!filters || !meter || !this.showEmissions()) return false;
    if (meter.source === 'Other Fuels' || meter.source === 'Natural Gas') {
      return !!(filters.stationaryBiogenicEmmissions || filters.stationaryCarbonEmissions ||
        filters.stationaryOtherEmissions || filters.totalEmissions);
    }
    return !!filters.totalEmissions;
  });

  numGeneralInformation: Signal<number> = computed(() => {
    const filters = this.generalUtilityDataFilters();
    if (!filters) return 2;
    let count = 2;
    if (filters.totalVolume && this.showVolumeColumn()) count++;
    if (!this.showEnergyColumn()) count--;
    if (filters.totalCost) count++;
    if (filters.heatCapacity && this.showHeatCapacity()) count++;
    return count;
  });

  numEmissions: Signal<number> = computed(() => {
    const filters = this.generalUtilityDataFilters();
    const meter = this.selectedMeter();
    if (!filters || !meter || !this.showEmissions()) return 0;
    let count = 0;
    if (meter.source === 'Other Fuels' || meter.source === 'Natural Gas') {
      if (filters.stationaryBiogenicEmmissions) count++;
      if (filters.stationaryCarbonEmissions) count++;
      if (filters.stationaryOtherEmissions) count++;
      if (filters.totalEmissions) count++;
    } else {
      if (filters.totalEmissions) count++;
    }
    return count;
  });

  numDetailedCharges: Signal<number> = computed(() => {
    const meter = this.selectedMeter();
    if (!meter?.charges) return 0;
    let count = 0;
    meter.charges.forEach(charge => {
      if (charge.chargeType === 'sewer' && charge.displayUsageInTable) count++;
      if (charge.displayChargeInTable) count++;
    });
    return count;
  });

  orderedMeterData: Signal<Array<IdbUtilityMeterData>> = computed(() => {
    const meterData = this.selectedMeterData();
    if (!meterData) return [];
    const orderByField = this.orderDataField();
    const orderByDirection = this.orderByDirection();
    const orderByCharge = this.orderByCharge();
    const ordered = _.orderBy(meterData, (dataItem: IdbUtilityMeterData) => {
      if (orderByField === 'readDate') {
        return getDateFromMeterData(dataItem).getTime();
      }
      const chargeVal: MeterDataCharge = dataItem.charges?.find(c => c.chargeGuid === orderByField);
      if (chargeVal) {
        return orderByCharge === 'amount' ? chargeVal.chargeAmount : chargeVal.chargeUsage;
      }
      return dataItem[orderByField];
    }, orderByDirection);
    return this.utilityMeterDataService.optionSelected() === 'estimated'
      ? ordered.filter(d => d.isEstimated)
      : ordered;
  });

  @ViewChild('meterTable', { static: false }) meterTable: ElementRef;
  orderDataField: WritableSignal<string> = signal('readDate');
  orderByDirection: WritableSignal<'asc' | 'desc'> = signal('desc');
  orderByCharge: WritableSignal<'amount' | 'usage'> = signal('usage');
  checkedItemGuids: WritableSignal<Set<string>> = signal(new Set<string>());

  allChecked: boolean;
  currentPageNumber: number = 1;
  copyingTable: boolean = false;
  readonly isElectron = this.electronService.isElectron;

  private readonly selectedMeterGuid = computed(() => this.selectedMeter()?.guid);
  private readonly _resetOnMeterChange = effect(() => {
    this.selectedMeterGuid();
    this.checkedItemGuids.set(new Set<string>());
    this.allChecked = false;
    this.currentPageNumber = 1;
  });

  checkAll() {
    const displayedItems = this.orderedMeterData().slice(
      (this.currentPageNumber - 1) * this.itemsPerPage(),
      this.currentPageNumber * this.itemsPerPage()
    );
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
    const displayedItems = this.orderedMeterData().slice(
      (this.currentPageNumber - 1) * this.itemsPerPage(),
      this.currentPageNumber * this.itemsPerPage()
    );
    this.allChecked = displayedItems.every(item => this.checkedItemGuids().has(item.guid));
    this.setChecked.emit(this.checkedItemGuids());
  }

  setEditMeterData(meterData: IdbUtilityMeterData): void {
    this.setEdit.emit(meterData);
  }

  setDeleteMeterData(meterData: IdbUtilityMeterData): void {
    this.setDelete.emit(meterData);
  }

  setOrderDataField(str: string, orderByCharge?: 'amount' | 'usage') {
    this.orderByCharge.set(orderByCharge ?? 'usage');
    if (str === this.orderDataField()) {
      this.orderByDirection.update(dir => dir === 'desc' ? 'asc' : 'desc');
    } else {
      this.orderDataField.set(str);
    }
  }

  copyTable() {
    this.copyingTable = true;
    setTimeout(() => {
      this.copyTableService.copyTable(this.meterTable);
      this.copyingTable = false;
    }, 200);
  }
}
