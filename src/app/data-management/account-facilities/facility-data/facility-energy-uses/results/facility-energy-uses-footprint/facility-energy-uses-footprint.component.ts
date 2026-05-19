import { Component, computed, effect, inject, signal, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { EnergyFootprintAnnualFacilityBalance } from 'src/app/calculations/energy-footprint/energyBalance/energyFootprintAnnualFacilityBalance';
import { getYearsWithFullData } from 'src/app/calculations/shared-calculations/calculationsHelpers';
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
  selector: 'app-facility-energy-uses-footprint',
  standalone: false,
  templateUrl: './facility-energy-uses-footprint.component.html',
  styleUrl: './facility-energy-uses-footprint.component.css',
})
export class FacilityEnergyUsesFootprintComponent {

  private facilityDbService = inject(FacilitydbService);
  private facilityEnergyUseGroupsDbService = inject(FacilityEnergyUseGroupsDbService);
  private facilityEnergyUseEquipmentDbService = inject(FacilityEnergyUseEquipmentDbService);
  private calanderizationService = inject(CalanderizationService);
  private utilityMeterGroupDbService = inject(UtilityMeterGroupdbService);

  selectedFacility$: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility, { initialValue: null });
  energyUseGroups$: Signal<Array<IdbFacilityEnergyUseGroup>> = toSignal(this.facilityEnergyUseGroupsDbService.accountEnergyUseGroups, { initialValue: [] });
  equipment$: Signal<Array<IdbFacilityEnergyUseEquipment>> = toSignal(this.facilityEnergyUseEquipmentDbService.accountEnergyUseEquipment, { initialValue: [] });
  calanderizedMeters$: Signal<Array<CalanderizedMeter>> = toSignal(this.calanderizationService.calanderizedMeters, { initialValue: [] });
  utilityMeterGroups$: Signal<Array<IdbUtilityMeterGroup>> = toSignal(this.utilityMeterGroupDbService.accountMeterGroups, { initialValue: [] });


  yearOptions: Signal<Array<number>> = computed(() => {
    const calanderizedMeters = this.calanderizedMeters$();
    const selectedFacility = this.selectedFacility$();
    if (calanderizedMeters.length === 0 || !selectedFacility) {
      return [];
    }
    return getYearsWithFullData(calanderizedMeters, selectedFacility);
  });

  //TODO: potentially make a web worker for this or optimize number of calls 
  //so as data changes it doesn't have to recalculate everything if not necessary. 
  //TODO: add loading logic during calculation
  energyFootprintAnnualFacilityBalance$: Signal<EnergyFootprintAnnualFacilityBalance> = computed(() => {
    const selectedFacility = this.selectedFacility$();
    const energyUseGroups = this.energyUseGroups$();
    const equipment = this.equipment$();
    //TODO: calanderized meters may not be correct units.
    const calanderizedMeters = this.calanderizedMeters$();
    const utilityMeterGroups = this.utilityMeterGroups$();
    const selectedYear = this.selectedYear();
    if (
      !energyUseGroups ||
      !equipment ||
      !calanderizedMeters ||
      !utilityMeterGroups ||
      !selectedYear ||
      !selectedFacility
    ) {
      return null;
    }
    return new EnergyFootprintAnnualFacilityBalance(
      selectedFacility,
      energyUseGroups,
      equipment,
      calanderizedMeters,
      utilityMeterGroups,
      selectedYear,
      "both"
    )
  });

  //set to latest year with full data by default, but allow user to select other years to view
  selectedYear = signal<number | null>(null);
  displayDataByGroup = signal<boolean>(false);

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
