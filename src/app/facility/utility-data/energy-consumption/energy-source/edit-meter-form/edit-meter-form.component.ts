import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { FormGroup, ValidatorFn } from '@angular/forms';
import { IdbFacility } from 'src/app/models/idb';
import { ConvertUnitsService } from 'src/app/shared/convert-units/convert-units.service';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { EnergyUseCalculationsService } from 'src/app/shared/helper-services/energy-use-calculations.service';
import { EnergyUnitOptions, UnitOption } from 'src/app/shared/unitOptions';
import { EditMeterFormService } from './edit-meter-form.service';
import { AgreementType, AgreementTypes, FuelTypeOption, OtherEnergyOptions, ScopeOption, ScopeOptions, SourceOptions } from './editMeterOptions';

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


  agreementTypes: Array<AgreementType> = AgreementTypes;
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


  displayRetainRecs: boolean;
  displayIncludeEnergy: boolean;

  constructor(
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
    this.setScopeOptions();
    this.setStartingUnitOptions();
    this.setStartingUnit();
    this.updatePhaseAndFuelValidation();
    this.updateHeatCapacityValidation();
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
      let selectedFuelTypeOption: FuelTypeOption = this.fuelTypeOptions.find(option => { return option.value == this.meterForm.controls.fuel.value });
      let siteToSource: number = this.energyUseCalculationsService.getSiteToSource(this.meterForm.controls.source.value, selectedFuelTypeOption, this.meterForm.controls.agreementType.value);
      this.meterForm.controls.siteToSource.patchValue(siteToSource);
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
    if (this.meterForm.controls.source.value == 'Electricity') {
      facilityUnit = this.facility.electricityUnit;
    } else if (this.meterForm.controls.source.value == 'Natural Gas') {
      facilityUnit = this.facility.volumeGasUnit;
    } else if (this.meterForm.controls.source.value == 'Other Fuels') {
      if (this.meterForm.controls.phase.value == 'Gas') {
        facilityUnit = this.facility.volumeGasUnit;
      } else if (this.meterForm.controls.phase.value == 'Liquid') {
        facilityUnit = this.facility.volumeLiquidUnit;
      } else if (this.meterForm.controls.phase.value == 'Solid') {
        facilityUnit = this.facility.massUnit;
      }
    } else if (this.meterForm.controls.source.value == 'Other Energy') {
      let selectedEnergyOption: FuelTypeOption = OtherEnergyOptions.find(option => { return option.value == this.meterForm.controls.fuel.value });
      if (selectedEnergyOption && selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Steam') {
        facilityUnit = this.facility.massUnit;
      } else if (selectedEnergyOption && selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Chilled Water') {
        facilityUnit = this.facility.energyUnit;
      } else if (selectedEnergyOption && selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Hot Water') {
        facilityUnit = this.facility.energyUnit;
      }
    } else if (this.meterForm.controls.source.value == 'Water' || this.meterForm.controls.source.value == 'Waste Water') {
      facilityUnit = this.facility.volumeLiquidUnit;
    } else if (this.meterForm.controls.source.value == 'Other Utility') {
      facilityUnit = this.facility.energyUnit;
    }
    this.meterForm.controls.startingUnit.patchValue(facilityUnit);
    this.meterForm.controls.startingUnit.updateValueAndValidity();
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
    let defaultScope: number = this.editMeterFormService.getDefaultScope(this.meterForm.controls.source.value);
    this.meterForm.controls.scope.patchValue(defaultScope)
  }


  changeAgreementType() {
    //RECs or VPPA
    if (this.meterForm.controls.agreementType.value != 4 && this.meterForm.controls.agreementType.value != 6) {
      this.meterForm.controls.includeInEnergy.patchValue(true);
    } else {
      this.meterForm.controls.includeInEnergy.patchValue(false);
    }

    if (this.meterForm.controls.agreementType.value == 1) {
      this.meterForm.controls.retainRECs.patchValue(false);
    } else {
      this.meterForm.controls.retainRECs.patchValue(true);
    }
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
    if (this.meterForm.controls.source.value == 'Electricity') {
      //purchased electricity
      this.scopeOptions = [ScopeOptions[2]]
    } else if (this.meterForm.controls.source.value == 'Other Energy') {
      //all options
      this.scopeOptions = ScopeOptions;
    } else if (this.meterForm.controls.source.value == 'Natural Gas' || this.meterForm.controls.source.value == 'Other Fuels') {
      //Scope 1
      this.scopeOptions = ScopeOptions.filter(option => { return option.scope == 'Scope 1' });
    }
  }

  setDisplayEmissionsValues(){
    if(this.meterForm.controls.source.value == 'Electricity'){
      if(this.meterForm.controls.agreementType.value == 1){
        //grid
        this.displayRetainRecs = false;
        this.displayIncludeEnergy = false;        
      }else if(this.meterForm.controls.agreementType.value == 2){
        //self-generated
        this.displayIncludeEnergy = true;
        this.displayRetainRecs = true;
      } else if(this.meterForm.controls.agreementType.value == 3){
        //PPPA
        this.displayIncludeEnergy = true;
        this.displayRetainRecs = true;
      } else if(this.meterForm.controls.agreementType.value == 4){
        //VPPA
        this.displayIncludeEnergy = false;
        this.displayRetainRecs = true;
      } else if(this.meterForm.controls.agreementType.value == 5){
        //Utility Green Product
        this.displayIncludeEnergy = false;
        this.displayRetainRecs = false;
      }else if(this.meterForm.controls.agreementType.value == 6){
        //RECS
        this.displayIncludeEnergy = false;
        this.displayRetainRecs = true;
      } 
    }
  }

}
