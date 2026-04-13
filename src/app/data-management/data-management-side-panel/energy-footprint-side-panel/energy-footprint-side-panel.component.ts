import { Component, computed, signal, inject, Signal, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { EnergyFootprintFacility } from 'src/app/calculations/energy-footprint/energyFootprintFacility';
import { getYearsWithFullDataAccount } from 'src/app/calculations/shared-calculations/calculationsHelpers';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityEnergyUseEquipmentDbService } from 'src/app/indexedDB/facility-energy-use-equipment-db.service';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

@Component({
  selector: 'app-energy-footprint-side-panel',
  standalone: false,
  templateUrl: './energy-footprint-side-panel.component.html',
  styleUrl: './energy-footprint-side-panel.component.css',
})
export class EnergyFootprintSidePanelComponent {

  private facilityDbService = inject(FacilitydbService);
  private facilityEnergyUseGroupsDbService = inject(FacilityEnergyUseGroupsDbService);
  private facilityEnergyUseEquipmentDbService = inject(FacilityEnergyUseEquipmentDbService);
  private calanderizationService = inject(CalanderizationService);
  private utilityMeterGroupDbService = inject(UtilityMeterGroupdbService);

  facilities: Signal<Array<IdbFacility>> = toSignal(this.facilityDbService.accountFacilities, { initialValue: [] });
  energyUseGroups: Signal<Array<IdbFacilityEnergyUseGroup>> = toSignal(this.facilityEnergyUseGroupsDbService.accountEnergyUseGroups, { initialValue: [] });
  equipment: Signal<Array<IdbFacilityEnergyUseEquipment>> = toSignal(this.facilityEnergyUseEquipmentDbService.accountEnergyUseEquipment, { initialValue: [] });
  calanderizedMeters: Signal<Array<CalanderizedMeter>> = toSignal(this.calanderizationService.calanderizedMeters, { initialValue: [] });
  utilityMeterGroups: Signal<Array<IdbUtilityMeterGroup>> = toSignal(this.utilityMeterGroupDbService.accountMeterGroups, { initialValue: [] });


  yearOptions: Signal<Array<number>> = computed(() => {
    const calanderizedMeters = this.calanderizedMeters();
    const facilities = this.facilities();
    if (calanderizedMeters.length === 0 || facilities.length === 0) {
      return [];
    }
    return getYearsWithFullDataAccount(calanderizedMeters, facilities);
  });

  energyFootprintFacilities: Signal<Array<EnergyFootprintFacility>> = computed(() => {
    const facilities = this.facilities();
    const energyUseGroups = this.energyUseGroups();
    const equipment = this.equipment();
    const calanderizedMeters = this.calanderizedMeters();
    const utilityMeterGroups = this.utilityMeterGroups();
    if (
      facilities.length === 0 ||
      energyUseGroups.length === 0 ||
      equipment.length === 0 ||
      calanderizedMeters.length === 0 ||
      utilityMeterGroups.length === 0
    ) {
      return [];
    }
    return facilities.map(facility =>
      new EnergyFootprintFacility(
        facility,
        energyUseGroups,
        equipment,
        calanderizedMeters,
        utilityMeterGroups
      )
    );
  });

  //set to latest year with full data by default, but allow user to select other years to view
  selectedYear = signal<number | null>(null);

  constructor() {
    // Automatically set selectedYear to the last year in yearOptions when yearOptions changes
    effect(() => {
      const options = this.yearOptions();
      if (options.length > 0 && !options.includes(this.selectedYear()!)) {
        this.selectedYear.set(options[options.length - 1]);
      }
    });
  }


}
