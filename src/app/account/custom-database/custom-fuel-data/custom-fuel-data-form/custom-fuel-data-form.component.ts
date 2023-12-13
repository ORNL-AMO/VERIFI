import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ConvertValue } from 'src/app/calculations/conversions/convertValue';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { MeterPhase } from 'src/app/models/constantsAndTypes';
import { IdbAccount, IdbCustomFuel, IdbUtilityMeter } from 'src/app/models/idb';
import { FuelTypeOption } from 'src/app/shared/fuel-options/fuelTypeOption';
import { getAllMobileFuelTypes } from 'src/app/shared/fuel-options/getFuelTypeOptions';
import { StationaryGasOptions } from 'src/app/shared/fuel-options/stationaryGasOptions';
import { StationaryLiquidOptions } from 'src/app/shared/fuel-options/stationaryLiquidOptions';
import { StationaryOtherEnergyOptions } from 'src/app/shared/fuel-options/stationaryOtherEnergyOptions';
import { StationarySolidOptions } from 'src/app/shared/fuel-options/stationarySolidOptions';
import { convertHeatCapacity } from 'src/app/shared/sharedHelperFuntions';

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
      this.setUnits();
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

    StationaryLiquidOptions.forEach(option => {
      this.allFuelNames.push(option.value)
    });
    StationaryGasOptions.forEach(option => {
      this.allFuelNames.push(option.value);
    });
    StationarySolidOptions.forEach(option => {
      this.allFuelNames.push(option.value);
    });
    StationaryOtherEnergyOptions.forEach(option => {
      this.allFuelNames.push(option.value);
    });
    let allMobileFuels: Array<FuelTypeOption> = getAllMobileFuelTypes();
    allMobileFuels.forEach(mobileFuel => {
      this.allFuelNames.push(mobileFuel.value);
    })
  }

  async save() {
    this.editCustomFuel.value = this.form.controls.fuelName.value;
    this.editCustomFuel.phase = this.form.controls.phase.value;
    this.editCustomFuel.heatCapacityValue = this.form.controls.heatCapacityValue.value;
    this.editCustomFuel.siteToSourceMultiplier = this.form.controls.siteToSourceMultiplier.value;
    this.editCustomFuel.isBiofuel = this.form.controls.isBiofuel.value;
    this.editCustomFuel.isMobile = this.form.controls.isMobile.value;
    this.editCustomFuel.isOnRoad = this.form.controls.isOnRoad.value;

    this.editCustomFuel.CO2 = this.form.controls.CO2.value;
    this.editCustomFuel.CH4 = this.form.controls.CH4.value;
    this.editCustomFuel.N2O = this.form.controls.N2O.value;
    //Fuels saved in MMBtu
    if (this.selectedAccount.energyUnit != 'MMBtu') {
      let conversionHelper: number = new ConvertValue(1, 'MMBtu', this.selectedAccount.energyUnit).convertedValue;
      this.editCustomFuel.CO2 = this.editCustomFuel.CO2 / conversionHelper;
      this.editCustomFuel.CH4 = this.editCustomFuel.CH4 / conversionHelper;
      this.editCustomFuel.N2O = this.editCustomFuel.N2O / conversionHelper;
    }


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
    let chemicalValidators: Array<ValidatorFn> = [];
    if (editItem.directEmissionsRate == false) {
      chemicalValidators = [Validators.required]
    }

    this.form = this.formBuilder.group({
      'fuelName': [editItem.value, [Validators.required]],
      'phase': [editItem.phase, [Validators.required]],
      'heatCapacityValue': [editItem.heatCapacityValue, [Validators.required]],
      'siteToSourceMultiplier': [editItem.siteToSourceMultiplier, [Validators.required]],
      'isBiofuel': [editItem.isBiofuel, [Validators.required]],
      'CO2': [editItem.CO2, chemicalValidators],
      'CH4': [editItem.CH4, chemicalValidators],
      'N2O': [editItem.N2O, chemicalValidators],
      'emissionsOutputRate': [editItem.emissionsOutputRate, [Validators.required]],
      'directEmissionsRate': [editItem.directEmissionsRate],
      'isMobile': [editItem.isMobile],
      'isOnRoad': [editItem.isOnRoad]
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
    if (this.form.controls.isMobile.value == false) {
      let CO2: number = this.form.controls.CO2.value;
      let CH4: number = this.form.controls.CH4.value;
      let N2O: number = this.form.controls.N2O.value;
      if (this.selectedAccount.energyUnit != 'MMBtu') {
        let conversionHelper: number = new ConvertValue(1, 'MMBtu', this.selectedAccount.energyUnit).convertedValue;
        CO2 = CO2 / conversionHelper;
        CH4 = CH4 / conversionHelper;
        N2O = N2O / conversionHelper;
      }
      let outputRate: number = CO2 + (CH4 * (25 / 1000)) + (N2O * (298 / 1000));
      this.form.controls.emissionsOutputRate.patchValue(outputRate);
    }
  }

  showFuelModal() {
    this.displayFuelModal = true;
  }

  hideFuelModal(selectedOption: { phase: MeterPhase, option: FuelTypeOption }) {
    this.displayFuelModal = false;
    if (selectedOption) {
      this.form.controls.phase.patchValue(selectedOption.phase);
      let CO2: number = selectedOption.option.CO2;
      let CH4: number = selectedOption.option.CH4;
      let N2O: number = selectedOption.option.N2O;
      let heatCapacityValue: number = convertHeatCapacity(selectedOption.option, this.editCustomFuel.startingUnit, this.selectedAccount.energyUnit);
      if (this.selectedAccount.energyUnit != 'MMBtu') {
        let conversionHelper: number = new ConvertValue(1, 'MMBtu', this.selectedAccount.energyUnit).convertedValue;
        CO2 = CO2 / conversionHelper;
        CH4 = CH4 / conversionHelper;
        N2O = N2O / conversionHelper;
      }
      this.form.controls.CO2.patchValue(CO2);
      this.form.controls.CH4.patchValue(CH4);
      this.form.controls.N2O.patchValue(N2O);
      this.form.controls.heatCapacityValue.patchValue(heatCapacityValue);
      this.form.controls.siteToSourceMultiplier.patchValue(selectedOption.option.siteToSourceMultiplier);
      this.form.controls.isBiofuel.patchValue(selectedOption.option.isBiofuel || false);
      this.form.controls.directEmissionsRate.patchValue(false);
      this.form.controls.fuelName.patchValue(selectedOption.option.value + ' (Modified)');
      this.form.controls.emissionsOutputRate.patchValue(selectedOption.option.emissionsOutputRate);
      this.form.controls.isMobile.patchValue(selectedOption.option.isMobile);
      this.form.controls.isOnRoad.patchValue(selectedOption.option.isOnRoad || false);
    }
  }

  setIsFuelInUse() {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let fuelMeter: IdbUtilityMeter = accountMeters.find(meter => {
      if (meter.scope != 2) {
        return meter.fuel == this.editCustomFuel.value
      } else {
        return meter.vehicleFuel == this.editCustomFuel.value
      }
    });
    this.isFuelInUse = (fuelMeter != undefined);
  }

  setRate(val: boolean) {
    this.form.controls.directEmissionsRate.patchValue(val);
    if (val == true) {
      this.form.controls.emissionsOutputRate.enable();
      this.form.controls.CO2.setValidators([]);
      this.form.controls.CH4.setValidators([]);
      this.form.controls.N2O.setValidators([]);
      this.form.controls.CO2.patchValue(0);
      this.form.controls.CH4.patchValue(0);
      this.form.controls.N2O.patchValue(0);
    } else {
      this.form.controls.emissionsOutputRate.disable();
      this.form.controls.CO2.setValidators([Validators.required]);
      this.form.controls.CH4.setValidators([Validators.required]);
      this.form.controls.N2O.setValidators([Validators.required]);
      this.setOutputRate();
    }
    this.form.controls.CO2.updateValueAndValidity();
    this.form.controls.CH4.updateValueAndValidity();
    this.form.controls.N2O.updateValueAndValidity();
  }

  setUnits() {
    if (this.form.controls.phase.value == 'Gas') {
      this.editCustomFuel.startingUnit = this.selectedAccount.volumeGasUnit;
    } else if (this.form.controls.phase.value == 'Liquid') {
      this.editCustomFuel.startingUnit = this.selectedAccount.volumeLiquidUnit;
    } else if (this.form.controls.phase.value == 'Solid') {
      this.editCustomFuel.startingUnit = this.selectedAccount.massUnit;
    }
  }

  setIsMobile() {

  }
}
