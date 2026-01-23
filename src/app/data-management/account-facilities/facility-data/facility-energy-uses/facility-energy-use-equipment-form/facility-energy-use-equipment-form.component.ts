import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { EnergyEquipmentOperatingConditionsData, EquipmentUtilityData, IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { Subscription } from 'rxjs';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import * as _ from 'lodash';
import { FacilityEnergyUseEquipmentFormService, UtilityDataForm } from './facility-energy-use-equipment-form.service';
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

  yearOptions: Array<number> = []
  equipmentDetailsForm: FormGroup;
  utilityDataForms: Array<UtilityDataForm>;
  annualOperatingConditionsDataForms: Array<FormGroup>;
  private formSubscriptions = new Subscription();
  showUtilityTypeModal: boolean = false;
  showAddOperatingConditionsModal: boolean = false;
  constructor(
    private facilityEnergyUseEquipmentFormService: FacilityEnergyUseEquipmentFormService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService
  ) { }

  ngOnInit() {
    console.log('init')
    this.equipmentDetailsForm = this.facilityEnergyUseEquipmentFormService.getEquipmentDetailsFromFromEnergyUseEquipment(this.energyUseEquipment);
    this.utilityDataForms = this.facilityEnergyUseEquipmentFormService.getUtilityDataFormsFromEnergyUseEquipment(this.energyUseEquipment);
    this.annualOperatingConditionsDataForms = this.facilityEnergyUseEquipmentFormService.getAnnualOperatingConditionsFormsFromEnergyUseEquipment(this.energyUseEquipment);
    this.setYearOptions();
    this.subscribeToFormChanges();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['energyUseEquipment'] && !changes['energyUseEquipment'].firstChange) {
      console.log('changes detected');
      this.equipmentDetailsForm = this.facilityEnergyUseEquipmentFormService.getEquipmentDetailsFromFromEnergyUseEquipment(this.energyUseEquipment);
      this.utilityDataForms = this.facilityEnergyUseEquipmentFormService.getUtilityDataFormsFromEnergyUseEquipment(this.energyUseEquipment);
      this.annualOperatingConditionsDataForms = this.facilityEnergyUseEquipmentFormService.getAnnualOperatingConditionsFormsFromEnergyUseEquipment(this.energyUseEquipment);
      this.setYearOptions();
      this.subscribeToFormChanges();
    }
  }

  addOperatingConditionsYear(year: number) {
    let newOperatingConditionsData: EnergyEquipmentOperatingConditionsData = {
      year: year,
      hoursOfOperation: 8760,
      loadFactor: 100,
      dutyFactor: 100,
      efficiency: 100
    };
    let newForm: FormGroup = this.facilityEnergyUseEquipmentFormService.getOperatingConditionsYearForm(newOperatingConditionsData);
    this.annualOperatingConditionsDataForms.push(newForm);
    this.utilityDataForms.forEach(udf => {
      let energyUseForm: FormGroup = this.facilityEnergyUseEquipmentFormService.getEnergyUseForm({ year: year, energyUse: 0, overrideEnergyUse: false });
      udf.energyUseForms.push(energyUseForm);
    });
    this.subscribeToFormChanges();
    this.saveChanges();
    this.closeAddOperatingConditionsModal();
    this.setYearOptions();
  }

  setYearOptions() {
    this.yearOptions = new Array();
    let currentYears: Array<number> = this.annualOperatingConditionsDataForms.map(form => { return form.controls['year'].value });
    let facilityMeterDataYears: { endYear: number, startYear: number } = this.utilityMeterDataDbService.getStartEndYearsForFacility(this.energyUseEquipment.facilityId);
    for (let year = facilityMeterDataYears.startYear; year <= facilityMeterDataYears.endYear; year++) {
      if (!currentYears.includes(year)) {
        this.yearOptions.push(year);
      }
    }
  }

  removeOperatingConditionsData(dataForm: FormGroup) {
    let yearToRemove: number = dataForm.controls['year'].value;
    this.annualOperatingConditionsDataForms = this.annualOperatingConditionsDataForms.filter(form => { return form.controls['year'].value != yearToRemove });
    this.utilityDataForms.forEach(udf => {
      udf.energyUseForms = udf.energyUseForms.filter(euf => { return euf.controls['year'].value != yearToRemove });
    });
    this.subscribeToFormChanges();
    this.setYearOptions();
    this.saveChanges();
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
    this.facilityEnergyUseEquipmentFormService.calculateEnergyUse(this.utilityDataForms, this.annualOperatingConditionsDataForms);
    this.energyUseEquipment = this.facilityEnergyUseEquipmentFormService.updateEnergyUseEquipmentFromForms(
      this.energyUseEquipment,
      this.equipmentDetailsForm,
      this.utilityDataForms,
      this.annualOperatingConditionsDataForms
    );
    this.emitChanged.emit(this.energyUseEquipment);
  }

  openAddOperatingConditionsModal() {
    this.showAddOperatingConditionsModal = true;
  }

  closeAddOperatingConditionsModal() {
    this.showAddOperatingConditionsModal = false;
  }
}
