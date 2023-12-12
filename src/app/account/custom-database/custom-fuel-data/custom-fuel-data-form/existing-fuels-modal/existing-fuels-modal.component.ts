import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { MeterPhase } from 'src/app/models/constantsAndTypes';
import { IdbAccount } from 'src/app/models/idb';
import { FuelTypeOption } from 'src/app/shared/fuel-options/fuelTypeOption';
import { MobileBusOptions } from 'src/app/shared/fuel-options/mobileBusOptions';
import { MobileHeavyDutyTruckOptions } from 'src/app/shared/fuel-options/mobileHeavyDutyVehicleOptions';
import { MobileLightDutyTruckOptions } from 'src/app/shared/fuel-options/mobileLightDutyTruckOptions';
import { MobileMotorcycleOptions } from 'src/app/shared/fuel-options/mobileMotorcycleOptions';
import { MobileOffRoadAgricultureOptions } from 'src/app/shared/fuel-options/mobileOffRoadAgricultureOptions';
import { MobileOffRoadConstructionOptions } from 'src/app/shared/fuel-options/mobileOffRoadConstructionOptions';
import { MobilePassangerCarOptions } from 'src/app/shared/fuel-options/mobilePassangerCarOptions';
import { MobileRailOptions } from 'src/app/shared/fuel-options/mobileRailOptions';
import { MobileTransportOnsiteOptions } from 'src/app/shared/fuel-options/mobileTransportOnsiteOptions';
import { MobileWaterTransportOptions } from 'src/app/shared/fuel-options/mobileWaterTransportOptions';
import { StationaryGasOptions } from 'src/app/shared/fuel-options/stationaryGasOptions';
import { StationaryLiquidOptions } from 'src/app/shared/fuel-options/stationaryLiquidOptions';
import { StationarySolidOptions } from 'src/app/shared/fuel-options/stationarySolidOptions';

@Component({
  selector: 'app-existing-fuels-modal',
  templateUrl: './existing-fuels-modal.component.html',
  styleUrls: ['./existing-fuels-modal.component.css']
})
export class ExistingFuelsModalComponent {
  @Input()
  isMobile: boolean;
  @Output('emitClose')
  emitClose: EventEmitter<{ phase: MeterPhase, option: FuelTypeOption }> = new EventEmitter();

  fuelType: string;
  selectedFuelTypeOptions: Array<FuelTypeOption>;
  displayModal: boolean = false;
  selectedAccount: IdbAccount;
  constructor(private accountDbService: AccountdbService) {

  }

  ngOnInit() {
    if (this.isMobile) {
      this.fuelType = 'mobileHeavyDutyTruck';
    } else {
      this.fuelType = 'stationaryGas';
    }
    this.setSelectedFuelTypeOptions();
    this.selectedAccount = this.accountDbService.selectedAccount.getValue();
    setTimeout(() => {
      this.displayModal = true;
    }, 100);
  }
  cancelSelectFuel() {
    this.emitClose.emit(undefined);
  }

  selectOption(option: FuelTypeOption) {
    let phase: MeterPhase;
    if (this.fuelType == 'stationaryGas') {
      phase = 'Gas';
    } else if (this.fuelType == 'stationaryLiquid') {
      phase = 'Liquid';
    } else if (this.fuelType == 'stationarySolid') {
      phase = 'Solid';
    } else {
      phase = 'Liquid';
    };
    this.emitClose.emit({ phase: phase, option: option });
  }

  changeFuelType() {
    this.setSelectedFuelTypeOptions();
  }

  setSelectedFuelTypeOptions() {
    if (this.fuelType == 'stationaryGas') {
      this.selectedFuelTypeOptions = StationaryGasOptions;
    } else if (this.fuelType == 'stationaryLiquid') {
      this.selectedFuelTypeOptions = StationaryLiquidOptions;
    } if (this.fuelType == 'stationarySolid') {
      this.selectedFuelTypeOptions = StationarySolidOptions;
    } if (this.fuelType == 'mobileHeavyDutyTruck') {
      this.selectedFuelTypeOptions = MobileHeavyDutyTruckOptions;
    } if (this.fuelType == 'mobileBus') {
      this.selectedFuelTypeOptions = MobileBusOptions;
    } if (this.fuelType == 'mobileLightDutyTruck') {
      this.selectedFuelTypeOptions = MobileLightDutyTruckOptions;
    } if (this.fuelType == 'mobileMotorcycle') {
      this.selectedFuelTypeOptions = MobileMotorcycleOptions;
    } if (this.fuelType == 'mobileOffRoadAgricultural') {
      this.selectedFuelTypeOptions = MobileOffRoadAgricultureOptions;
    } if (this.fuelType == 'mobileOffRoadConstruction') {
      this.selectedFuelTypeOptions = MobileOffRoadConstructionOptions;
    } if (this.fuelType == 'mobilePassangerCars') {
      this.selectedFuelTypeOptions = MobilePassangerCarOptions;
    } if (this.fuelType == 'mobileRail') {
      this.selectedFuelTypeOptions = MobileRailOptions;
    } if (this.fuelType == 'mobileTransportOnsite') {
      this.selectedFuelTypeOptions = MobileTransportOnsiteOptions;
    } if (this.fuelType == 'mobileWaterTransport') {
      this.selectedFuelTypeOptions = MobileWaterTransportOptions;
    }
  }
}
