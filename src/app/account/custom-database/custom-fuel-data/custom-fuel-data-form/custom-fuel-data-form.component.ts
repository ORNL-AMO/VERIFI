import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FuelTypeOption, GasOptions, LiquidOptions, OtherEnergyOptions, SolidOptions } from 'src/app/facility/utility-data/energy-consumption/energy-source/edit-meter-form/editMeterOptions';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { MeterPhase } from 'src/app/models/constantsAndTypes';
import { IdbAccount, IdbCustomFuel, IdbUtilityMeter } from 'src/app/models/idb';

@Component({
  selector: 'app-custom-fuel-data-form',
  templateUrl: './custom-fuel-data-form.component.html',
  styleUrls: ['./custom-fuel-data-form.component.css']
})
export class CustomFuelDataFormComponent {

  isAdd: boolean;
  editCustomFuel: IdbCustomFuel;
  isInvalid: boolean;
  invalidValue: string;
  previousValue: string;
  accountCustomFuels: Array<IdbCustomFuel>;
  allFuelNames: Array<string>;
  selectedAccount: IdbAccount;
  form: FormGroup;
  displayFuelModal: boolean = false;
  isFuelInUse: boolean = false;
  constructor(private router: Router, private customFuelDbService: CustomFuelDbService,
    private activatedRoute: ActivatedRoute,
    private accountDbService: AccountdbService,
    private formBuilder: FormBuilder,
    private utilityMeterDbService: UtilityMeterdbService) {

  }

  ngOnInit() {
    this.accountCustomFuels = this.customFuelDbService.accountCustomFuels.getValue();
    this.setAllFuelNames();
    this.isAdd = this.router.url.includes('add');
    this.selectedAccount = this.accountDbService.selectedAccount.getValue();
    if (this.isAdd) {
      this.editCustomFuel = this.customFuelDbService.getNewAccountCustomFuel(this.selectedAccount);
      this.setForm(this.editCustomFuel);
    } else {
      this.activatedRoute.params.subscribe(params => {
        let elementId: string = params['id'];
        let selectedItem: IdbCustomFuel = this.accountCustomFuels.find(item => { return item.guid == elementId });
        this.editCustomFuel = JSON.parse(JSON.stringify(selectedItem));
        this.setIsFuelInUse();
        this.setForm(this.editCustomFuel);
        this.previousValue = selectedItem.value;
        this.checkInvalid();
      });
    }
  }

  checkInvalid() {
    this.setValueInvalid();
    this.isInvalid = (this.invalidValue != undefined);
  }

  setValueInvalid() {
    let invalidValue: string = undefined;
    let currentValue: string = this.form.controls.fuelName.value;
    if (!currentValue) {
      invalidValue = 'Fuel name required.';
    } else {
      let checkExists: string = this.allFuelNames.find(fuelName => { return fuelName == currentValue });
      if (checkExists) {
        if (this.isAdd || (this.previousValue != checkExists)) {
          invalidValue = 'Unique name required for fuel. Current name already exists.';
        }
      }
    }
    this.invalidValue = invalidValue;
  }

  setAllFuelNames() {
    this.allFuelNames = this.accountCustomFuels.flatMap(fuel => {
      return fuel.value;
    });

    LiquidOptions.forEach(option => {
      this.allFuelNames.push(option.value)
    });
    GasOptions.forEach(option => {
      this.allFuelNames.push(option.value);
    });
    SolidOptions.forEach(option => {
      this.allFuelNames.push(option.value);
    });
    OtherEnergyOptions.forEach(option => {
      this.allFuelNames.push(option.value);
    });
  }

  async save() {
    this.editCustomFuel.value = this.form.controls.fuelName.value;
    this.editCustomFuel.phase = this.form.controls.phase.value;
    this.editCustomFuel.heatCapacityValue = this.form.controls.heatCapacityValue.value;
    this.editCustomFuel.siteToSourceMultiplier = this.form.controls.siteToSourceMultiplier.value;
    this.editCustomFuel.isBiofuel = this.form.controls.isBiofuel.value;
    this.editCustomFuel.CO2 = this.form.controls.CO2.value;
    this.editCustomFuel.CH4 = this.form.controls.CH4.value;
    this.editCustomFuel.N2O = this.form.controls.N2O.value;
    this.editCustomFuel.emissionsOutputRate = this.form.controls.emissionsOutputRate.value;
    this.editCustomFuel.directEmissionsRate = this.form.controls.directEmissionsRate.value;

    if (this.isAdd) {
      await firstValueFrom(this.customFuelDbService.addWithObservable(this.editCustomFuel));
    } else {
      if (this.isFuelInUse && this.editCustomFuel.value != this.previousValue) {
        //update meters
        let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
        let needsUpdate: boolean = false;
        for (let i = 0; i < accountMeters.length; i++) {
          if (accountMeters[i].fuel == this.previousValue) {
            needsUpdate = true;
            accountMeters[i].fuel = this.editCustomFuel.value;
            await firstValueFrom(this.utilityMeterDbService.updateWithObservable(accountMeters[i]));
          }
        }
        let allMeters: Array<IdbUtilityMeter> = await firstValueFrom(this.utilityMeterDbService.getAll());
        let accountMetersUpdates: Array<IdbUtilityMeter> = allMeters.filter(meter => {
          return meter.accountId == this.selectedAccount.guid;
        });
        this.utilityMeterDbService.accountMeters.next(accountMetersUpdates);
      }
      await firstValueFrom(this.customFuelDbService.updateWithObservable(this.editCustomFuel));
    }
    let allCustomFuels: Array<IdbCustomFuel> = await firstValueFrom(this.customFuelDbService.getAll());
    let accountCustomFuels: Array<IdbCustomFuel> = allCustomFuels.filter(fuel => { return fuel.accountId == this.selectedAccount.guid });
    this.customFuelDbService.accountCustomFuels.next(accountCustomFuels);
    this.navigateHome();
  }

  navigateHome() {
    this.router.navigateByUrl('/account/custom-data/fuels');
  }

  setForm(editItem: IdbCustomFuel) {
    this.form = this.formBuilder.group({
      'fuelName': [editItem.value, [Validators.required]],
      'phase': [editItem.phase, [Validators.required]],
      'heatCapacityValue': [editItem.heatCapacityValue, [Validators.required]],
      'siteToSourceMultiplier': [editItem.siteToSourceMultiplier, [Validators.required]],
      'isBiofuel': [editItem.isBiofuel, [Validators.required]],
      'CO2': [editItem.CO2, [Validators.required]],
      'CH4': [editItem.CH4, [Validators.required]],
      'N2O': [editItem.N2O, [Validators.required]],
      'emissionsOutputRate': [editItem.emissionsOutputRate, [Validators.required]],
      'directEmissionsRate': [editItem.directEmissionsRate]
    });
    this.setDisableOutputRate();
  }

  setDisableOutputRate() {
    if (this.form.controls.directEmissionsRate.value == false) {
      this.form.controls.emissionsOutputRate.disable();
    } else {
      this.form.controls.emissionsOutputRate.enable();
    }
  }

  setOutputRate() {
    let CO2: number = this.form.controls.CO2.value;
    let CH4: number = this.form.controls.CH4.value;
    let N2O: number = this.form.controls.N2O.value;
    let outputRate: number = CO2 + (CH4 * (25 / 1000)) + (N2O * (298 / 1000));
    this.form.controls.emissionsOutputRate.patchValue(outputRate);
  }

  showFuelModal() {
    this.displayFuelModal = true;
  }

  hideFuelModal(selectedOption: { phase: MeterPhase, option: FuelTypeOption }) {
    this.displayFuelModal = false;
    if (selectedOption) {
      this.form.controls.phase.patchValue(selectedOption.phase);
      this.form.controls.CO2.patchValue(selectedOption.option.CO2);
      this.form.controls.CH4.patchValue(selectedOption.option.CH4);
      this.form.controls.N2O.patchValue(selectedOption.option.N2O);
      this.form.controls.heatCapacityValue.patchValue(selectedOption.option.heatCapacityValue);
      this.form.controls.siteToSourceMultiplier.patchValue(selectedOption.option.siteToSourceMultiplier);
      this.form.controls.isBiofuel.patchValue(selectedOption.option.isBiofuel || false);
      this.form.controls.directEmissionsRate.patchValue(false);
      this.form.controls.fuelName.patchValue(selectedOption.option.value + ' (Modified)');
      this.form.controls.emissionsOutputRate.patchValue(selectedOption.option.emissionsOutputRate);
    }
  }

  setIsFuelInUse() {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let fuelMeter: IdbUtilityMeter = accountMeters.find(meter => { return meter.fuel == this.editCustomFuel.value });
    this.isFuelInUse = (fuelMeter != undefined);
  }

}
