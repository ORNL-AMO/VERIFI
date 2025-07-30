import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { FormGroup, ValidatorFn } from '@angular/forms';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { checkShowHeatCapacity, checkShowSiteToSource, getHeatingCapacity, getIsEnergyMeter, getSiteToSource, getStartingUnitOptions } from 'src/app/shared/sharedHelperFuntions';
import { DemandUnitOptions, EnergyUnitOptions, UnitOption } from 'src/app/shared/unitOptions';
import { EditMeterFormService } from './edit-meter-form.service';
import { AllSources, MeterSource, WaterDischargeType, WaterDischargeTypes, WaterIntakeType, WaterIntakeTypes } from 'src/app/models/constantsAndTypes';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import { FuelTypeOption } from 'src/app/shared/fuel-options/fuelTypeOption';
import { StationaryOtherEnergyOptions } from 'src/app/shared/fuel-options/stationaryOtherEnergyOptions';
import { getFuelTypeOptions } from 'src/app/shared/fuel-options/getFuelTypeOptions';
import { ScopeOption, ScopeOptions } from 'src/app/models/scopeOption';
import { GlobalWarmingPotential, GlobalWarmingPotentials } from 'src/app/models/globalWarmingPotentials';
import { ConvertValue } from 'src/app/calculations/conversions/convertValue';
import { CustomGWPDbService } from 'src/app/indexedDB/custom-gwp-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbCustomGWP } from 'src/app/models/idbModels/customGWP';
import { IdbCustomFuel } from 'src/app/models/idbModels/customFuel';

@Component({
    selector: 'app-edit-meter-form',
    templateUrl: './edit-meter-form.component.html',
    styleUrls: ['./edit-meter-form.component.css'],
    standalone: false
})
export class EditMeterFormComponent implements OnInit {
  @Input({required: true})
  meterForm: FormGroup;
  @Input()
  meterDataExists: boolean;
  @Input({required: true})
  facility: IdbFacility;

  globalWarmingPotentials: Array<GlobalWarmingPotential>;
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
  sourceOptions: Array<string> = AllSources;
  changingUnits: boolean = false;
  energyUnitOptions: Array<UnitOption> = EnergyUnitOptions;
  demandUnitOptions: Array<UnitOption> = DemandUnitOptions;
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
    private customFuelDbService: CustomFuelDbService,
    private customGWPDbService: CustomGWPDbService) { }

  ngOnInit(): void {
    this.setGlobalWarmingPotentials();
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
    this.setDefaultScope();
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
    this.updateVehicleValidation();
    this.checkShowHeatCapacity();
    this.checkShowSiteToSource();
    this.setUnitBooleans();
    this.setHeatCapacity();
    this.setSiteToSource();
    this.setDisplayEmissionsValues();
    this.cd.detectChanges();
  }

  changeFuel() {
    this.setSelectedFuelTypeOption();
    if (this.meterForm.controls.source.value == 'Other Energy') {
      this.setStartingUnitOptions();
      this.setStartingUnit();
      this.setUnitBooleans();
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
    this.setGlobalWarmingPotential();
    this.cd.detectChanges();
  }

  changeEnergyUnit() {
    this.setHeatCapacity();
    this.checkHasDifferentUnits();
    this.cd.detectChanges();
  }

  changeScope() {
    this.updatePhaseAndFuelValidation();
    this.updateHeatCapacityValidation();
    this.updateWaterValidation();
    this.updateVehicleValidation();
    this.setStartingUnitOptions();
    this.updateRefrigerationValidation();
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
    let fuelValidators: Array<ValidatorFn> = this.editMeterFormService.getFuelValidation(this.meterForm.controls.source.value, this.meterForm.controls.scope.value);
    this.meterForm.controls.fuel.setValidators(fuelValidators);
    this.meterForm.controls.fuel.updateValueAndValidity();

    let phaseValidators: Array<ValidatorFn> = this.editMeterFormService.getPhaseValidation(this.meterForm.controls.source.value, this.meterForm.controls.scope.value);
    this.meterForm.controls.phase.setValidators(phaseValidators);
    this.meterForm.controls.phase.updateValueAndValidity();
  }

  updateHeatCapacityValidation() {
    let heatCapacityValidators: Array<ValidatorFn> = this.editMeterFormService.getHeatCapacitValidation(this.meterForm.controls.source.value, this.meterForm.controls.startingUnit.value, this.meterForm.controls.scope.value);
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

  updateRefrigerationValidation() {
    let refrigerationValidation: Array<ValidatorFn> = this.editMeterFormService.getGlobalWarmingPotentialValidation(this.meterForm.controls.scope.value);
    this.meterForm.controls.globalWarmingPotentialOption.setValidators(refrigerationValidation);
    this.meterForm.controls.globalWarmingPotentialOption.updateValueAndValidity();
    this.meterForm.controls.globalWarmingPotential.setValidators(refrigerationValidation);
    this.meterForm.controls.globalWarmingPotential.updateValueAndValidity();
  }

  setFuelTypeOptions(onChange: boolean) {
    let customFuels: Array<IdbCustomFuel> = this.customFuelDbService.accountCustomFuels.getValue();
    this.fuelTypeOptions = getFuelTypeOptions(this.meterForm.controls.source.value, this.meterForm.controls.phase.value, customFuels, this.meterForm.controls.scope.value, this.meterForm.controls.vehicleCategory.value, this.meterForm.controls.vehicleType.value);
    let selectedEnergyOption: FuelTypeOption = this.fuelTypeOptions.find(option => { return option.value == this.meterForm.controls.fuel.value });
    if (!selectedEnergyOption && this.fuelTypeOptions.length != 0 && !onChange) {
      this.meterForm.controls.fuel.patchValue(this.fuelTypeOptions[0].value);
    }
    this.setSelectedFuelTypeOption();
  }

  setSelectedFuelTypeOption() {
    this.selectedFuelTypeOption = this.fuelTypeOptions.find(option => { return option.value == this.meterForm.controls.fuel.value });
  }

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
    this.displayHeatCapacity = checkShowHeatCapacity(this.meterForm.controls.source.value, this.meterForm.controls.startingUnit.value, this.meterForm.controls.scope.value);
  }

  checkShowSiteToSource() {
    this.displaySiteToSource = checkShowSiteToSource(this.meterForm.controls.source.value, this.meterForm.controls.includeInEnergy.value, this.meterForm.controls.scope.value);
  }

  setStartingUnitOptions() {
    if (!this.meterDataExists) {
      this.startingUnitOptions = getStartingUnitOptions(this.meterForm.controls.source.value, this.meterForm.controls.phase.value, this.meterForm.controls.fuel.value, this.meterForm.controls.scope.value);
    } else {
      this.startingUnitOptions = this.energyUnitsHelperService.getStartingUnitOptionsExistingData(this.meterForm.controls.source.value, this.meterForm.controls.phase.value, this.meterForm.controls.fuel.value, this.meterForm.controls.startingUnit.value, this.meterForm.controls.scope.value);
    }
    let checkExists: UnitOption = this.startingUnitOptions.find(option => {
      return option.value == this.meterForm.controls.startingUnit.value;
    });
    if (!checkExists) {
      this.setStartingUnit();
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
      let selectedEnergyOption: FuelTypeOption = StationaryOtherEnergyOptions.find(option => { return option.value == this.meterForm.controls.fuel.value });
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
    } else if (selectedMeterSource == 'Other') {
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

    this.meterForm.controls.vehicleCollectionUnit.enable();
    this.meterForm.controls.vehicleDistanceUnit.enable();
    this.meterForm.controls.vehicleFuelEfficiency.enable();
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
    if (selectedMeterSource == 'Water Intake' || selectedMeterSource == 'Water Discharge') {
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
      //all options except mobile
      this.scopeOptions = [ScopeOptions[3]];
    } else if (selectedMeterSource == 'Natural Gas') {
      //Stationary
      this.scopeOptions = [ScopeOptions[0]];
    } else if (selectedMeterSource == 'Other Fuels') {
      //Scope 1 (non-fugitive)
      this.scopeOptions = ScopeOptions.filter(option => { return option.scope == 'Scope 1' && option.value != 5 && option.value != 6 });
    } else if (selectedMeterSource == 'Other') {
      //Scope 1 (non-fugitive)
      this.scopeOptions = ScopeOptions.filter(option => { return option.value == 100 || option.value == 5 || option.value == 6 });
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

  updateVehicleValidation() {
    let basicVehicleValidation: Array<ValidatorFn> = this.editMeterFormService.getBasicVehicleValidation(this.meterForm.controls.scope.value);
    let additionalVehicleValidation: Array<ValidatorFn> = this.editMeterFormService.getAdditionalVehicleValidation(this.meterForm.controls.scope.value, this.meterForm.controls.vehicleCategory.value);
    this.meterForm.controls.vehicleCategory.setValidators(basicVehicleValidation);
    this.meterForm.controls.vehicleCategory.updateValueAndValidity();

    this.meterForm.controls.vehicleType.setValidators(additionalVehicleValidation);
    this.meterForm.controls.vehicleType.updateValueAndValidity();

    this.meterForm.controls.vehicleCollectionType.setValidators(additionalVehicleValidation);
    this.meterForm.controls.vehicleCollectionType.updateValueAndValidity();

    this.meterForm.controls.vehicleCollectionUnit.setValidators(basicVehicleValidation);
    this.meterForm.controls.vehicleCollectionUnit.updateValueAndValidity();

    this.meterForm.controls.vehicleFuel.setValidators(basicVehicleValidation);
    this.meterForm.controls.vehicleFuel.updateValueAndValidity();

    this.meterForm.controls.vehicleFuelEfficiency.setValidators(additionalVehicleValidation);
    this.meterForm.controls.vehicleFuelEfficiency.updateValueAndValidity();

    this.meterForm.controls.vehicleDistanceUnit.setValidators(additionalVehicleValidation);
    this.meterForm.controls.vehicleDistanceUnit.updateValueAndValidity();
  }

  setGlobalWarmingPotential() {
    if (this.meterForm.controls.scope.value == 5 || this.meterForm.controls.scope.value == 6) {
      let globalWarmingPotential: GlobalWarmingPotential = this.globalWarmingPotentials.find(potential => {
        return potential.value == this.meterForm.controls.globalWarmingPotentialOption.value;
      });
      if (globalWarmingPotential) {
        let conversionHelper: number = new ConvertValue(1, 'kg', this.meterForm.controls.startingUnit.value).convertedValue;
        let convertedGWP: number = globalWarmingPotential.gwp / conversionHelper;
        this.meterForm.controls.globalWarmingPotential.patchValue(convertedGWP);
      }
    }
  }

  setGlobalWarmingPotentials() {
    this.globalWarmingPotentials = new Array();
    let customGWPs: Array<IdbCustomGWP> = this.customGWPDbService.accountCustomGWPs.getValue();
    customGWPs.forEach(gwpOption => {
      this.globalWarmingPotentials.push(gwpOption);
    });
    GlobalWarmingPotentials.forEach(gwpOption => {
      this.globalWarmingPotentials.push(gwpOption);
    });
  }
}
