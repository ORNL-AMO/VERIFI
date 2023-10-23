import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FuelTypeOption, GasOptions, LiquidOptions, OtherEnergyOptions, SolidOptions } from 'src/app/facility/utility-data/energy-consumption/energy-source/edit-meter-form/editMeterOptions';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import { MeterPhase } from 'src/app/models/constantsAndTypes';
import { IdbAccount, IdbCustomFuel } from 'src/app/models/idb';

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
  constructor(private router: Router, private customFuelDbService: CustomFuelDbService,
    private activatedRoute: ActivatedRoute,
    private accountDbService: AccountdbService,
    private formBuilder: FormBuilder) {

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

  save() {

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

}
