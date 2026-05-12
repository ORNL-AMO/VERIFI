import { Component, computed, inject, Signal, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, from, map, Observable, of, switchAll, take } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityEnergyUseEquipmentDbService } from 'src/app/indexedDB/facility-energy-use-equipment-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import * as _ from 'lodash';
import { getYearsWithFullData } from 'src/app/calculations/shared-calculations/calculationsHelpers';
import { toSignal } from '@angular/core/rxjs-interop';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { RouterGuardService } from 'src/app/shared/shared-router-guard-modal/router-guard-service';

@Component({
  selector: 'app-facility-energy-use-equipment',
  standalone: false,
  templateUrl: './facility-energy-use-equipment.component.html',
  styleUrl: './facility-energy-use-equipment.component.css'
})
export class FacilityEnergyUseEquipmentComponent {

  private activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private router: Router = inject(Router);
  private facilityEnergyUseEquipmentDbService: FacilityEnergyUseEquipmentDbService = inject(FacilityEnergyUseEquipmentDbService);
  private sharedDataService: SharedDataService = inject(SharedDataService);
  private loadingService: LoadingService = inject(LoadingService);
  private accountDbService: AccountdbService = inject(AccountdbService);
  private dbChangesService: DbChangesService = inject(DbChangesService);
  private toastNotificationsService: ToastNotificationsService = inject(ToastNotificationsService);
  private calanderizationService: CalanderizationService = inject(CalanderizationService);
  private routerGuardService: RouterGuardService = inject(RouterGuardService);

  energyUseEquipmentSignal: WritableSignal<IdbFacilityEnergyUseEquipment> = signal<IdbFacilityEnergyUseEquipment>(null);
  get energyUseEquipment(): IdbFacilityEnergyUseEquipment {
    return this.energyUseEquipmentSignal();
  }
  set energyUseEquipment(value: IdbFacilityEnergyUseEquipment) {
    this.energyUseEquipmentSignal.set(value);
  }

  selectedFacility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility, { initialValue: null });
  calanderizedMeters: Signal<Array<CalanderizedMeter>> = toSignal(this.calanderizationService.calanderizedMeters, { initialValue: [] });

  showDeleteEquipment: boolean = false;
  dataChanged: boolean = false;
  showNoLongerInUseModal: boolean = false;
  showReinstateEquipmentModal: boolean = false;

  selectedYear: number;
  yearOptions: Signal<Array<number>> = computed(() => {
    const calanderizedMeters = this.calanderizedMeters();
    const selectedFacility = this.selectedFacility();
    if (calanderizedMeters.length === 0 || !selectedFacility) {
      return [];
    }
    return getYearsWithFullData(calanderizedMeters, selectedFacility);
  });

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let equipmentId: string = params['equipmentId'];
      let energyUseEquipment: IdbFacilityEnergyUseEquipment = this.facilityEnergyUseEquipmentDbService.getByGuid(equipmentId);
      if (energyUseEquipment) {
        //create copy
        this.energyUseEquipment = _.cloneDeep(energyUseEquipment);
        this.dataChanged = false;
      } else {
        this.goToGroupList();
      }
    });
  }

  async saveChanges() {
    this.loadingService.setLoadingMessage('Saving Meter...');
    this.loadingService.setLoadingStatus(true);
    await firstValueFrom(this.facilityEnergyUseEquipmentDbService.updateWithObservable(this.energyUseEquipment));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setAccountFacilityEnergyUseEquipment(selectedAccount, selectedFacility);
    this.loadingService.setLoadingStatus(false);
    this.dataChanged = false;
  }

  showDelete() {
    this.sharedDataService.modalOpen.next(true);
    this.showDeleteEquipment = true;
  }

  cancelDelete() {
    this.sharedDataService.modalOpen.next(false);
    this.showDeleteEquipment = false;
  }

  async deleteEquipment() {
    this.dataChanged = false;
    this.showDeleteEquipment = false;
    this.loadingService.setLoadingMessage('Deleting Energy Use Equipment...')
    this.loadingService.setLoadingStatus(true);
    //delete equipment
    await firstValueFrom(this.facilityEnergyUseEquipmentDbService.deleteWithObservable(this.energyUseEquipment.id));
    //set equipment
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountFacilityEnergyUseEquipment(account, selectedFacility);
    this.cancelDelete();
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationsService.showToast("Energy Use Equipment Deleted", undefined, undefined, false, "alert-success");
    this.goToGroupList();
  }

  goToGroupList() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/data-management/' + selectedFacility.accountId + '/facilities/' + selectedFacility.guid + '/energy-uses/' + this.energyUseEquipment.energyUseGroupId);
  }


  canDeactivate(): Observable<boolean> {
    if (this.dataChanged) {
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

  setDataChanged(updatedEquipment: IdbFacilityEnergyUseEquipment) {
    this.energyUseEquipment = updatedEquipment;
    this.dataChanged = true;
  }

  openNoLongerInUse() {
    let yearOptions = this.yearOptions();
    this.selectedYear = yearOptions[yearOptions.length - 1];
    this.sharedDataService.modalOpen.next(true);
    this.showNoLongerInUseModal = true;
  }

  closeNoLongerInUse() {
    this.sharedDataService.modalOpen.next(false);
    this.showNoLongerInUseModal = false;
  }

  async markNoLongerInUse() {
    if (!this.energyUseEquipment.noLongerInUse) {
      this.energyUseEquipment['noLongerInUse'] = {
        isNoLongerInUse: true,
        year: this.selectedYear
      }
    } else {

      this.energyUseEquipment.noLongerInUse = {
        isNoLongerInUse: true,
        year: this.selectedYear
      }
    }
    await this.saveChanges();
    this.closeNoLongerInUse();
  }

  openReinstateEquipment() {
    this.sharedDataService.modalOpen.next(true);
    this.showReinstateEquipmentModal = true;
  }

  closeReinstateEquipment() {
    this.sharedDataService.modalOpen.next(false);
    this.showReinstateEquipmentModal = false;
  }

  async reinstateEquipment() {
    if (this.energyUseEquipment.noLongerInUse) {
      this.energyUseEquipment.noLongerInUse.isNoLongerInUse = false;
      this.energyUseEquipment.noLongerInUse.year = null;
      await this.saveChanges();
    }
    this.closeReinstateEquipment();
  }
}
