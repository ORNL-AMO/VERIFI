import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { FormGroup, ValidatorFn } from '@angular/forms';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { ConvertUnitsService } from 'src/app/shared/convert-units/convert-units.service';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { EnergyUseCalculationsService } from 'src/app/shared/helper-services/energy-use-calculations.service';
import { ScopeOption, ScopeOptions } from 'src/app/shared/meterOptions';
import { EnergyUnitOptions, UnitOption } from 'src/app/shared/unitOptions';
import { EditMeterFormService } from './edit-meter-form.service';
import { FuelTypeOption, OtherEnergyOptions, SourceOptions } from './editMeterOptions';

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


  scopeOptions: Array<ScopeOption> = ScopeOptions;
  hasDifferentCollectionUnits: boolean;
  hasDifferentEmissions: boolean;
  hasDifferentEnergyUnits: boolean;
  displayPhase: boolean;
  displayFuel: boolean;
  displayScope: boolean;
  fuelTypeOptions: Array<FuelTypeOption>;
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
  constructor(private facilityDbService: FacilitydbService,
    private energyUnitsHelperService: EnergyUnitsHelperService, private energyUseCalculationsService: EnergyUseCalculationsService,
    private editMeterFormService: EditMeterFormService, private cd: ChangeDetectorRef, private convertUnitsService: ConvertUnitsService) { }

  ngOnInit(): void {
  }

  ngOnChanges() {
    this.checkHasDifferentUnits();
    this.setFuelTypeOptions(true);
    this.checkDisplayFuel();
    this.checkDisplayPhase();
    this.checkDisplaySource();
    this.setStartingUnitOptions();
    this.setUnitBooleans();
    this.checkShowHeatCapacity();
    this.checkShowSiteToSource();
    this.checkShowEmissionsOutputRate();
  }

  changeSource() {
    if (this.meterForm.controls.source.value == 'Electricity') {
      this.meterForm.controls.energyUnit.patchValue('kWh');
      this.meterForm.controls.startingUnit.disable();
    } else {
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      this.meterForm.controls.energyUnit.patchValue(selectedFacility.energyUnit);
      this.meterForm.controls.startingUnit.enable();
    }
    this.setFuelTypeOptions(false);
    this.checkDisplayFuel();
    this.checkDisplayPhase();
    this.checkDisplaySource();
    this.setStartingUnitOptions();
    this.setStartingUnit();
    this.updatePhaseAndFuelValidation();
    this.updateHeatCapacityValidation();
    this.updateEmissionsOutputRateValidation();
    this.checkShowHeatCapacity();
    this.checkShowSiteToSource();
    this.checkShowEmissionsOutputRate();
    this.setUnitBooleans();
    this.setHeatCapacity();
    this.setSiteToSource();
    this.setEmissionsOutputRate();
    this.setDefaultScope();
    this.cd.detectChanges();
  }

  changeFuel() {
    if (this.meterForm.controls.source.value == 'Other Energy') {
      this.setStartingUnitOptions();
      this.setStartingUnit();
    }
    this.updateHeatCapacityValidation();
    this.checkShowHeatCapacity();
    this.checkShowSiteToSource();
    this.setHeatCapacity();
    this.setSiteToSource();
    this.setEmissionsOutputRate();
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
    this.setEmissionsOutputRate();
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
    this.setEmissionsOutputRate();
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
    let siteToSourceValidation: Array<ValidatorFn> = this.editMeterFormService.getSiteToSourceValidation(this.meterForm.controls.source.value, this.meterForm.controls.startingUnit.value);
    this.meterForm.controls.siteToSource.setValidators(siteToSourceValidation);
    this.meterForm.controls.siteToSource.updateValueAndValidity();
  }

  updateEmissionsOutputRateValidation() {
    let emissionsOutputRateValidators: Array<ValidatorFn> = this.editMeterFormService.getEmissionsOutputRateValidation(this.meterForm.controls.source.value);
    this.meterForm.controls.emissionsOutputRate.setValidators(emissionsOutputRateValidators);
    this.meterForm.controls.emissionsOutputRate.updateValueAndValidity();
  }

  setFuelTypeOptions(onChange: boolean) {
    this.fuelTypeOptions = this.energyUseCalculationsService.getFuelTypeOptions(this.meterForm.controls.source.value, this.meterForm.controls.phase.value);
    let selectedEnergyOption: FuelTypeOption = this.fuelTypeOptions.find(option => { return option.value == this.meterForm.controls.fuel.value });
    if (!selectedEnergyOption && this.fuelTypeOptions.length != 0 && !onChange) {
      this.meterForm.controls.fuel.patchValue(this.fuelTypeOptions[0].value);
    }
  }

  //TODO: Set heat capacity and source for electricity and natural gas (no energy options used);
  setHeatCapacity() {
    if (this.displayHeatCapacity) {
      let selectedEnergyOption: FuelTypeOption = this.fuelTypeOptions.find(option => { return option.value == this.meterForm.controls.fuel.value });
      let heatCapacity: number = this.energyUseCalculationsService.getHeatingCapacity(this.meterForm.controls.source.value, this.meterForm.controls.startingUnit.value, this.meterForm.controls.energyUnit.value, selectedEnergyOption)
      this.meterForm.controls.heatCapacity.patchValue(heatCapacity);
    }
  }

  setSiteToSource() {
    if (this.displaySiteToSource) {
      let selectedEnergyOption: FuelTypeOption = this.fuelTypeOptions.find(option => { return option.value == this.meterForm.controls.fuel.value });
      let siteToSource: number = this.energyUseCalculationsService.getSiteToSource(this.meterForm.controls.source.value, this.meterForm.controls.startingUnit.value, selectedEnergyOption)
      this.meterForm.controls.siteToSource.patchValue(siteToSource);
    }
  }

  checkShowHeatCapacity() {
    this.displayHeatCapacity = this.editMeterFormService.checkShowHeatCapacity(this.meterForm.controls.source.value, this.meterForm.controls.startingUnit.value);
  }

  checkShowSiteToSource() {
    this.displaySiteToSource = this.editMeterFormService.checkShowSiteToSource(this.meterForm.controls.source.value, this.meterForm.controls.startingUnit.value);
  }

  checkShowEmissionsOutputRate() {
    this.displayEmissionsOutputRate = this.editMeterFormService.checkShowEmissionsOutputRate(this.meterForm.controls.source.value);
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
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let facilityUnit: string;
    if (this.meterForm.controls.source.value == 'Electricity') {
      facilityUnit = 'kWh';
    } else if (this.meterForm.controls.source.value == 'Natural Gas') {
      facilityUnit = selectedFacility.volumeGasUnit;
    } else if (this.meterForm.controls.source.value == 'Other Fuels') {
      if (this.meterForm.controls.phase.value == 'Gas') {
        facilityUnit = selectedFacility.volumeGasUnit;
      } else if (this.meterForm.controls.phase.value == 'Liquid') {
        facilityUnit = selectedFacility.volumeLiquidUnit;
      } else if (this.meterForm.controls.phase.value == 'Solid') {
        facilityUnit = selectedFacility.massUnit;
      }
    } else if (this.meterForm.controls.source.value == 'Other Energy') {
      let selectedEnergyOption: FuelTypeOption = OtherEnergyOptions.find(option => { return option.value == this.meterForm.controls.fuel.value });
      if (selectedEnergyOption && selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Steam') {
        facilityUnit = selectedFacility.massUnit;
      } else if (selectedEnergyOption && selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Chilled Water') {
        facilityUnit = selectedFacility.energyUnit;
      } else if (selectedEnergyOption && selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Hot Water') {
        facilityUnit = selectedFacility.energyUnit;
      }
    } else if (this.meterForm.controls.source.value == 'Water' || this.meterForm.controls.source.value == 'Waste Water') {
      facilityUnit = selectedFacility.volumeLiquidUnit;
    } else if (this.meterForm.controls.source.value == 'Other Utility') {
      facilityUnit = selectedFacility.energyUnit;
    }
    this.meterForm.controls.startingUnit.patchValue(facilityUnit);
    this.meterForm.controls.startingUnit.updateValueAndValidity();
  }

  setEmissionsOutputRate() {
    let emissionsRate: number = this.energyUseCalculationsService.getEmissionsOutputRate(this.meterForm.controls.source.value, this.meterForm.controls.fuel.value, this.meterForm.controls.phase.value, this.meterForm.controls.energyUnit.value);
    this.meterForm.controls.emissionsOutputRate.patchValue(emissionsRate);
    this.checkHasDifferentUnits();
  }

  convertEmissions(emissionsRate: number): number {
    if (this.meterForm.controls.energyUnit.value != 'MMBtu') {
      let conversionHelper: number = this.convertUnitsService.value(1).from('MMBtu').to(this.meterForm.controls.energyUnit.value);
      emissionsRate = emissionsRate / conversionHelper;
      emissionsRate = this.convertUnitsService.roundVal(emissionsRate, 4)
    }
    return emissionsRate;
  }

  checkHasDifferentUnits() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let differentUnits: { differentEnergyUnit: boolean, emissionsOutputRate: boolean, differentCollectionUnit: boolean } = this.energyUnitsHelperService.checkHasDifferentUnits(
      this.meterForm.controls.source.value,
      this.meterForm.controls.phase.value,
      this.meterForm.controls.emissionsOutputRate.value,
      this.meterForm.controls.startingUnit.value,
      this.meterForm.controls.fuel.value,
      selectedFacility,
      this.meterForm.controls.energyUnit.value
    )
    this.hasDifferentEnergyUnits = differentUnits.differentEnergyUnit;
    this.hasDifferentCollectionUnits = differentUnits.differentCollectionUnit;
    this.hasDifferentEmissions = differentUnits.emissionsOutputRate;
  }


  enableChangeUnits() {
    if (this.meterForm.controls.source.value != 'Electricity') {
      this.meterForm.controls.startingUnit.enable();
      this.meterForm.controls.energyUnit.enable();
    }
    this.meterForm.controls.heatCapacity.enable();
    this.changingUnits = true;
  }

  setUnitBooleans() {
    this.isEnergyMeter = this.energyUnitsHelperService.isEnergyMeter(this.meterForm.controls.source.value);
    let selectedUnit: UnitOption = EnergyUnitOptions.find(option => { return option.value == this.meterForm.controls.startingUnit.value });
    if (selectedUnit) {
      this.meterForm.controls.energyUnit.patchValue(selectedUnit.value);
      this.collectionUnitIsEnergy = true;
    } else {
      this.collectionUnitIsEnergy = false;
    }
  }

  checkDisplaySource() {
    if (this.meterForm.controls.source.value == 'Water' || this.meterForm.controls.source.value == 'Waste Water' || this.meterForm.controls.source.value == 'Other Utility') {
      this.displayScope = false;
    } else {
      this.displayScope = true;
    }
  }

  setDefaultScope() {
    if (this.meterForm.controls.source.value == 'Electricity') {
      this.meterForm.controls.scope.patchValue(3)
    } else if (this.meterForm.controls.source.value == 'Other Energy') {
      this.meterForm.controls.scope.patchValue(4)
    } else if (this.meterForm.controls.source.value == 'Natural Gas') {
      this.meterForm.controls.scope.patchValue(1)
    } else if (this.meterForm.controls.source.value == 'Other Fuels') {
      this.meterForm.controls.scope.patchValue(1)
    } else {
      this.meterForm.controls.scope.patchValue(undefined)
    }
  }
}
