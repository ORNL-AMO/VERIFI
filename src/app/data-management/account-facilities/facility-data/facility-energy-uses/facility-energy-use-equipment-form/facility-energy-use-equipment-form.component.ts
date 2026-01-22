import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { EnergyEquipmentOperatingConditionsData, EquipmentType, EquipmentUtilityData, IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { EquipmentTypes } from '../calculations/equipmentTypes';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { Subscription } from 'rxjs';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { AllSources, EnergySources, MeterSource } from 'src/app/models/constantsAndTypes';
import * as _ from 'lodash';
import { calculateTotalEnergyUse } from 'src/app/calculations/energy-footprint/energyFootprintCalculations';
import { FacilityEnergyUseEquipmentFormService, UtilityDataForm } from './facility-energy-use-equipment-form.service';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-facility-energy-use-equipment-form',
  standalone: false,
  templateUrl: './facility-energy-use-equipment-form.component.html',
  styleUrl: './facility-energy-use-equipment-form.component.css'
})
export class FacilityEnergyUseEquipmentFormComponent {
  @Input()
  energyUseEquipment: IdbFacilityEnergyUseEquipment;
  @Output('emitChanged')
  emitChanged: EventEmitter<IdbFacilityEnergyUseEquipment> = new EventEmitter<IdbFacilityEnergyUseEquipment>();
  @Input()
  inSetup: boolean = false;

  yearOptions: Array<{ year: number, selected: boolean }>
  equipmentDetailsForm: FormGroup;
  utilityDataForms: Array<UtilityDataForm>;
  annualOperatingConditionsDataForms: Array<FormGroup>;
  private formSubscriptions = new Subscription();
  showUtilityTypeModal: boolean = false;
  constructor(private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private facilityEnergyUseEquipmentFormService: FacilityEnergyUseEquipmentFormService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService
  ) { }

  ngOnInit() {
    this.setYearOptions();
    this.equipmentDetailsForm = this.facilityEnergyUseEquipmentFormService.getEquipmentDetailsFromFromEnergyUseEquipment(this.energyUseEquipment);
    this.utilityDataForms = this.facilityEnergyUseEquipmentFormService.getUtilityDataFormsFromEnergyUseEquipment(this.energyUseEquipment);
    this.annualOperatingConditionsDataForms = this.facilityEnergyUseEquipmentFormService.getAnnualOperatingConditionsFormsFromEnergyUseEquipment(this.energyUseEquipment);
    this.subscribeToFormChanges();
  }

  addOperatingConditionsData() {
    for (let yearOption of this.yearOptions) {
      if (yearOption.selected) {
        this.energyUseEquipment.operatingConditionsData.push({
          year: yearOption.year,
          hoursOfOperation: 8760,
          loadFactor: 100,
          dutyFactor: 100,
          efficiency: 100
        });
      }
    }
  }

  addOperatingConditionsYear() {
    // let currentYears: Array<number> = this.energyUseEquipment.operatingConditionsData.map(data => { return data.year });
    // let availableYears: Array<{ year: number }> = this.yearOptions.filter(yearOption => { return !currentYears.includes(yearOption.year) });
    // let year: number = availableYears[0].year;
    // this.energyUseEquipment.operatingConditionsData.push({
    //   year: year,
    //   hoursOfOperation: 8760,
    //   loadFactor: 100,
    //   dutyFactor: 100,
    //   efficiency: 100
    // });
    //add year to utility data energy use
    // this.facilityEnergyUseEquipmentFormService.addYearToUtilityDataForm(this.form, year);
  }

  setYearOptions() {
    this.yearOptions = new Array();
    let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
    let dates: Array<Date> = facilityMeterData.map(meterData => { return new Date(meterData.readDate) });
    let years: Array<number> = dates.map(date => { return date.getFullYear() });
    years = _.uniq(years);
    let startYear: number = _.min(years);
    let endYear: number = _.max(years);
    for (let year = startYear; year <= endYear; year++) {
      this.yearOptions.push({ year: year, selected: true });
    }
  }

  removeOperatingConditionsData(data: EnergyEquipmentOperatingConditionsData) {
    // this.energyUseEquipment.operatingConditionsData = this.energyUseEquipment.operatingConditionsData.filter(d => d.year !== data.year);
    // this.facilityEnergyUseEquipmentFormService.removeYearFromUtilityDataForm(this.form, data.year);
  }

  clearData() {
    // this.energyUseEquipment.operatingConditionsData = [];
    // this.facilityEnergyUseEquipmentFormService.removeAllYearsFromUtilityDataForm(this.form);
  }

  calculateEnergyUse() {
    console.log('calculate energy use');
  }

  openAddUtilityModal() {
    this.showUtilityTypeModal = true;
  }

  closeAddUtilityModal() {
    this.showUtilityTypeModal = false;
  }

  addUtilityType(source: MeterSource) {
    this.addSourceToUtilitydata(source);
    this.subscribeToFormChanges();
    this.saveChanges();
    this.closeAddUtilityModal();
  }

  setUtilityTypes() {
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let groupMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.groupId == this.equipmentDetailsForm.controls['utilityMeterGroupId'].value; });
    let sources: Array<MeterSource> = groupMeters.map(meter => { return meter.source; });
    sources = _.uniq(sources);
    sources.forEach(source => {
      if (!this.utilityDataForms.find(udf => { return udf.energySource == source })) {
        this.addSourceToUtilitydata(source)
      }
    });
    //remove any that are not in the meter group
    this.utilityDataForms = this.utilityDataForms.filter(udf => { return sources.includes(udf.energySource) });
    this.subscribeToFormChanges();
    this.saveChanges();
  }

  addSourceToUtilitydata(source: MeterSource) {
    let years: Array<number> = this.annualOperatingConditionsDataForms.map(form => { return form.controls['year'].value });
    let utilityData: EquipmentUtilityData = {
      energySource: source,
      size: 0,
      numberOfEquipment: 1,
      units: '',
      energyUse: years.map(year => {
        return {
          year: year,
          energyUse: 0,
          overrideEnergyUse: false
        };
      })
    };
    let newForm: {
      energySource: MeterSource,
      utilityDataForm: FormGroup,
      energyUseForms: Array<FormGroup>
    } = this.facilityEnergyUseEquipmentFormService.getUtilityDataForm(utilityData);
    this.utilityDataForms.push(newForm);
  }

  removeUtilityType(energySource: MeterSource) {
    this.utilityDataForms = this.utilityDataForms.filter(udf => { return udf.energySource != energySource });
    this.subscribeToFormChanges();
    this.saveChanges();
  }

  subscribeToFormChanges() {
    this.formSubscriptions.unsubscribe();
    this.formSubscriptions = new Subscription();
    this.formSubscriptions.add(
      this.equipmentDetailsForm.controls['utilityMeterGroupId'].valueChanges.pipe(distinctUntilChanged()).subscribe(() => {
        this.setUtilityTypes();
      }));
    this.formSubscriptions.add(
      this.equipmentDetailsForm.valueChanges.pipe(distinctUntilChanged()).subscribe(() => {
        this.saveChanges();
      }));
    this.utilityDataForms.forEach(udf => {
      this.formSubscriptions.add(
        udf.utilityDataForm.valueChanges.pipe(distinctUntilChanged()).subscribe(() => {
          this.saveChanges();
        }));
      udf.energyUseForms.forEach(euf => {
        this.formSubscriptions.add(
          euf.valueChanges.pipe(distinctUntilChanged()).subscribe(() => {
            this.saveChanges();
          }));
      });
    });
    this.annualOperatingConditionsDataForms.forEach(aocf => {
      this.formSubscriptions.add(
        aocf.valueChanges.pipe(distinctUntilChanged()).subscribe(() => {
          this.saveChanges();
        }));
    });
  }

  saveChanges() {
    this.energyUseEquipment = this.facilityEnergyUseEquipmentFormService.updateEnergyUseEquipmentFromForms(
      this.energyUseEquipment,
      this.equipmentDetailsForm,
      this.utilityDataForms,
      this.annualOperatingConditionsDataForms
    );
    this.emitChanged.emit(this.energyUseEquipment);
  }
}
