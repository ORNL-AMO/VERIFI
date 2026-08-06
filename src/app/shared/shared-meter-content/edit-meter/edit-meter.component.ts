import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, OnInit, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { EditMeterFormService } from '../edit-meter-form/edit-meter-form.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, firstValueFrom, from, map, of, switchAll, take } from 'rxjs';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { getNewIdbUtilityMeter, IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData, updateMeterDataCharges } from 'src/app/models/idbModels/utilityMeterData';
import { RouterGuardService } from '../../shared-router-guard-modal/router-guard-service';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { MeterCommandHandler } from 'src/app/account-workspace/handlers/meter-command-handler.service';

@Component({
  selector: 'app-edit-meter',
  templateUrl: './edit-meter.component.html',
  styleUrls: ['./edit-meter.component.css'],
  standalone: false,
  host: {
    '(window:keydown)': 'handleKeyDown($event)'
  }
})
export class EditMeterComponent implements OnInit {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  meterForm: FormGroup;
  meterDataExists: boolean;
  editMeter: IdbUtilityMeter;
  addOrEdit: 'add' | 'edit';
  selectedFacility: IdbFacility;

  handleKeyDown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      if(!this.meterForm.invalid) {
        this.saveChanges();
      }
    }
  }

  constructor(
    private editMeterFormService: EditMeterFormService,
    private loadingService: LoadingService,
    private toastNotificationService: ToastNotificationsService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private routerGuardService: RouterGuardService,
    private commandBoundary: WorkspaceCommandBoundary,
    private meterHandler: MeterCommandHandler
  ) { }

  ngOnInit(): void {
    this.selectedFacility = this.accountWorkspaceStore.selectedFacility();
    let facilityMeters: Array<IdbUtilityMeter> = [...this.accountWorkspaceStore.facilityMeters()];
    this.activatedRoute.params.subscribe(params => {
      let meterId: string = params['id'];
      if (meterId) {
        this.addOrEdit = 'edit';
        this.editMeter = facilityMeters.find(meter => { return meter.guid == meterId });
        this.meterForm = this.editMeterFormService.getFormFromMeter(this.editMeter);
        let meterData: Array<IdbUtilityMeterData> = this.accountWorkspaceQuery.getMeterData(this.editMeter.guid);
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
        this.addOrEdit = 'add';
        this.editMeter = getNewIdbUtilityMeter(this.selectedFacility.guid, this.selectedFacility.accountId, true, this.selectedFacility.electricityUnit);
        this.meterForm = this.editMeterFormService.getFormFromMeter(this.editMeter);
      }
    });
  }

  async saveChanges() {
    this.loadingService.setLoadingMessage('Saving Meter...');
    this.loadingService.setLoadingStatus(true);
    let meterToSave: IdbUtilityMeter = this.editMeterFormService.updateMeterFromForm(this.editMeter, this.meterForm);
    const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
    await this.commandBoundary.execute(
      { entityKind: 'meter', changeKind: this.addOrEdit === 'add' ? 'add' : 'update', label: 'Saving meter' },
      async () => {
        if (this.addOrEdit == 'edit') {
          await this.meterHandler.updateMeter(meterToSave, activeAccountGuid);
          await this.persistMeterDataUpdates(meterToSave);
        } else {
          delete meterToSave.id;
          meterToSave = await this.meterHandler.addMeter(meterToSave);
        }
        return meterToSave;
      }
    );
    this.meterForm.markAsPristine();
    this.cancel();
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Meter Saved!', undefined, undefined, false, "alert-success");
  }

  cancel() {
    let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    this.router.navigateByUrl('/data-evaluation/facility/' + selectedFacility.guid + '/utility/energy-consumption/energy-source/meters')
  }

  goToMeterData() {
    this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility.guid + '/utility/energy-consumption/utility-meter/' + this.editMeter.guid + '/data-table');
  }

  private async persistMeterDataUpdates(meter: IdbUtilityMeter): Promise<void> {
    this.loadingService.setLoadingMessage('Updating Meter Data...')
    const meterData: Array<IdbUtilityMeterData> = this.accountWorkspaceQuery.getMeterData(this.editMeter.guid);
    const dataNeedsUpdate: Array<IdbUtilityMeterData> = updateMeterDataCharges(meter, meterData);
    if (dataNeedsUpdate.length > 0) {
      for (const entry of dataNeedsUpdate) {
        await this.meterHandler.updateMeterData(entry, meter.accountId);
      }
      this.toastNotificationService.showToast("Meter and Meter Data Updated", undefined, undefined, false, "alert-success");
    }
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
