import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { MeterPhase } from 'src/app/models/constantsAndTypes';
import { IdbAccount } from 'src/app/models/idbModels/account';
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
    styleUrls: ['./existing-fuels-modal.component.css'],
    standalone: false
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
      if (this.fuelType == 'mobileHeavyDutyTruck') {
        option.value = option.value + ' (Heavy Duty Truck)';
      } if (this.fuelType == 'mobileBus') {
        option.value = option.value + ' (Bus)';
      } if (this.fuelType == 'mobileLightDutyTruck') {
        option.value = option.value + ' (Light Duty Truck)';
      } if (this.fuelType == 'mobileMotorcycle') {
        option.value = option.value + ' (Motorcycle)';
      } if (this.fuelType == 'mobileOffRoadAgricultural') {
        option.value = option.value + ' (Off-road Agricultural)';
      } if (this.fuelType == 'mobileOffRoadConstruction') {
        option.value = option.value + ' (Off-road Construction)';
      } if (this.fuelType == 'mobilePassangerCars') {
        option.value = option.value + ' (Passanger Cars)';
      } if (this.fuelType == 'mobileRail') {
        option.value = option.value + ' (Rail)';
      } if (this.fuelType == 'mobileTransportOnsite') {
        option.value = option.value + ' (Transport Onsite)';
      } if (this.fuelType == 'mobileWaterTransport') {
        option.value = option.value + ' (Water Transport)';
      }
    };
    this.emitClose.emit({ phase: phase, option: option });
  }

  changeFuelType() {
    this.setSelectedFuelTypeOptions();
  }

  setSelectedFuelTypeOptions() {
    if (this.fuelType == 'stationaryGas') {
      this.selectedFuelTypeOptions = StationaryGasOptions;
      this.isMobile = false;
    } else if (this.fuelType == 'stationaryLiquid') {
      this.selectedFuelTypeOptions = StationaryLiquidOptions;
      this.isMobile = false;
    } if (this.fuelType == 'stationarySolid') {
      this.selectedFuelTypeOptions = StationarySolidOptions;
      this.isMobile = false;
    } if (this.fuelType == 'mobileHeavyDutyTruck') {
      this.selectedFuelTypeOptions = MobileHeavyDutyTruckOptions;
      this.isMobile = true;
    } if (this.fuelType == 'mobileBus') {
      this.selectedFuelTypeOptions = MobileBusOptions;
      this.isMobile = true;
    } if (this.fuelType == 'mobileLightDutyTruck') {
      this.selectedFuelTypeOptions = MobileLightDutyTruckOptions;
      this.isMobile = true;
    } if (this.fuelType == 'mobileMotorcycle') {
      this.selectedFuelTypeOptions = MobileMotorcycleOptions;
      this.isMobile = true;
    } if (this.fuelType == 'mobileOffRoadAgricultural') {
      this.selectedFuelTypeOptions = MobileOffRoadAgricultureOptions;
      this.isMobile = true;
    } if (this.fuelType == 'mobileOffRoadConstruction') {
      this.selectedFuelTypeOptions = MobileOffRoadConstructionOptions;
      this.isMobile = true;
    } if (this.fuelType == 'mobilePassangerCars') {
      this.selectedFuelTypeOptions = MobilePassangerCarOptions;
      this.isMobile = true;
    } if (this.fuelType == 'mobileRail') {
      this.selectedFuelTypeOptions = MobileRailOptions;
      this.isMobile = true;
    } if (this.fuelType == 'mobileTransportOnsite') {
      this.selectedFuelTypeOptions = MobileTransportOnsiteOptions;
      this.isMobile = true;
    } if (this.fuelType == 'mobileWaterTransport') {
      this.selectedFuelTypeOptions = MobileWaterTransportOptions;
      this.isMobile = true;
    }
  }
}
