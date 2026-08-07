import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { MeterCommandHandler } from 'src/app/account-workspace/handlers/meter-command-handler.service';
import { Component, inject, Injector } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { from, map, Observable, of, Subscription, switchAll, take } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { EditMeterFormService } from 'src/app/shared/shared-meter-content/edit-meter-form/edit-meter-form.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData, updateMeterDataCharges } from 'src/app/models/idbModels/utilityMeterData';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { RouterGuardService } from 'src/app/shared/shared-router-guard-modal/router-guard-service';

@Component({
  selector: 'app-facility-meter',
  templateUrl: './facility-meter.component.html',
  styleUrl: './facility-meter.component.css',
  standalone: false,
  host: {
    '(window:keydown)': 'handleKeyDown($event)'
  }
})
export class FacilityMeterComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  facility: IdbFacility;
  facilitySub: Subscription;


  utilityMeter: IdbUtilityMeter;
  meterForm: FormGroup;
  showDeleteMeter: boolean = false;
  meterDataExists: boolean = false;

  async handleKeyDown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      if (!this.meterForm.invalid && !this.meterForm.pristine) {
        await this.saveChanges();
      }
    }
  }

  constructor(
    private activatedRoute: ActivatedRoute,
    private commandBoundary: WorkspaceCommandBoundary,
    private meterHandler: MeterCommandHandler,
    private editMeterFormService: EditMeterFormService,
    private router: Router,
    private sharedDataService: SharedDataService,
    private toastNotificationsService: ToastNotificationsService,
    private loadingService: LoadingService,
    private toastNotificationService: ToastNotificationsService,
    private routerGuardService: RouterGuardService,
    private injector: Injector

  ) {

  }

  ngOnInit() {
    this.facilitySub = toObservable(this.accountWorkspaceStore.selectedFacility, { injector: this.injector }).subscribe(facility => {
      this.facility = facility;
    });

    this.activatedRoute.params.subscribe(params => {
      let meterId: string = params['id'];
      this.utilityMeter = this.accountWorkspaceQuery.getMeterByGuid(meterId);
      if (this.utilityMeter) {
        this.accountWorkspaceService.selectMeter((this.utilityMeter)?.guid);
        this.meterForm = this.editMeterFormService.getFormFromMeter(this.utilityMeter);
        let meterData: Array<IdbUtilityMeterData> = this.accountWorkspaceQuery.getMeterData(this.utilityMeter.guid);
        if (meterData.length != 0 && this.meterForm.valid) {
          this.meterDataExists = true;
          this.meterForm.controls.source.disable();
          this.meterForm.controls.startingUnit.disable();
          this.meterForm.controls.phase.disable();
          this.meterForm.controls.fuel.disable();
          this.meterForm.controls.heatCapacity.disable();
          this.meterForm.controls.energyUnit.disable();

          this.meterForm.controls.scope.disable();

          this.meterForm.controls.waterIntakeType.disable();
          this.meterForm.controls.waterDischargeType.disable();

          this.meterForm.controls.vehicleCategory.disable();
          this.meterForm.controls.vehicleType.disable();
          this.meterForm.controls.vehicleCollectionType.disable();
          this.meterForm.controls.vehicleCollectionUnit.disable();
          this.meterForm.controls.vehicleFuel.disable();
          this.meterForm.controls.vehicleFuelEfficiency.disable();
          this.meterForm.controls.vehicleDistanceUnit.disable();
        }
      } else {
        this.goToMeterList();
      }
    });
  }

  ngOnDestroy() {
    this.facilitySub.unsubscribe();
    this.accountWorkspaceService.selectMeter(undefined);
  }

  async saveChanges() {
    this.loadingService.setLoadingMessage('Saving Meter...');
    this.loadingService.setLoadingStatus(true);
    this.meterForm.markAsPristine();
    this.utilityMeter = this.accountWorkspaceQuery.getMeterByGuid(this.utilityMeter.guid);
    this.utilityMeter = this.editMeterFormService.updateMeterFromForm(this.utilityMeter, this.meterForm);
    const accountGuid = this.accountWorkspaceStore.account()?.guid;
    const meter = this.utilityMeter;
    const meterDataUpdates = this.getMeterDataUpdates(meter);
    await this.commandBoundary.execute(
      { entityKind: 'meter', changeKind: 'update', entityGuid: meter.guid, label: 'Save Meter' },
      () => this.meterHandler.updateMeterWithData(meter, meterDataUpdates, accountGuid)
    );
    this.loadingService.setLoadingStatus(false);
    if (meterDataUpdates.length > 0) {
      this.toastNotificationService.showToast("Meter and Meter Data Updated", undefined, undefined, false, "alert-success");
    }
  }

  private getMeterDataUpdates(meter: IdbUtilityMeter): Array<IdbUtilityMeterData> {
    this.loadingService.setLoadingMessage('Updating Meter Data...')
    const meterData = structuredClone(this.accountWorkspaceQuery.getMeterData(meter.guid));
    return updateMeterDataCharges(meter, meterData);
  }

  showDelete() {
    this.sharedDataService.modalOpen.next(true);
    this.showDeleteMeter = true;
  }

  cancelDelete() {
    this.sharedDataService.modalOpen.next(false);
    this.showDeleteMeter = false;
  }

  async deleteMeter() {
    this.showDeleteMeter = false;
    this.meterForm.markAsPristine();
    this.loadingService.setLoadingMessage('Deleting Meters and Data...')
    this.loadingService.setLoadingStatus(true);
    const meter = this.utilityMeter;
    const accountGuid = this.accountWorkspaceStore.account()?.guid;
    const meterData: Array<IdbUtilityMeterData> = this.accountWorkspaceQuery.getMeterData(meter.guid);
    await this.commandBoundary.execute(
      { entityKind: 'meter', changeKind: 'delete', entityGuid: meter.guid, label: 'Delete Meter and Data' },
      async () => {
        await this.meterHandler.deleteMeter(meter, accountGuid);
        for (const data of meterData) {
          await this.meterHandler.deleteMeterData(data.id);
        }
      }
    );
    this.cancelDelete();
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationsService.showToast("Meter and Meter Data Deleted", undefined, undefined, false, "alert-success");
    this.goToMeterList();
  }

  goToMeterList() {
    let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    this.router.navigateByUrl('/data-management/' + selectedFacility.accountId + '/facilities/' + selectedFacility.guid + '/meters')
  }

  goToMeterData() {
    this.router.navigateByUrl('/data-management/' + this.utilityMeter.accountId + '/facilities/' + this.utilityMeter.facilityId + '/meters/' + this.utilityMeter.guid + '/meter-data');
  }

  canDeactivate(): Observable<boolean> {
    if (this.meterForm && this.meterForm.dirty) {
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
}
