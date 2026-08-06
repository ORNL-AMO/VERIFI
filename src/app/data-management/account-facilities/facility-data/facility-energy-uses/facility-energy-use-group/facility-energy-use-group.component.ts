import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { EnergyUseCommandHandler } from 'src/app/account-workspace/handlers/energy-use-command-handler.service';
import { Component, inject, Signal, computed } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { from, map, Observable, of, switchAll, take } from 'rxjs';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';
import { FacilityEnergyUseGroupFormService } from './facility-energy-use-group-form.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { AllSources, MeterSource } from 'src/app/models/constantsAndTypes';
import { getNewIdbFacilityEnergyUseEquipment, IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { RouterGuardService } from 'src/app/shared/shared-router-guard-modal/router-guard-service';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { getLatestYearWithData } from 'src/app/calculations/shared-calculations/calculationsHelpers';

@Component({
  selector: 'app-facility-energy-use-group',
  standalone: false,
  templateUrl: './facility-energy-use-group.component.html',
  styleUrl: './facility-energy-use-group.component.css'
})
export class FacilityEnergyUseGroupComponent {
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly energyUseHandler = inject(EnergyUseCommandHandler);
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  private router: Router = inject(Router);
  private facilityEnergyUseGroupFormService: FacilityEnergyUseGroupFormService = inject(FacilityEnergyUseGroupFormService);
  private sharedDataService: SharedDataService = inject(SharedDataService);
  private loadingService: LoadingService = inject(LoadingService);
  private toastNotificationsService: ToastNotificationsService = inject(ToastNotificationsService);
  private routerGuardService: RouterGuardService = inject(RouterGuardService);
  private calanderizationService: CalanderizationService = inject(CalanderizationService);

  facilityEnergyUseEquipment: Signal<Array<IdbFacilityEnergyUseEquipment>> = computed(() => [...this.accountWorkspaceStore.facilityEnergyUseEquipment()]);
  facilityEnergyUseGroups: Signal<Array<IdbFacilityEnergyUseGroup>> = computed(() => [...this.accountWorkspaceStore.facilityEnergyUseGroups()]);

  get hasSelectedEquipment(): boolean {
    return this.facilityEnergyUseEquipment().some(equip => equip.selected);
  }

  get selectedEquipment(): Array<IdbFacilityEnergyUseEquipment> {
    return this.facilityEnergyUseEquipment().filter(equip => equip.selected);
  }

  get transferGroupOptions(): Array<IdbFacilityEnergyUseGroup> {
    let currentGroupId = this.energyUseGroup.guid;
    return this.facilityEnergyUseGroups().filter(group => group.guid !== currentGroupId);
  }


  energyUseGroup: IdbFacilityEnergyUseGroup;
  form: FormGroup;
  showDeleteGroup: boolean = false;
  sourceOptions: Array<MeterSource> = AllSources;
  showBulkTransfer: boolean = false;
  showBulkDelete: boolean = false;
  selectedTransferGroupId: string;

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let groupId: string = params['id'];
      this.energyUseGroup = this.accountWorkspaceQuery.getEnergyUseGroupByGuid(groupId);
      if (this.energyUseGroup) {
        this.form = this.facilityEnergyUseGroupFormService.getFormFromEnergyUseGroup(this.energyUseGroup);
      } else {
        this.goToGroupList();
      }
    });
  }

  async saveChanges() {
    this.loadingService.setLoadingMessage('Saving Meter...');
    this.loadingService.setLoadingStatus(true);
    this.form.markAsPristine();
    this.energyUseGroup = this.facilityEnergyUseGroupFormService.updateEnergyUseGroupFromForm(this.energyUseGroup, this.form);
    const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
    await this.commandBoundary.execute(
      { entityKind: 'energyUseGroup', changeKind: 'update', entityGuid: this.energyUseGroup.guid, label: 'Saving energy use group' },
      () => this.energyUseHandler.updateGroup(this.energyUseGroup, activeAccountGuid)
    );
    this.loadingService.setLoadingStatus(false);
  }

  showDelete() {
    this.sharedDataService.modalOpen.next(true);
    this.showDeleteGroup = true;
  }

  cancelDelete() {
    this.sharedDataService.modalOpen.next(false);
    this.showDeleteGroup = false;
  }

  async deleteGroup() {
    this.showDeleteGroup = false;
    this.form.markAsPristine();
    this.loadingService.setLoadingMessage('Deleting Energy Use Group...')
    this.loadingService.setLoadingStatus(true);
    const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
    const groupEquipment = this.facilityEnergyUseEquipment().filter(e => e.energyUseGroupId === this.energyUseGroup.guid);
    const group = this.energyUseGroup;
    await this.commandBoundary.execute(
      { entityKind: 'energyUseGroup', changeKind: 'delete', label: 'Deleting energy use group' },
      async () => {
        for (const equipment of groupEquipment) {
          await this.energyUseHandler.deleteEquipment(equipment, activeAccountGuid);
        }
        return this.energyUseHandler.deleteGroup(group, activeAccountGuid);
      }
    );
    this.cancelDelete();
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationsService.showToast("Energy Use Group Deleted", undefined, undefined, false, "alert-success");
    this.goToGroupList();
  }

  goToGroupList() {
    let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    this.router.navigateByUrl('/data-management/' + selectedFacility.accountId + '/facilities/' + selectedFacility.guid + '/energy-uses')
  }

  canDeactivate(): Observable<boolean> {
    if (this.form && this.form.dirty) {
      this.routerGuardService.setShowSave(true);
      this.routerGuardService.setShowModal(true);
      return this.routerGuardService.getModalAction().pipe(map(action => {
        if (action == 'save') {
          return from(this.saveChanges()).pipe(map(() => true));
        } else if (action == 'discard') {
          return of(true);
        }
        return of(false);
      }),
        take(1), switchAll());
    }
    return of(true);
  }

  async addEquipment() {
    let calanderizedMeters: Array<CalanderizedMeter> = this.calanderizationService.calanderizedMeters.getValue();
    let facility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    let latestYear: number = getLatestYearWithData(calanderizedMeters, [facility]);
    let newEquipment: IdbFacilityEnergyUseEquipment = getNewIdbFacilityEnergyUseEquipment(this.energyUseGroup, latestYear);
    await this.commandBoundary.execute(
      { entityKind: 'energyUseEquipment', changeKind: 'add', label: 'Adding energy use equipment' },
      () => this.energyUseHandler.addEquipment(newEquipment)
    );
    let account: IdbAccount = this.accountWorkspaceStore.account();
    this.router.navigateByUrl('data-management/' + account.guid + '/facilities/' + facility.guid + '/energy-uses/' + this.energyUseGroup.guid + '/equipment/' + newEquipment.guid);
  }

  openBulkTransfer() {
    this.showBulkTransfer = true;
  }

  async confirmBulkTransfer() {
    this.loadingService.setLoadingMessage('Transferring Equipment...');
    this.loadingService.setLoadingStatus(true);
    const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
    let _selectedEquipment: Array<IdbFacilityEnergyUseEquipment> = this.selectedEquipment.map(equipment => { return { ...equipment } });
    for (let i = 0; i < _selectedEquipment.length; i++) {
      _selectedEquipment[i].energyUseGroupId = this.selectedTransferGroupId;
      _selectedEquipment[i].selected = false;
    }
    await this.commandBoundary.execute(
      { entityKind: 'energyUseEquipment', changeKind: 'bulk', label: 'Transferring equipment' },
      async () => {
        for (const equipment of _selectedEquipment) {
          await this.energyUseHandler.updateEquipment(equipment, activeAccountGuid);
        }
      }
    );
    this.showBulkTransfer = false;
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationsService.showToast("Equipment Transferred", undefined, undefined, false, "alert-success");
  }

  cancelBulkTransfer() {
    let facilityEnergyUseEquipment = this.facilityEnergyUseEquipment();
    for (let i = 0; i < facilityEnergyUseEquipment.length; i++) {
      facilityEnergyUseEquipment[i].selected = false;
    }
    this.showBulkTransfer = false;
  }

  openBulkDelete() {
    this.showBulkDelete = true;
  }

  async confirmBulkDelete() {
    this.loadingService.setLoadingMessage('Deleting Equipment...');
    this.loadingService.setLoadingStatus(true);
    const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
    const toDelete = this.selectedEquipment.slice();
    await this.commandBoundary.execute(
      { entityKind: 'energyUseEquipment', changeKind: 'bulk', label: 'Deleting equipment' },
      async () => {
        for (const equipment of toDelete) {
          await this.energyUseHandler.deleteEquipment(equipment, activeAccountGuid);
        }
      }
    );
    this.showBulkDelete = false;
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationsService.showToast("Equipment Deleted", undefined, undefined, false, "alert-success");
  }

  cancelBulkDelete() {
    let facilityEnergyUseEquipment = this.facilityEnergyUseEquipment();
    for (let i = 0; i < facilityEnergyUseEquipment.length; i++) {
      facilityEnergyUseEquipment[i].selected = false;
    }
    this.showBulkDelete = false;
  }
}
