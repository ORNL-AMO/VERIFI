import { Component, computed, inject, signal, Signal, WritableSignal } from '@angular/core';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { ActivatedRoute, Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityEnergyUseEquipmentDbService } from 'src/app/indexedDB/facility-energy-use-equipment-db.service';
import { IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
import { EnergyUsesGroupSummary } from 'src/app/calculations/energy-footprint/energyUsesGroupSummary';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-facility-energy-uses-group-summary',
  standalone: false,
  templateUrl: './facility-energy-uses-group-summary.component.html',
  styleUrl: './facility-energy-uses-group-summary.component.css'
})
export class FacilityEnergyUsesGroupSummaryComponent {
  private activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private router: Router = inject(Router);
  private facilityEnergyUseEquipmentDbService: FacilityEnergyUseEquipmentDbService = inject(FacilityEnergyUseEquipmentDbService);
  private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService = inject(FacilityEnergyUseGroupsDbService);

  facilityEnergyUseEquipment$: Signal<Array<IdbFacilityEnergyUseEquipment>> = toSignal(this.facilityEnergyUseEquipmentDbService.facilityEnergyUseEquipment, { initialValue: [] });

  energyUseGroup$: WritableSignal<IdbFacilityEnergyUseGroup> = signal<IdbFacilityEnergyUseGroup>(null);
  get energyUseGroup(): IdbFacilityEnergyUseGroup {
    return this.energyUseGroup$();
  }

  facility$: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility, { initialValue: null });
  get facility(): IdbFacility {
    return this.facility$();
  }

  energyUsesGroupSummary$: Signal<EnergyUsesGroupSummary> = computed(() => {
    const energyUseGroup = this.energyUseGroup$();
    const facilityEnergyUseEquipment = this.facilityEnergyUseEquipment$();
    const facility = this.facility$();
    if (!energyUseGroup || !facility) {
      return null;
    }
    return new EnergyUsesGroupSummary(energyUseGroup, facilityEnergyUseEquipment, facility)
  });
  get energyUsesGroupSummary(): EnergyUsesGroupSummary {
    return this.energyUsesGroupSummary$();
  }

  displayHistory: boolean = false;

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let groupId: string = params['id'];
      let energyUseGroup = this.facilityEnergyUseGroupsDbService.getByGuid(groupId);
      if (energyUseGroup) {
        this.energyUseGroup$.set(energyUseGroup);
      } else {
        this.goToGroupList();
      }
    });
  }

  goToGroupList() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/data-management/' + selectedFacility.accountId + '/facilities/' + selectedFacility.guid + '/energy-uses');
  }

  goToEquipment(equipmentGuid: string) {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/data-management/' + selectedFacility.accountId + '/facilities/' + selectedFacility.guid + '/energy-uses/' + this.energyUseGroup.guid + '/equipment/' + equipmentGuid);
  }
}
