import { Component, EventEmitter, Output } from '@angular/core';
import { FuelTypeOption, GasOptions, LiquidOptions, SolidOptions } from 'src/app/facility/utility-data/energy-consumption/energy-source/edit-meter-form/editMeterOptions';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { MeterPhase } from 'src/app/models/constantsAndTypes';
import { IdbAccount } from 'src/app/models/idb';

@Component({
  selector: 'app-existing-fuels-modal',
  templateUrl: './existing-fuels-modal.component.html',
  styleUrls: ['./existing-fuels-modal.component.css']
})
export class ExistingFuelsModalComponent {
  @Output('emitClose')
  emitClose: EventEmitter<{ phase: MeterPhase, option: FuelTypeOption }> = new EventEmitter();

  gasOptions: Array<FuelTypeOption> = GasOptions;
  liquidOptions: Array<FuelTypeOption> = LiquidOptions;
  solidOptions: Array<FuelTypeOption> = SolidOptions;

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
