import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { FormGroup, ValidatorFn } from '@angular/forms';
import { IdbCustomFuel, IdbFacility } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { getHeatingCapacity, getIsEnergyMeter, getSiteToSource } from 'src/app/shared/sharedHelperFuntions';
import { EnergyUnitOptions, UnitOption } from 'src/app/shared/unitOptions';
import { EditMeterFormService } from './edit-meter-form.service';
import { FuelTypeOption, OtherEnergyOptions, ScopeOption, ScopeOptions, SourceOptions, getFuelTypeOptions } from './editMeterOptions';
import { MeterSource, WaterDischargeType, WaterDischargeTypes, WaterIntakeType, WaterIntakeTypes } from 'src/app/models/constantsAndTypes';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';

@Component({
  selector: 'app-edit-meter-form',
  templateUrl: './edit-meter-form.component.html',
  styleUrls: ['./edit-meter-form.component.css']
})
export class EditMeterFormComponent implements OnInit {
  @Input()
  meterForm: FormGroup;
  @Input()
  meterDataExists: boolean;
  @Input()
  facility: IdbFacility;


  scopeOptions: Array<ScopeOption> = ScopeOptions;
  hasDifferentCollectionUnits: boolean;
  hasDifferentEmissions: boolean;
  hasDifferentEnergyUnits: boolean;
  displayPhase: boolean;
  displayFuel: boolean;
  displayScope: boolean;
  fuelTypeOptions: Array<FuelTypeOption>;
  selectedFuelTypeOption: FuelTypeOption;
  startingUnitOptions: Array<UnitOption>;
  energySourceLabel: string = 'Fuel Type';
  displayHeatCapacity: boolean;
  displaySiteToSource: boolean;
  displayEmissionsOutputRate: boolean;
  sourceOptions: Array<string> = SourceOptions;
  changingUnits: boolean = false;
  energyUnitOptions: Array<UnitOption> = EnergyUnitOptions;
  displayEnergyUnits: boolean = true;
  isEnergyMeter: boolean;
  collectionUnitIsEnergy: boolean;


  displayRetainRecs: boolean;
  displayIncludeEnergy: boolean;
  waterIntakeTypes: Array<WaterIntakeType> = WaterIntakeTypes;
  waterDischargeTypes: Array<WaterDischargeType> = WaterDischargeTypes;
  displayWaterIntakeTypes: boolean;
  displayWaterDischargeTypes: boolean;
  constructor(
    private energyUnitsHelperService: EnergyUnitsHelperService,
    private editMeterFormService: EditMeterFormService, private cd: ChangeDetectorRef,
    private customFuelDbService: CustomFuelDbService) { }

  ngOnInit(): void {
    // this.testFuelTypeOptions();
  }

  ngOnChanges() {
    this.checkHasDifferentUnits();
    this.setFuelTypeOptions(true);
    this.checkDisplayFuel();
    this.checkDisplayPhase();
    this.checkDisplaySource();
    this.checkDisplayWaterTypes();
    this.setScopeOptions();
    this.setStartingUnitOptions();
    this.setUnitBooleans();
    this.checkShowHeatCapacity();
    this.checkShowSiteToSource();
    this.setDisplayEmissionsValues();
  }

  changeSource() {
    if (this.meterForm.controls.source.value == 'Electricity') {
      this.meterForm.controls.energyUnit.patchValue('kWh');
    } else {
      this.meterForm.controls.energyUnit.patchValue(this.facility.energyUnit);
    }
    this.setFuelTypeOptions(false);
    this.checkDisplayFuel();
    this.checkDisplayPhase();
    this.checkDisplaySource();
    this.checkDisplayWaterTypes();
    this.setScopeOptions();
    this.setStartingUnitOptions();
    this.setStartingUnit();
    this.updatePhaseAndFuelValidation();
    this.updateHeatCapacityValidation();
    this.updateWaterValidation();
    this.checkShowHeatCapacity();
    this.checkShowSiteToSource();
    this.setUnitBooleans();
    this.setHeatCapacity();
    this.setSiteToSource();
    this.setDefaultScope();
    this.setDisplayEmissionsValues();
    this.cd.detectChanges();
  }

  changeFuel() {
    this.setSelectedFuelTypeOption();
    if (this.meterForm.controls.source.value == 'Other Energy') {
      this.setStartingUnitOptions();
      this.setStartingUnit();
    }
    this.updateHeatCapacityValidation();
    this.checkShowHeatCapacity();
    this.checkShowSiteToSource();
    this.setHeatCapacity();
    this.setSiteToSource();
    this.cd.detectChanges();
  }

  changePhase() {
    this.setStartingUnitOptions();
    this.setStartingUnit();
    this.setFuelTypeOptions(false);
    this.checkShowHeatCapacity();
    this.checkShowSiteToSource();
    this.setHeatCapacity();
    this.setSiteToSource();
    this.cd.detectChanges();
  }

  changeCollectionUnit() {
    this.setUnitBooleans();
    this.updateHeatCapacityValidation();
    this.checkShowHeatCapacity();
    this.checkShowSiteToSource();
    this.setHeatCapacity();
    this.setSiteToSource();
    this.checkHasDifferentUnits();
    this.cd.detectChanges();
  }

  changeEnergyUnit() {
    this.setHeatCapacity();
    this.checkHasDifferentUnits();
    this.cd.detectChanges();
  }

  setEnergySourceLabel() {
    if (this.meterForm.controls.source.value == 'Other Fuels') {
      this.energySourceLabel = 'Fuel Type';
    } else if (this.meterForm.controls.source.value == 'Other Energy') {
      this.energySourceLabel = 'Energy Type'
    }
  }

  checkDisplayPhase() {
    if (this.meterForm.controls.source.value == 'Other Fuels') {
      this.displayPhase = true;
    } else {
      this.displayPhase = false;
    }
  }

  checkDisplayFuel() {
    if (this.meterForm.controls.source.value == 'Other Fuels' || this.meterForm.controls.source.value == 'Other Energy') {
      this.displayFuel = true;
    } else {
      this.displayFuel = false;
    }
  }

  checkDisplayWaterTypes() {
    if (this.meterForm.controls.source.value == 'Water Intake') {
      this.displayWaterDischargeTypes = false;
      this.displayWaterIntakeTypes = true;
    } else if (this.meterForm.controls.source.value == 'Water Discharge') {
      this.displayWaterDischargeTypes = true;
      this.displayWaterIntakeTypes = false;
    } else {
      this.displayWaterDischargeTypes = false;
      this.displayWaterIntakeTypes = false;
    }
  }

  updatePhaseAndFuelValidation() {
    let fuelValidators: Array<ValidatorFn> = this.editMeterFormService.getFuelValidation(this.meterForm.controls.source.value);
    this.meterForm.controls.fuel.setValidators(fuelValidators);
    this.meterForm.controls.fuel.updateValueAndValidity();

    let phaseValidators: Array<ValidatorFn> = this.editMeterFormService.getPhaseValidation(this.meterForm.controls.source.value);
    this.meterForm.controls.phase.setValidators(phaseValidators);
    this.meterForm.controls.phase.updateValueAndValidity();
  }

  updateHeatCapacityValidation() {
    let heatCapacityValidators: Array<ValidatorFn> = this.editMeterFormService.getHeatCapacitValidation(this.meterForm.controls.source.value, this.meterForm.controls.startingUnit.value);
    this.meterForm.controls.heatCapacity.setValidators(heatCapacityValidators);
    this.meterForm.controls.heatCapacity.updateValueAndValidity();
    let siteToSourceValidation: Array<ValidatorFn> = this.editMeterFormService.getSiteToSourceValidation(this.meterForm.controls.source.value, this.meterForm.controls.startingUnit.value, this.meterForm.controls.includeInEnergy.value);
    this.meterForm.controls.siteToSource.setValidators(siteToSourceValidation);
    this.meterForm.controls.siteToSource.updateValueAndValidity();
  }

  updateWaterValidation() {
    let waterIntakeValidation: Array<ValidatorFn> = this.editMeterFormService.getWaterIntakeValidation(this.meterForm.controls.source.value);
    this.meterForm.controls.waterIntakeType.setValidators(waterIntakeValidation);
    this.meterForm.controls.waterIntakeType.updateValueAndValidity();
    let waterDischargeValidation: Array<ValidatorFn> = this.editMeterFormService.getWaterDischargeValidation(this.meterForm.controls.source.value);
    this.meterForm.controls.waterDischargeType.setValidators(waterDischargeValidation);
    this.meterForm.controls.waterDischargeType.updateValueAndValidity();
  }

  setFuelTypeOptions(onChange: boolean) {
    let customFuels: Array<IdbCustomFuel> = this.customFuelDbService.accountCustomFuels.getValue();
    this.fuelTypeOptions = getFuelTypeOptions(this.meterForm.controls.source.value, this.meterForm.controls.phase.value, customFuels);
    let selectedEnergyOption: FuelTypeOption = this.fuelTypeOptions.find(option => { return option.value == this.meterForm.controls.fuel.value });
    if (!selectedEnergyOption && this.fuelTypeOptions.length != 0 && !onChange) {
      this.meterForm.controls.fuel.patchValue(this.fuelTypeOptions[0].value);
    }
    this.setSelectedFuelTypeOption();
  }

  setSelectedFuelTypeOption() {
    this.selectedFuelTypeOption = this.fuelTypeOptions.find(option => { return option.value == this.meterForm.controls.fuel.value });
  }

  // testFuelTypeOptions() {
  //   GasOptions.forEach(option => {
  //     this.checkFuelOutputRate(option, 'Gas');
  //   });
  //   LiquidOptions.forEach(option => {
  //     this.checkFuelOutputRate(option, 'Liquid');
  //   });
  //   SolidOptions.forEach(option => {
  //     this.checkFuelOutputRate(option, 'Solid');
  //   });
  // }

  // checkFuelOutputRate(fuel: FuelTypeOption, phase: MeterPhase) {
  //   let test: number = fuel.CO2 + (fuel.CH4 * (25 / 1000)) + (fuel.N2O * (298 / 1000));
  //   if (Math.abs(test - fuel.emissionsOutputRate) > .01) {
  //     console.log(fuel.value + ': ' + phase)
  //     console.log(test);
  //     console.log(fuel.emissionsOutputRate);
  //     console.log('======');
  //   }
  // }


  setHeatCapacity() {
    if (this.displayHeatCapacity) {
      let selectedEnergyOption: FuelTypeOption = this.fuelTypeOptions.find(option => { return option.value == this.meterForm.controls.fuel.value });
      let heatCapacity: number = getHeatingCapacity(this.meterForm.controls.source.value, this.meterForm.controls.startingUnit.value, this.meterForm.controls.energyUnit.value, selectedEnergyOption)
      this.meterForm.controls.heatCapacity.patchValue(heatCapacity);
    }
  }

  setSiteToSource() {
    if (this.displaySiteToSource) {
      let selectedFuelTypeOption: FuelTypeOption = this.fuelTypeOptions.find(option => { return option.value == this.meterForm.controls.fuel.value });
      let siteToSource: number = getSiteToSource(this.meterForm.controls.source.value, selectedFuelTypeOption, this.meterForm.controls.agreementType.value);
      this.meterForm.controls.siteToSource.patchValue(siteToSource);
    } else {
      this.meterForm.controls.siteToSource.patchValue(1);
    }
  }

  checkShowHeatCapacity() {
    this.displayHeatCapacity = this.editMeterFormService.checkShowHeatCapacity(this.meterForm.controls.source.value, this.meterForm.controls.startingUnit.value);
  }

  checkShowSiteToSource() {
    this.displaySiteToSource = this.editMeterFormService.checkShowSiteToSource(this.meterForm.controls.source.value, this.meterForm.controls.startingUnit.value, this.meterForm.controls.includeInEnergy.value);
  }

  setStartingUnitOptions() {
    if (!this.meterDataExists) {
      this.startingUnitOptions = this.energyUnitsHelperService.getStartingUnitOptions(this.meterForm.controls.source.value, this.meterForm.controls.phase.value, this.meterForm.controls.fuel.value);
    } else {
      this.startingUnitOptions = this.energyUnitsHelperService.getStartingUnitOptionsExistingData(this.meterForm.controls.source.value, this.meterForm.controls.phase.value, this.meterForm.controls.fuel.value, this.meterForm.controls.startingUnit.value);
    }
    this.cd.detectChanges();
  }

  setStartingUnit() {
    let facilityUnit: string;
    let selectedMeterSource: MeterSource = this.meterForm.controls.source.value;
    if (selectedMeterSource == 'Electricity') {
      facilityUnit = this.facility.electricityUnit;
    } else if (selectedMeterSource == 'Natural Gas') {
      facilityUnit = this.facility.volumeGasUnit;
    } else if (selectedMeterSource == 'Other Fuels') {
      if (this.meterForm.controls.phase.value == 'Gas') {
        facilityUnit = this.facility.volumeGasUnit;
      } else if (this.meterForm.controls.phase.value == 'Liquid') {
        facilityUnit = this.facility.volumeLiquidUnit;
      } else if (this.meterForm.controls.phase.value == 'Solid') {
        facilityUnit = this.facility.massUnit;
      }
    } else if (selectedMeterSource == 'Other Energy') {
      let selectedEnergyOption: FuelTypeOption = OtherEnergyOptions.find(option => { return option.value == this.meterForm.controls.fuel.value });
      if (selectedEnergyOption && selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Steam') {
        facilityUnit = this.facility.massUnit;
      } else if (selectedEnergyOption && selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Chilled Water') {
        facilityUnit = this.facility.energyUnit;
      } else if (selectedEnergyOption && selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Hot Water') {
        facilityUnit = this.facility.energyUnit;
      } else if (selectedEnergyOption && selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Compressed Air') {
        facilityUnit = this.facility.volumeGasUnit;
      }
    } else if (selectedMeterSource == 'Water Intake' || selectedMeterSource == 'Water Discharge') {
      facilityUnit = this.facility.volumeLiquidUnit;
    } else if (selectedMeterSource == 'Other Utility') {
      facilityUnit = this.facility.massUnit;
    }
    this.meterForm.controls.startingUnit.patchValue(facilityUnit);
    this.meterForm.controls.startingUnit.updateValueAndValidity();
  }

  checkHasDifferentUnits() {
    let differentUnits: { differentEnergyUnit: boolean, emissionsOutputRate: boolean, differentCollectionUnit: boolean } = this.energyUnitsHelperService.checkHasDifferentUnits(
      this.meterForm.controls.source.value,
      this.meterForm.controls.phase.value,
      this.meterForm.controls.startingUnit.value,
      this.meterForm.controls.fuel.value,
      this.facility,
      this.meterForm.controls.energyUnit.value
    )
    this.hasDifferentEnergyUnits = differentUnits.differentEnergyUnit;
    this.hasDifferentCollectionUnits = differentUnits.differentCollectionUnit;
    this.hasDifferentEmissions = differentUnits.emissionsOutputRate;
  }


  enableChangeUnits() {
    this.meterForm.controls.startingUnit.enable();
    this.meterForm.controls.energyUnit.enable();
    this.meterForm.controls.heatCapacity.enable();
    this.changingUnits = true;
  }

  setUnitBooleans() {
    this.isEnergyMeter = getIsEnergyMeter(this.meterForm.controls.source.value);
    let selectedUnit: UnitOption = EnergyUnitOptions.find(option => { return option.value == this.meterForm.controls.startingUnit.value });
    if (selectedUnit) {
      this.meterForm.controls.energyUnit.patchValue(selectedUnit.value);
      this.collectionUnitIsEnergy = true;
    } else {
      this.collectionUnitIsEnergy = false;
    }
  }

  checkDisplaySource() {
    let selectedMeterSource: MeterSource = this.meterForm.controls.source.value;
    if (selectedMeterSource == 'Water Intake' || selectedMeterSource == 'Water Discharge' || selectedMeterSource == 'Other Utility') {
      this.displayScope = false;
    } else {
      this.displayScope = true;
    }
  }

  setDefaultScope() {
    let defaultScope: number = this.editMeterFormService.getDefaultScope(this.meterForm.controls.source.value);
    this.meterForm.controls.scope.patchValue(defaultScope)
  }


  changeAgreementType() {
    this.checkShowSiteToSource();
    this.setSiteToSource();
    this.setDisplayEmissionsValues();
  }

  setIncludeEnergy() {
    if (this.meterForm.controls.includeInEnergy.value == false) {
      this.meterForm.controls.siteToSource.patchValue(1);
    } else {
      this.setSiteToSource();
    }
    this.checkShowSiteToSource();
  }

  setScopeOptions() {
    let selectedMeterSource: MeterSource = this.meterForm.controls.source.value;
    if (selectedMeterSource == 'Electricity') {
      //purchased electricity
      this.scopeOptions = [ScopeOptions[2]]
    } else if (selectedMeterSource == 'Other Energy') {
      //all options
      this.scopeOptions = ScopeOptions;
    } else if (selectedMeterSource == 'Natural Gas' || selectedMeterSource == 'Other Fuels') {
      //Scope 1
      this.scopeOptions = ScopeOptions.filter(option => { return option.scope == 'Scope 1' });
    }
  }

  setDisplayEmissionsValues() {
    if (this.meterForm.controls.source.value == 'Electricity') {
      if (this.meterForm.controls.agreementType.value == 1) {
        //grid
        this.displayRetainRecs = false;
        this.displayIncludeEnergy = false;
      } else if (this.meterForm.controls.agreementType.value == 2) {
        //self-generated
        this.displayIncludeEnergy = true;
        this.displayRetainRecs = true;
      } else if (this.meterForm.controls.agreementType.value == 3) {
        //PPPA
        this.displayIncludeEnergy = true;
        this.displayRetainRecs = true;
      } else if (this.meterForm.controls.agreementType.value == 4) {
        //VPPA
        this.displayIncludeEnergy = false;
        this.displayRetainRecs = true;
      } else if (this.meterForm.controls.agreementType.value == 5) {
        //Utility Green Product
        this.displayIncludeEnergy = false;
        this.displayRetainRecs = false;
      } else if (this.meterForm.controls.agreementType.value == 6) {
        //RECS
        this.displayIncludeEnergy = false;
        this.displayRetainRecs = true;
      }
    }
  }
}
