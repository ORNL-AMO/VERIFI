import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { FormGroup, ValidatorFn } from '@angular/forms';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { EnergyUseCalculationsService } from 'src/app/shared/helper-services/energy-use-calculations.service';
import { UnitOption } from 'src/app/shared/unitOptions';
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
  meterFormDisabled: boolean;
  @Input()
  meterEnergyUnit: string;

  displayPhase: boolean;
  displayFuel: boolean;
  fuelTypeOptions: Array<FuelTypeOption>;
  startingUnitOptions: Array<UnitOption>;
  energySourceLabel: string = 'Fuel Type';
  displayHeatCapacity: boolean;
  displaySiteToSource: boolean;
  energyUnit: string;
  sourceOptions: Array<string> = SourceOptions
  constructor(private facilityDbService: FacilitydbService,
    private energyUnitsHelperService: EnergyUnitsHelperService, private energyUseCalculationsService: EnergyUseCalculationsService,
    private editMeterFormService: EditMeterFormService, private cd: ChangeDetectorRef) { }

  ngOnInit(): void {
    if (!this.meterEnergyUnit) {
      console.log('facility');
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      if (selectedFacility) {
        this.energyUnit = selectedFacility.energyUnit;
      }
    }else{
      this.energyUnit = this.meterEnergyUnit;
    }
  }

  ngOnChanges() {
    this.setFuelTypeOptions(true);
    this.checkDisplayFuel();
    this.checkDisplayPhase();
    this.setStartingUnitOptions();
    this.checkShowHeatCapacity();
    this.checkShowSiteToSource();
  }

  changeSource() {
    this.setFuelTypeOptions(false);
    this.checkDisplayFuel();
    this.checkDisplayPhase();
    this.setStartingUnitOptions();
    this.setStartingUnit();
    this.updatePhaseAndFuelValidation();
    this.updateHeatCapacityValidation();
    this.checkShowHeatCapacity();
    this.checkShowSiteToSource();
    this.setHeatCapacity();
    this.setSiteToSource();
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

  changeUnit() {
    this.updateHeatCapacityValidation();
    this.checkShowHeatCapacity();
    this.checkShowSiteToSource();
    this.setHeatCapacity();
    this.setSiteToSource();
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
      let heatCapacity: number = this.energyUseCalculationsService.getHeatingCapacity(this.meterForm.controls.source.value, this.meterForm.controls.startingUnit.value, selectedEnergyOption)
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

  getMeterEnergyUnit(): string {
    let isEnergyUnit: boolean = this.energyUnitsHelperService.isEnergyUnit(this.meterForm.controls.startingUnit.value);
    if (isEnergyUnit) {
      return this.meterForm.controls.startingUnit.value;
    } else {
      let isEnergyMeter: boolean = this.energyUnitsHelperService.isEnergyMeter(this.meterForm.controls.source.value);
      if (isEnergyMeter) {
        let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
        return selectedFacility.energyUnit;
      } else {
        return undefined;
      }
    }
  }

  setStartingUnitOptions() {
    this.startingUnitOptions = this.energyUnitsHelperService.getStartingUnitOptions(this.meterForm.controls.source.value, this.meterForm.controls.phase.value, this.meterForm.controls.fuel.value);
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
}
