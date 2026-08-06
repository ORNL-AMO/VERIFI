import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { MeterCommandHandler } from 'src/app/account-workspace/handlers/meter-command-handler.service';
import { Component, OnInit, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { checkShowHeatCapacity, getIsEnergyMeter, getIsEnergyUnit } from 'src/app/shared/sharedHelperFunctions';
import { from, map, Observable, of, Subscription, switchAll, take } from 'rxjs';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { getNewIdbUtilityMeterData, IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { UtilityMeterDataService } from 'src/app/shared/shared-meter-content/utility-meter-data.service';
import { ElectronService } from 'src/app/electron/electron.service';
import { getDateFromMeterData, setMeterDataDateFromDate } from '../../dateHelperFunctions';
import { RouterGuardService } from '../../shared-router-guard-modal/router-guard-service';

@Component({
  selector: 'app-edit-bill',
  templateUrl: './edit-bill.component.html',
  styleUrls: ['./edit-bill.component.css'],
  standalone: false,
  host: {
    '(window:keydown)': 'handleKeyDown($event)'
  }
})
export class EditBillComponent implements OnInit {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  editMeterData: IdbUtilityMeterData;
  addOrEdit: 'add' | 'edit';
  editMeter: IdbUtilityMeter;
  meterDataForm: FormGroup;
  displayVolumeInput: boolean;
  displayEnergyUse: boolean;
  displayHeatCapacity: boolean;
  displayVehicleFuelEfficiency: boolean;
  invalidDate: boolean;
  showFilterDropdown: boolean = false;
  inDataManagement: boolean;
  paramsSub: Subscription;
  isElectron: boolean;

  handleKeyDown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      if (!this.meterDataForm.invalid && !this.invalidDate) {
        this.saveAndQuit();
      }
    }
  }

  constructor(
    private activatedRoute: ActivatedRoute,
    private commandBoundary: WorkspaceCommandBoundary,
    private meterHandler: MeterCommandHandler,
    private loadingService: LoadingService,
    private utilityMeterDataService: UtilityMeterDataService,
    private toastNotificationService: ToastNotificationsService,
    private router: Router,
    private electronService: ElectronService,
    private routerGuardService: RouterGuardService
  ) { }

  ngOnInit(): void {
    this.setInDataManagement();
    this.isElectron = this.electronService.isElectron;
    this.paramsSub = this.activatedRoute.parent.params.subscribe(parentParams => {
      let accountMeters: Array<IdbUtilityMeter> = [...this.accountWorkspaceStore.meters()];
      let meterId: string = parentParams['id'];
      this.editMeter = accountMeters.find(meter => { return meter.guid == meterId });
      this.setDisplayHeatCapacity();
      this.activatedRoute.params.subscribe(params => {
        let meterReadingId: string = params['id'];
        if (meterReadingId) {
          //existing reading
          this.addOrEdit = 'edit';
          let accountMeterData: Array<IdbUtilityMeterData> = [...this.accountWorkspaceStore.meterData()];
          this.editMeterData = accountMeterData.find(data => { return data.guid == meterReadingId });
        } else {
          //new Reading
          let accountMeterData: Array<IdbUtilityMeterData> = [...this.accountWorkspaceStore.meterData()];
          this.editMeterData = getNewIdbUtilityMeterData(this.editMeter, accountMeterData);
          this.addOrEdit = 'add';
        }
        if (this.editMeterData) {
          this.setMeterDataForm();
        }
      })
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }

  setInDataManagement() {
    this.inDataManagement = this.router.url.includes('data-management');
  }

  cancel() {
    let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    if (this.inDataManagement) {
      this.router.navigateByUrl('/data-management/' + this.editMeter.accountId + '/facilities/' + this.editMeter.facilityId + '/meters/' + this.editMeter.guid + '/meter-data');
    } else {
      this.router.navigateByUrl('/data-evaluation/facility/' + selectedFacility.guid + '/utility/energy-consumption/utility-meter/' + this.editMeter.guid + '/data-table');
    }
  }

  async saveAndQuit() {
    this.loadingService.setLoadingMessage('Saving Reading...');
    this.loadingService.setLoadingStatus(true);
    let meterDataToSave: IdbUtilityMeterData;
    if (this.editMeter.source == 'Electricity') {
      meterDataToSave = this.utilityMeterDataService.updateElectricityMeterDataFromForm(this.editMeterData, this.meterDataForm);
    } else {
      meterDataToSave = this.utilityMeterDataService.updateGeneralMeterDataFromForm(this.editMeterData, this.meterDataForm);
    }
    if (this.addOrEdit == 'edit') {
      const accountGuid = this.accountWorkspaceStore.account()?.guid;
      await this.commandBoundary.execute(
        { entityKind: 'meterData', changeKind: 'update', entityGuid: meterDataToSave.guid, label: 'Save Reading' },
        () => this.meterHandler.updateMeterData(meterDataToSave, accountGuid)
      );
    } else {
      delete meterDataToSave.id;
      await this.commandBoundary.execute(
        { entityKind: 'meterData', changeKind: 'add', label: 'Add Reading' },
        () => this.meterHandler.addMeterData(meterDataToSave)
      );
    }
    this.meterDataForm.markAsPristine();
    this.cancel();
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Reading Saved!', undefined, undefined, false, "alert-success");
  }

  async saveAndAddAnother() {
    this.loadingService.setLoadingMessage('Saving Reading...');
    this.loadingService.setLoadingStatus(true);
    let meterDataToSave: IdbUtilityMeterData;
    if (this.editMeter.source == 'Electricity') {
      meterDataToSave = this.utilityMeterDataService.updateElectricityMeterDataFromForm(this.editMeterData, this.meterDataForm);
    } else {
      meterDataToSave = this.utilityMeterDataService.updateGeneralMeterDataFromForm(this.editMeterData, this.meterDataForm);
    }
    delete meterDataToSave.id;
    const result = await this.commandBoundary.execute(
      { entityKind: 'meterData', changeKind: 'add', label: 'Add Reading' },
      () => this.meterHandler.addMeterData(meterDataToSave)
    );
    let accountMeterData: Array<IdbUtilityMeterData> = [...this.accountWorkspaceStore.meterData()];
    this.editMeterData = getNewIdbUtilityMeterData(this.editMeter, accountMeterData);
    let nextDate: Date = getDateFromMeterData(result.value);
    nextDate.setMonth(nextDate.getMonth() + 1);
    this.editMeterData = setMeterDataDateFromDate(this.editMeterData, nextDate);
    this.setMeterDataForm();
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Reading Saved!', undefined, undefined, false, "alert-success");
  }


  setMeterDataForm() {
    if (this.editMeter.source == 'Electricity') {
      this.meterDataForm = this.utilityMeterDataService.getElectricityMeterDataForm(this.editMeterData);
    } else if (this.editMeter.source == 'Other') {
      this.displayVolumeInput = (getIsEnergyUnit(this.editMeter.startingUnit) == false);
      this.displayEnergyUse = (getIsEnergyUnit(this.editMeter.startingUnit) == true);
      this.meterDataForm = this.utilityMeterDataService.getGeneralMeterDataForm(this.editMeterData, this.displayVolumeInput, this.displayEnergyUse, this.displayHeatCapacity, false, this.editMeter.source);
    } else {
      this.displayVolumeInput = (getIsEnergyUnit(this.editMeter.startingUnit) == false);
      this.displayEnergyUse = getIsEnergyMeter(this.editMeter.source);
      this.displayVehicleFuelEfficiency = (this.editMeter.scope == 2 && this.editMeter.vehicleCategory == 2);
      this.meterDataForm = this.utilityMeterDataService.getGeneralMeterDataForm(this.editMeterData, this.displayVolumeInput, this.displayEnergyUse, this.displayHeatCapacity, this.displayVehicleFuelEfficiency, this.editMeter.source);
      if (this.displayVolumeInput) {
        this.meterDataForm.controls.totalEnergyUse.disable();
      }
      if (this.displayHeatCapacity && this.meterDataForm.controls.heatCapacity.value == undefined) {
        this.meterDataForm.controls.heatCapacity.patchValue(this.editMeter.heatCapacity);
      }
    }
  }

  toggleFilterMenu() {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  canDeactivate(): Observable<boolean> {
    if (this.meterDataForm && this.meterDataForm.dirty) {
      this.routerGuardService.setShowSave(true);
      this.routerGuardService.setShowModal(true);
      return this.routerGuardService.getModalAction().pipe(map(action => {
        if (action == 'save') {
          return from(this.saveAndQuit()).pipe(map(() => true));
        } else if (action == 'discard') {
          return of(true);
        }
        return of(false);
      }),
        take(1), switchAll());
    }
    return of(true);
  }

  setDisplayHeatCapacity() {
    this.displayHeatCapacity = checkShowHeatCapacity(this.editMeter.source, this.editMeter.startingUnit, this.editMeter.scope);
  }
}
