import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, computed, effect, EventEmitter, inject, Injector, input, Output, Signal, signal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { EnergyEquipmentOperatingConditionsData, EquipmentUtilityData, IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { auditTime, distinctUntilChanged, merge } from 'rxjs';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import * as _ from 'lodash';
import { FacilityEnergyUseEquipmentFormService, UtilityDataForm } from './facility-energy-use-equipment-form.service';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { toSignal } from '@angular/core/rxjs-interop';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { getAllYearsWithData } from 'src/app/calculations/shared-calculations/calculationsHelpers';

@Component({
  selector: 'app-facility-energy-use-equipment-form',
  standalone: false,
  templateUrl: './facility-energy-use-equipment-form.component.html',
  styleUrl: './facility-energy-use-equipment-form.component.css'
})
export class FacilityEnergyUseEquipmentFormComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  energyUseEquipment = input.required<IdbFacilityEnergyUseEquipment>();
  @Output('emitChanged')
  emitChanged: EventEmitter<IdbFacilityEnergyUseEquipment> = new EventEmitter<IdbFacilityEnergyUseEquipment>();
  inSetup = input(false);


  private facilityEnergyUseEquipmentFormService: FacilityEnergyUseEquipmentFormService = inject(FacilityEnergyUseEquipmentFormService);
  private calanderizationService: CalanderizationService = inject(CalanderizationService);
  private injector: Injector = inject(Injector);

  private energyUseEquipmentSignal = signal<IdbFacilityEnergyUseEquipment | null>(null);
  calanderizedMeterData: Signal<Array<CalanderizedMeter>> = toSignal(this.calanderizationService.calanderizedMeters, { initialValue: new Array<CalanderizedMeter>() });
  private facility: Signal<IdbFacility> = this.accountWorkspaceStore.selectedFacility;

  hasElectricityUtility: Signal<boolean> = computed(() => {
    const utilityDataFroms = this.utilityDataForms();
    if (!utilityDataFroms || utilityDataFroms.length == 0) {
      return false;
    }
    const hasElec = utilityDataFroms.some(ud => ud.energySource == "Electricity");
    return hasElec;
  });


  yearOptions: Signal<Array<number>> = computed(() => {
    const facility: IdbFacility = this.facility();
    const calanderizedMeters = this.calanderizedMeterData();
    if (!facility || !calanderizedMeters) {
      return [];
    }
    const facilityYears: Array<number> = getAllYearsWithData(calanderizedMeters, facility);
    const currentYears: Array<number> = this.annualOperatingConditionsDataForms().map(form => { return form.controls['year'].value });
    return _.difference(facilityYears, currentYears).sort((a, b) => a - b);
  });
  equipmentDetailsForm = signal<FormGroup | null>(null);
  utilityDataForms = signal<Array<UtilityDataForm>>([]);
  annualOperatingConditionsDataForms = signal<Array<FormGroup>>([]);
  showUtilityTypeModal: boolean = false;
  showAddOperatingConditionsModal: boolean = false;
  constructor(
  ) {
    effect(() => {
      const incomingEnergyUseEquipment = this.energyUseEquipment();
      this.energyUseEquipmentSignal.set(incomingEnergyUseEquipment);
      this.initFormData();
    }, { injector: this.injector });

    effect((onCleanup) => {
      const equipmentDetailsForm = this.equipmentDetailsForm();
      const utilityDataForms = this.utilityDataForms();
      const annualOperatingConditionsDataForms = this.annualOperatingConditionsDataForms();
      if (!equipmentDetailsForm) {
        return;
      }

      const meterGroupChangesSub = equipmentDetailsForm.controls['utilityMeterGroupIds'].valueChanges.pipe(
        distinctUntilChanged((prev, curr) => _.isEqual(prev, curr))
      ).subscribe(() => {
        this.setUtilityTypes();
      });

      const allFormGroups: Array<FormGroup> = [
        equipmentDetailsForm,
        ...utilityDataForms.map(udf => udf.utilityDataForm),
        ...utilityDataForms.flatMap(udf => udf.energyUseForms),
        ...annualOperatingConditionsDataForms
      ];

      const saveChangesSub = merge(...allFormGroups.map(formGroup => formGroup.valueChanges)).pipe(
        // Coalesce synchronous form updates into one save call.
        auditTime(0)
      ).subscribe(() => {
        this.saveChanges();
      });

      onCleanup(() => {
        meterGroupChangesSub.unsubscribe();
        saveChangesSub.unsubscribe();
      });
    }, { injector: this.injector });
  }

  initFormData() {
    const energyUseEquipment = this.energyUseEquipmentSignal();
    if (!energyUseEquipment) {
      return;
    }
    this.equipmentDetailsForm.set(this.facilityEnergyUseEquipmentFormService.getEquipmentDetailsFromFromEnergyUseEquipment(energyUseEquipment));
    this.utilityDataForms.set(this.facilityEnergyUseEquipmentFormService.getUtilityDataFormsFromEnergyUseEquipment(energyUseEquipment));
    this.annualOperatingConditionsDataForms.set(this.facilityEnergyUseEquipmentFormService.getAnnualOperatingConditionsFormsFromEnergyUseEquipment(energyUseEquipment));
  }

  addOperatingConditionsYear(year: number) {
    const utilityDataForms = this.utilityDataForms();
    let newOperatingConditionsData: EnergyEquipmentOperatingConditionsData = {
      year: year,
      hoursOfOperation: 8760,
      loadFactor: 100,
      dutyFactor: 100,
      efficiency: 100
    };
    let newForm: FormGroup = this.facilityEnergyUseEquipmentFormService.getOperatingConditionsYearForm(newOperatingConditionsData);
    this.annualOperatingConditionsDataForms.update(forms => [...forms, newForm]);
    utilityDataForms.forEach(udf => {
      let energyUseUnit: string = this.accountWorkspaceStore.selectedFacility()?.energyUnit;
      let energyUseForm: FormGroup = this.facilityEnergyUseEquipmentFormService.getEnergyUseForm({ year: year, energyUse: 0, overrideEnergyUse: false, energyUseUnit: energyUseUnit });
      udf.energyUseForms.push(energyUseForm);
    });
    this.utilityDataForms.set([...utilityDataForms]);
    this.saveChanges();
    this.closeAddOperatingConditionsModal();
  }

  removeOperatingConditionsData(dataForm: FormGroup) {
    const utilityDataForms = this.utilityDataForms();
    let yearToRemove: number = dataForm.controls['year'].value;
    this.annualOperatingConditionsDataForms.update(forms => forms.filter(form => { return form.controls['year'].value != yearToRemove }));
    utilityDataForms.forEach(udf => {
      udf.energyUseForms = udf.energyUseForms.filter(euf => { return euf.controls['year'].value != yearToRemove });
    });
    this.utilityDataForms.set([...utilityDataForms]);
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
    this.saveChanges();
    this.closeAddUtilityModal();
  }

  setUtilityTypes() {
    const equipmentDetailsForm = this.equipmentDetailsForm();
    if (!equipmentDetailsForm) {
      return;
    }
    const utilityDataForms = this.utilityDataForms();
    let facilityMeters: Array<IdbUtilityMeter> = [...this.accountWorkspaceStore.facilityMeters()];
    let groupMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return equipmentDetailsForm.controls['utilityMeterGroupIds'].value.includes(meter.groupId); });
    let sources: Array<MeterSource> = groupMeters.map(meter => { return meter.source; });
    sources = _.uniq(sources);
    sources.forEach(source => {
      if (!utilityDataForms.find(udf => { return udf.energySource == source })) {
        this.addSourceToUtilitydata(source)
      }
    });
    //remove any that are not in the meter group
    this.utilityDataForms.set(this.utilityDataForms().filter(udf => { return sources.includes(udf.energySource) }));
    this.saveChanges();
  }

  addSourceToUtilitydata(source: MeterSource) {
    let years: Array<number> = this.annualOperatingConditionsDataForms().map(form => { return form.controls['year'].value });
    let utilityData: EquipmentUtilityData = {
      energySource: source,
      size: 0,
      numberOfEquipment: 1,
      units: '',
      energyUse: years.map(year => {
        return {
          year: year,
          energyUse: 0,
          overrideEnergyUse: false,
          energyUseUnit: this.accountWorkspaceStore.selectedFacility()?.energyUnit
        };
      })
    };
    let newForm: {
      energySource: MeterSource,
      utilityDataForm: FormGroup,
      energyUseForms: Array<FormGroup>
    } = this.facilityEnergyUseEquipmentFormService.getUtilityDataForm(utilityData);
    this.utilityDataForms.update(forms => [...forms, newForm]);
  }

  removeUtilityType(energySource: MeterSource) {
    this.utilityDataForms.update(forms => forms.filter(udf => { return udf.energySource != energySource }));
    this.saveChanges();
  }

  saveChanges() {
    const currentEnergyUseEquipment = this.energyUseEquipmentSignal();
    const equipmentDetailsForm = this.equipmentDetailsForm();
    if (!currentEnergyUseEquipment) {
      return;
    }
    if (!equipmentDetailsForm) {
      return;
    }
    this.facilityEnergyUseEquipmentFormService.calculateEnergyUse(this.utilityDataForms(), this.annualOperatingConditionsDataForms());
    const updatedEnergyUseEquipment = this.facilityEnergyUseEquipmentFormService.updateEnergyUseEquipmentFromForms(
      currentEnergyUseEquipment,
      equipmentDetailsForm,
      this.utilityDataForms(),
      this.annualOperatingConditionsDataForms()
    );
    this.energyUseEquipmentSignal.set(updatedEnergyUseEquipment);
    this.emitChanged.emit(updatedEnergyUseEquipment);
  }

  openAddOperatingConditionsModal() {
    this.showAddOperatingConditionsModal = true;
  }

  closeAddOperatingConditionsModal() {
    this.showAddOperatingConditionsModal = false;
  }
}
