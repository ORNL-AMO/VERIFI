import { Component, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom, from, map, Observable, of, switchAll, take } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
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

  constructor(private facilityDbService: FacilitydbService, private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private formBuilder: FormBuilder,
    private utilityMeterDbService: UtilityMeterdbService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
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
      this.meterGroup = this.utilityMeterGroupDbService.getGroupById(meterGroupId);
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
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    this.hasEnergyMeters = meters.find(meter => { return meter.includeInEnergy }) != undefined;
    this.hasWaterMeters = meters.find(meter => { return meter.source == 'Water Discharge' || meter.source == 'Water Intake' }) != undefined;
  }

  async saveChanges() {
    this.meterGroup.name = this.groupForm.controls['name'].value;
    if (this.meterGroup.groupType != this.groupForm.controls['groupType'].value) {
      //need to update analysis items if groupType changes
      await this.analysisDbService.changeGroupType(this.meterGroup.guid, this.groupForm.controls['groupType'].value, this.meterGroup.groupType);
    }
    this.meterGroup.groupType = this.groupForm.controls['groupType'].value;
    this.meterGroup.description = this.groupForm.controls['description'].value;
    await firstValueFrom(this.utilityMeterGroupDbService.updateWithObservable(this.meterGroup));
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    for (let i = 0; i < this.meterGroupOptions.length; i++) {
      let groupOption: MeterGroupOption = this.meterGroupOptions[i];
      let meter: IdbUtilityMeter = meters.find(m => { return m.guid == groupOption.guid });
      if (groupOption.includeInGroup) {
        //add to group
        meter.groupId = this.meterGroup.guid;
        await firstValueFrom(this.utilityMeterDbService.updateWithObservable(meter));
      } else if (meter.groupId == this.meterGroup.guid) {
        //remove from group
        meter.groupId = undefined;
        await firstValueFrom(this.utilityMeterDbService.updateWithObservable(meter));
      }
    }


    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setMeterGroups(account, facility);
    await this.dbChangesService.setMeters(account, facility);
    this.toastNoticationService.showToast("Meter Group Changes Saved!", undefined, undefined, false, "alert-success");
    this.selectionsChanged = false;
    this.groupForm.markAsPristine();
  }

  setGroupOptions() {
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
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
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await firstValueFrom(this.utilityMeterGroupDbService.deleteWithObservable(this.meterGroup.id));
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setMeterGroups(selectedAccount, facility);

    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let groupMeters: Array<IdbUtilityMeter> = meters.filter(meter => { return meter.groupId == this.meterGroup.guid });

    for (let i = 0; i < groupMeters.length; i++) {
      let meter: IdbUtilityMeter = groupMeters[i];
      meter.groupId = undefined;
      await firstValueFrom(this.utilityMeterDbService.updateWithObservable(meter))
    }
    await this.dbChangesService.setMeters(selectedAccount, facility);
    //update analysis items
    await this.analysisDbService.deleteGroup(this.meterGroup.guid);
    await this.dbChangesService.setAnalysisItems(selectedAccount, false, facility);
    //update BCC reports
    await this.accountReportDbService.updateReportsRemoveGroup(this.meterGroup.guid);
    await this.dbChangesService.setAccountReports(selectedAccount);
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