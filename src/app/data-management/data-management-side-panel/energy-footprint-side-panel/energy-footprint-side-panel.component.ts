import { Component, computed, signal, inject, Signal, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { EnergyFootprintAnnualFacilityBalance } from 'src/app/calculations/energy-footprint/energyBalance/energyFootprintAnnualFacilityBalance';
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
  private router: Router = inject(Router);

  facilities: Signal<Array<IdbFacility>> = toSignal(this.facilityDbService.accountFacilities, { initialValue: [] });
  energyUseGroups: Signal<Array<IdbFacilityEnergyUseGroup>> = toSignal(this.facilityEnergyUseGroupsDbService.accountEnergyUseGroups, { initialValue: [] });
  equipment: Signal<Array<IdbFacilityEnergyUseEquipment>> = toSignal(this.facilityEnergyUseEquipmentDbService.accountEnergyUseEquipment, { initialValue: [] });
  calanderizedMeters: Signal<Array<CalanderizedMeter>> = toSignal(this.calanderizationService.calanderizedMeters, { initialValue: [] });
  utilityMeterGroups: Signal<Array<IdbUtilityMeterGroup>> = toSignal(this.utilityMeterGroupDbService.accountMeterGroups, { initialValue: [] });
  selectedFacility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility, { initialValue: null });

  yearOptions: Signal<Array<number>> = computed(() => {
    const calanderizedMeters = this.calanderizedMeters();
    const facilities = this.facilities();
    if (calanderizedMeters.length === 0 || facilities.length === 0) {
      return [];
    }
    return getYearsWithFullDataAccount(calanderizedMeters, facilities);
  });

  //TODO: potentially make a web worker for this or optimize number of calls 
  //so as data changes it doesn't have to recalculate everything if not necessary. 
  //TODO: add loading logic during calculation
  energyFootprintAnnualFacilityBalance$: Signal<EnergyFootprintAnnualFacilityBalance> = computed(() => {
    const facilities = this.facilities();
    const energyUseGroups = this.energyUseGroups();
    const equipment = this.equipment();
    const calanderizedMeters = this.calanderizedMeters();
    const utilityMeterGroups = this.utilityMeterGroups();
    const selectedYear = this.selectedYear();
    const selectedFacilityId = this.selectedFacilityId();
    if (
      !energyUseGroups ||
      !equipment ||
      !calanderizedMeters ||
      !utilityMeterGroups ||
      !selectedYear ||
      !selectedFacilityId
    ) {
      return null;
    }
    const selectedFacility = facilities.find(facility => facility.guid === selectedFacilityId);
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
  selectedFacilityId = signal<string | null>(null);
  displayDataByGroup = signal<boolean>(false);

  private _lastSelectedFacilityGuid: string | null = null;

  constructor() {
    // Automatically set selectedYear to the last year in yearOptions when yearOptions changes
    effect(() => {
      const options = this.yearOptions();
      if (options.length > 0 && !options.includes(this.selectedYear()!)) {
        this.selectedYear.set(options[options.length - 1]);
      }
    });
    // Automatically set selectedFacilityId to the first facility when facilities change
    effect(() => {
      const facilities = this.facilities();
      if (facilities.length > 0 && !facilities.find(facility => facility.guid === this.selectedFacilityId())) {
        this.selectedFacilityId.set(facilities[0].guid);
      }
    });
    // Update selectedFacilityId when selectedFacility changes to a different facility
    effect(() => {
      const guid = this.selectedFacility()?.guid ?? null;
      if (guid !== this._lastSelectedFacilityGuid) {
        this._lastSelectedFacilityGuid = guid;
        if (guid) {
          this.selectedFacilityId.set(guid);
        }
      }
    });
  }

  goToFacilityFootprint() {
    const selectedFacilityId = this.selectedFacilityId();
    const selectedFacility = this.facilityDbService.getFacilityById(selectedFacilityId);
    if (selectedFacility) {
      this.router.navigateByUrl('/data-management/' + selectedFacility.accountId + '/facilities/' + selectedFacilityId + '/energy-uses/footprint');
    }
  }
}
