import { Component, EventEmitter, Output } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { MeterPhase } from 'src/app/models/constantsAndTypes';
import { IdbAccount } from 'src/app/models/idb';
import { FuelTypeOption } from 'src/app/shared/fuel-options/fuelTypeOption';
import { StationaryGasOptions } from 'src/app/shared/fuel-options/stationaryGasOptions';
import { StationaryLiquidOptions } from 'src/app/shared/fuel-options/stationaryLiquidOptions';
import { StationarySolidOptions } from 'src/app/shared/fuel-options/stationarySolidOptions';

@Component({
  selector: 'app-existing-fuels-modal',
  templateUrl: './existing-fuels-modal.component.html',
  styleUrls: ['./existing-fuels-modal.component.css']
})
export class ExistingFuelsModalComponent {
  @Output('emitClose')
  emitClose: EventEmitter<{ phase: MeterPhase, option: FuelTypeOption }> = new EventEmitter();

  gasOptions: Array<FuelTypeOption> = StationaryGasOptions;
  liquidOptions: Array<FuelTypeOption> = StationaryLiquidOptions;
  solidOptions: Array<FuelTypeOption> = StationarySolidOptions;
  option: FuelTypeOption = StationarySolidOptions[0];
  displayModal: boolean = false;
  selectedAccount: IdbAccount;
  constructor(private accountDbService: AccountdbService) {

  }

  ngOnInit() {
    this.selectedAccount = this.accountDbService.selectedAccount.getValue();
    setTimeout(() => {
      this.displayModal = true;
    }, 100);
  }
  cancelSelectFuel() {
    this.emitClose.emit(undefined);
  }

  selectOption(option: FuelTypeOption, phase: MeterPhase) {
    this.emitClose.emit({ phase: phase, option: option });
  }
}
