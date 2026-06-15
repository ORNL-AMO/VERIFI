import { Component, computed, effect, ElementRef, inject, output, signal, Signal, ViewChild, WritableSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { VehicleDataFilters } from 'src/app/models/meterDataFilter';
import * as _ from 'lodash';
import { CopyTableService } from 'src/app/shared/helper-services/copy-table.service';
import { EmissionsResults } from 'src/app/models/eGridEmissions';
import { getEmissions } from 'src/app/calculations/emissions-calculations/emissions';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
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
  selector: 'app-vehicle-data-table',
  templateUrl: './vehicle-data-table.component.html',
  styleUrls: ['./vehicle-data-table.component.css'],
  standalone: false
})
export class VehicleDataTableComponent {
  private utilityMeterDataService = inject(UtilityMeterDataService);
  private copyTableService = inject(CopyTableService);
  private customFuelDbService = inject(CustomFuelDbService);
  private facilityDbService = inject(FacilitydbService);
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
  vehicleDataFilters: Signal<VehicleDataFilters> = toSignal(this.utilityMeterDataService.tableVehicleDataFilters);

  selectedMeterData: Signal<Array<IdbUtilityMeterData>> = computed(() => {
    const meterData = this.facilityMeterData();
    const selectedMeter = this.selectedMeter();
    const customFuels = this.customFuels();
    const facility = this.facility();
    const account = this.account();
    if (!meterData || !selectedMeter || !customFuels || !facility || !account) {
      return [];
    }
    const filteredData: Array<IdbUtilityMeterData> = meterData.filter(d => d.meterId === selectedMeter.guid);
    filteredData.forEach(dataItem => {
      const emissionsValues: EmissionsResults = getEmissions(
        selectedMeter, dataItem.totalEnergyUse, selectedMeter.energyUnit, dataItem.year, false,
        [facility], [], customFuels, dataItem.totalVolume,
        selectedMeter.vehicleCollectionUnit, selectedMeter.vehicleDistanceUnit,
        dataItem.vehicleFuelEfficiency, account.assessmentReportVersion, []
      );
      dataItem.mobileBiogenicEmissions = emissionsValues.mobileBiogenicEmissions;
      dataItem.mobileCarbonEmissions = emissionsValues.mobileCarbonEmissions;
      dataItem.mobileOtherEmissions = emissionsValues.mobileOtherEmissions;
      dataItem.mobileTotalEmissions = emissionsValues.mobileTotalEmissions;
    });
    return filteredData;
  });

  consumptionLabel: Signal<'Consumption' | 'Distance'> = computed(() => {
    return this.selectedMeter()?.scope === 2 ? 'Distance' : 'Consumption';
  });

  volumeUnit: Signal<string> = computed(() => {
    const meter = this.selectedMeter();
    if (!meter) return '';
    return meter.vehicleCollectionType === 1 ? meter.vehicleCollectionUnit : meter.vehicleDistanceUnit;
  });

  showEstimated: Signal<boolean> = computed(() => {
    return this.selectedMeterData().some(d => d.isEstimated === true);
  });

  showEmissionsSection: Signal<boolean> = computed(() => {
    const f = this.vehicleDataFilters();
    if (!f) return false;
    return !!(f.mobileOtherEmissions || f.mobileBiogenicEmissions || f.mobileCarbonEmissions || f.mobileTotalEmissions);
  });

  numGeneralInformation: Signal<number> = computed(() => {
    const f = this.vehicleDataFilters();
    if (!f) return 3;
    // base: readDate + totalVolume + totalEnergyUse (3); adjust for optional columns
    let count = 3;
    if (!f.totalEnergy) count--;
    if (f.totalCost) count++;
    if (f.fuelEfficiency && this.selectedMeter()?.scope === 2 &&  this.selectedMeter()?.vehicleCategory == 2) count++;
    return count;
  });

  numEmissions: Signal<number> = computed(() => {
    const f = this.vehicleDataFilters();
    if (!f) return 0;
    let count = 0;
    if (f.mobileBiogenicEmissions) count++;
    if (f.mobileCarbonEmissions) count++;
    if (f.mobileOtherEmissions) count++;
    if (f.mobileTotalEmissions) count++;
    return count;
  });

  numDetailedCharges: Signal<number> = computed(() => {
    const meter = this.selectedMeter();
    if (!meter?.charges) return 0;
    return meter.charges.filter(c => c.displayChargeInTable).length;
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
