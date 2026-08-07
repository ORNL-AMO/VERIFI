import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { MeterCommandHandler } from 'src/app/account-workspace/handlers/meter-command-handler.service';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { from, map, Observable, of, switchAll, take } from 'rxjs';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { getIsEnergyMeter } from 'src/app/shared/sharedHelperFunctions';
import * as _ from 'lodash';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { RouterGuardService } from 'src/app/shared/shared-router-guard-modal/router-guard-service';

@Component({
  selector: 'app-meter-group-form',
  standalone: false,
  templateUrl: './meter-group-form.component.html',
  styleUrl: './meter-group-form.component.css',
  host: {
    '(window:keydown)': 'handleKeyDown($event)'
  }
})
export class MeterGroupFormComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  groupForm: FormGroup;
  meterGroupOptions: Array<MeterGroupOption>;
  selectionsChanged: boolean = false;
  hasExistingGroups: boolean = false;
  meterGroup: IdbUtilityMeterGroup;
  hasEnergyMeters: boolean;
  hasWaterMeters: boolean;

  showDeleteModal: boolean = false;
  inDataManagement: boolean = false;

  async handleKeyDown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      if ((!this.groupForm.invalid && !this.groupForm.pristine) || this.selectionsChanged) {
        await this.saveChanges();
        if (!this.inDataManagement) {
          this.cancel();
        }
      }
    }
  }

  constructor(
    private commandBoundary: WorkspaceCommandBoundary,
    private meterHandler: MeterCommandHandler,
    private formBuilder: FormBuilder,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private loadingService: LoadingService,
    private toastNoticationService: ToastNotificationsService,
    private accountReportDbService: AccountReportDbService,
    private analysisDbService: AnalysisDbService,
    private routerGuardService: RouterGuardService
  ) {

  }

  ngOnInit() {
    this.setInDataManagement();
    this.setHasMetersBools();
    this.activatedRoute.params.subscribe(params => {
      let meterGroupId: string = params['id'];
      this.meterGroup = this.accountWorkspaceQuery.getMeterGroupByGuid(meterGroupId);
      if (!this.meterGroup) {
        this.cancel();
      } else {
        this.groupForm = this.formBuilder.group({
          name: [this.meterGroup.name, Validators.required],
          groupType: [this.meterGroup.groupType, Validators.required],
          description: [this.meterGroup.description]
        });
        this.setGroupOptions();
        //existing group
        if (this.meterGroupOptions.some(option => { return option.includeInGroup })) {
          this.groupForm.controls['groupType'].disable();
        }
        this.hasExistingGroups = this.meterGroupOptions.find(option => { return option.inAnotherGroup }) != undefined;
      }
    });
  }

  setInDataManagement() {
    this.inDataManagement = this.router.url.includes('data-management');
  }

  cancel() {
    this.router.navigate(['../..'], { relativeTo: this.activatedRoute });
  }

  setHasMetersBools() {
    let meters: Array<IdbUtilityMeter> = [...this.accountWorkspaceStore.facilityMeters()];
    this.hasEnergyMeters = meters.find(meter => { return meter.includeInEnergy }) != undefined;
    this.hasWaterMeters = meters.find(meter => { return meter.source == 'Water Discharge' || meter.source == 'Water Intake' }) != undefined;
  }

  async saveChanges() {
    this.meterGroup.name = this.groupForm.controls['name'].value;
    if (this.meterGroup.groupType != this.groupForm.controls['groupType'].value) {
      await this.analysisDbService.changeGroupType(this.meterGroup.guid, this.groupForm.controls['groupType'].value, this.meterGroup.groupType);
    }
    this.meterGroup.groupType = this.groupForm.controls['groupType'].value;
    this.meterGroup.description = this.groupForm.controls['description'].value;
    const accountGuid = this.accountWorkspaceStore.account()?.guid;
    const meterGroup = this.meterGroup;
    const meterGroupOptions = this.meterGroupOptions;
    const meters: Array<IdbUtilityMeter> = [...this.accountWorkspaceStore.facilityMeters()];
    await this.commandBoundary.execute(
      { entityKind: 'meterGroup', changeKind: 'update', entityGuid: meterGroup.guid, label: 'Save Meter Group' },
      async () => {
        await this.meterHandler.updateMeterGroup(meterGroup, accountGuid);
        for (const groupOption of meterGroupOptions) {
          const meter = meters.find(m => m.guid == groupOption.guid);
          if (groupOption.includeInGroup) {
            meter.groupId = meterGroup.guid;
            await this.meterHandler.updateMeter(meter, accountGuid);
          } else if (meter.groupId == meterGroup.guid) {
            meter.groupId = undefined;
            await this.meterHandler.updateMeter(meter, accountGuid);
          }
        }
      }
    );
    this.toastNoticationService.showToast("Meter Group Changes Saved!", undefined, undefined, false, "alert-success");
    this.selectionsChanged = false;
    this.groupForm.markAsPristine();
  }

  setGroupOptions() {
    let meters: Array<IdbUtilityMeter> = [...this.accountWorkspaceStore.facilityMeters()];
    if (this.groupForm.controls['groupType'].value == 'Energy') {
      let energyMeters: Array<IdbUtilityMeter> = meters.filter(meter => {
        return getIsEnergyMeter(meter.source)
      });
      this.meterGroupOptions = energyMeters.map(meter => {
        return {
          name: meter.name,
          source: meter.source,
          scope: meter.scope,
          includeInGroup: meter.groupId == this.meterGroup.guid,
          inAnotherGroup: (meter.groupId != this.meterGroup.guid) && meter.groupId != undefined,
          guid: meter.guid
        }
      })
    } else if (this.groupForm.controls['groupType'].value == 'Water') {
      let waterMeters: Array<IdbUtilityMeter> = meters.filter(meter => {
        return meter.source == 'Water Discharge' || meter.source == 'Water Intake';
      });
      this.meterGroupOptions = waterMeters.map(meter => {
        return {
          name: meter.name,
          source: meter.source,
          scope: meter.scope,
          includeInGroup: meter.groupId == this.meterGroup.guid,
          inAnotherGroup: (meter.groupId != this.meterGroup.guid) && meter.groupId != undefined,
          guid: meter.guid
        }
      })
    } else if (this.groupForm.controls['groupType'].value == 'Other') {
      this.meterGroupOptions = meters.map(meter => {
        return {
          name: meter.name,
          source: meter.source,
          scope: meter.scope,
          includeInGroup: meter.groupId == this.meterGroup.guid,
          inAnotherGroup: (meter.groupId != this.meterGroup.guid) && meter.groupId != undefined,
          guid: meter.guid
        }
      })
    }

    this.meterGroupOptions = _.orderBy(this.meterGroupOptions, (option: MeterGroupOption) => {
      return option.inAnotherGroup
    }, 'asc')
  }

  setSelectionsChanged() {
    this.selectionsChanged = true;
  }

  canDeactivate(): Observable<boolean> {
    if (this.groupForm.dirty || this.selectionsChanged) {
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

  openDeleteGroupModal() {
    this.showDeleteModal = true;
  }

  viewGroupDataTable() {
    this.router.navigate(['../../data-table/' + this.meterGroup.guid], { relativeTo: this.activatedRoute });
  }

  viewGroupChartData() {
    this.router.navigate(['../../data-chart/' + this.meterGroup.guid], { relativeTo: this.activatedRoute });
  }

  closeDeleteGroup() {
    this.showDeleteModal = false;
  }

  async deleteMeterGroup() {
    this.loadingService.setLoadingMessage("Deleting Meter Group...");
    this.loadingService.setLoadingStatus(true);
    const meterGroup = this.meterGroup;
    const accountGuid = this.accountWorkspaceStore.account()?.guid;
    const meters: Array<IdbUtilityMeter> = [...this.accountWorkspaceStore.facilityMeters()];
    const groupMeters: Array<IdbUtilityMeter> = meters.filter(meter => meter.groupId == meterGroup.guid);
    await this.commandBoundary.execute(
      { entityKind: 'meterGroup', changeKind: 'delete', entityGuid: meterGroup.guid, label: 'Delete Meter Group' },
      async () => {
        await this.meterHandler.deleteMeterGroup(meterGroup.id);
        for (const meter of groupMeters) {
          meter.groupId = undefined;
          await this.meterHandler.updateMeter(meter, accountGuid);
        }
        await this.analysisDbService.deleteGroup(meterGroup.guid);
        await this.accountReportDbService.updateReportsRemoveGroup(meterGroup.guid);
      }
    );
    this.closeDeleteGroup();
    this.loadingService.setLoadingStatus(false);
    this.toastNoticationService.showToast("Meter Group Deleted!", undefined, undefined, false, "alert-success");
    this.groupForm.markAsPristine();
    this.selectionsChanged = false;
    this.cancel();
  }

}

export interface MeterGroupOption {
  includeInGroup: boolean,
  inAnotherGroup: boolean,
  name: string,
  source: MeterSource,
  scope: number,
  guid: string
}
