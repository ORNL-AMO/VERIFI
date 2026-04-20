import { Component, computed, effect, inject, signal, Signal, WritableSignal } from '@angular/core';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { ActivatedRoute, Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityEnergyUseEquipmentDbService } from 'src/app/indexedDB/facility-energy-use-equipment-db.service';
import { IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { toSignal } from '@angular/core/rxjs-interop';
import { EnergyFootprintAnnualEquipmentGroupSummary } from 'src/app/calculations/energy-footprint/energyBalance/energyFootprintAnnualEquipmentGroupSummary';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { getYearsWithFullData } from 'src/app/calculations/shared-calculations/calculationsHelpers';

@Component({
  selector: 'app-facility-energy-uses-group-footprint',
  standalone: false,
  templateUrl: './facility-energy-uses-group-footprint.component.html',
  styleUrl: './facility-energy-uses-group-footprint.component.css',
})
export class FacilityEnergyUsesGroupFootprintComponent {

  private activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private router: Router = inject(Router);
  private facilityEnergyUseEquipmentDbService: FacilityEnergyUseEquipmentDbService = inject(FacilityEnergyUseEquipmentDbService);
  private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService = inject(FacilityEnergyUseGroupsDbService);
  private calanderizationService = inject(CalanderizationService);

  facilityEnergyUseEquipment$: Signal<Array<IdbFacilityEnergyUseEquipment>> = toSignal(this.facilityEnergyUseEquipmentDbService.facilityEnergyUseEquipment, { initialValue: [] });
  selectedFacility$: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility, { initialValue: null });
  calanderizedMeters$: Signal<Array<CalanderizedMeter>> = toSignal(this.calanderizationService.calanderizedMeters, { initialValue: [] });


  yearOptions: Signal<Array<number>> = computed(() => {
    const calanderizedMeters = this.calanderizedMeters$();
    const selectedFacility = this.selectedFacility$();
    if (calanderizedMeters.length === 0 || !selectedFacility) {
      return [];
    }
    return getYearsWithFullData(calanderizedMeters, selectedFacility);
  });

  energyFootprintAnnualEquipmentGroupSummary$: Signal<EnergyFootprintAnnualEquipmentGroupSummary> = computed(() => {
    const energyUseGroup = this.energyUseGroup();
    const equipment = this.facilityEnergyUseEquipment$();
    const selectedYear = this.selectedYear();
    const selectedFacility = this.selectedFacility$();
    if (!energyUseGroup || equipment.length === 0 || !selectedYear || !selectedFacility) {
      return null;
    }
    return new EnergyFootprintAnnualEquipmentGroupSummary(energyUseGroup, equipment, selectedYear, selectedFacility);
  });
  get energyFootprintAnnualEquipmentGroupSummary(): EnergyFootprintAnnualEquipmentGroupSummary {
    return this.energyFootprintAnnualEquipmentGroupSummary$();
  }

  energyUseGroup: WritableSignal<IdbFacilityEnergyUseGroup> = signal<IdbFacilityEnergyUseGroup>(null);
  selectedYear: WritableSignal<number | null> = signal<number | null>(null);

  constructor() {
    effect(() => {
      this.activatedRoute.paramMap.subscribe(params => {
        // handle params
        let groupId: string = params.get('id');
        let energyUseGroup = this.facilityEnergyUseGroupsDbService.getByGuid(groupId);
        if (energyUseGroup) {
          this.energyUseGroup.set(energyUseGroup);
        } else {
          this.goToGroupList();
        }
      });
    });

    // Automatically set selectedYear to the last year in yearOptions when yearOptions changes
    effect(() => {
      const options = this.yearOptions();
      if (options.length > 0 && !options.includes(this.selectedYear()!)) {
        this.selectedYear.set(options[options.length - 1]);
      }
    });
  }

  goToGroupList() {
    this.router.navigateByUrl('/data-management/' + this.selectedFacility$().accountId + '/facilities/' + this.selectedFacility$().guid + '/energy-uses');
  }

  goToFacilityFootprint() {
    this.router.navigateByUrl('/data-management/' + this.selectedFacility$().accountId + '/facilities/' + this.selectedFacility$().guid + '/energy-uses/footprint');
  }
}
