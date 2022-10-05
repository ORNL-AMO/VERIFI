import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { MeterGroupType } from 'src/app/models/calanderization';
import { IdbAccount, IdbFacility, IdbUtilityMeterGroup } from 'src/app/models/idb';

@Component({
  selector: 'app-edit-meter-group-form',
  templateUrl: './edit-meter-group-form.component.html',
  styleUrls: ['./edit-meter-group-form.component.css']
})
export class EditMeterGroupFormComponent implements OnInit {
  @Input()
  groupToEdit: IdbUtilityMeterGroup;
  @Output('emitClose')
  emitClose: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Input()
  editOrAdd: 'add' | 'edit';
  @Input()
  meterGroupTypes: Array<MeterGroupType>;

  groupForm: FormGroup;
  constructor(private formBuilder: FormBuilder, private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private analysisDbService: AnalysisDbService, private toastNotificationService: ToastNotificationsService,
    private dbChangesService: DbChangesService, private accountDbService: AccountdbService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.groupForm = this.formBuilder.group({
      name: [this.groupToEdit.name, Validators.required],
      groupType: [this.groupToEdit.groupType, Validators.required],
      description: [this.groupToEdit.description]
    });
    if(this.editOrAdd == 'edit'){
      this.groupForm.controls.groupType.disable();
    }
  }


  async save() {
    this.groupToEdit.name = this.groupForm.controls.name.value;
    this.groupToEdit.description = this.groupForm.controls.description.value;
    let allGroups: Array<IdbUtilityMeterGroup>;
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    if (this.editOrAdd == 'add') {
      let groupToAdd: IdbUtilityMeterGroup = await this.utilityMeterGroupDbService.addWithObservable(this.groupToEdit).toPromise();
      allGroups = await this.utilityMeterGroupDbService.getAllByIndexRange('accountId', this.groupToEdit.accountId).toPromise();
      await this.dbChangesService.setMeterGroups(selectedAccount, selectedFacility)
      if(groupToAdd.groupType == 'Energy'){
        await this.analysisDbService.addGroup(groupToAdd.guid);
      }
      await this.dbChangesService.setAnalysisItems(selectedAccount, selectedFacility);
      this.toastNotificationService.showToast("Meter Group Added!", undefined, undefined, false, "success");
    } else {
      await this.utilityMeterGroupDbService.updateWithObservable(this.groupToEdit).toPromise();
      allGroups = await this.utilityMeterGroupDbService.getAllByIndexRange('accountId', this.groupToEdit.accountId).toPromise();
      await this.dbChangesService.setMeterGroups(selectedAccount, selectedFacility)
      this.toastNotificationService.showToast("Meter Group Updated!", undefined, undefined, false, "success");
    }
    this.emitClose.emit(true);
  }

  cancel() {
    this.emitClose.emit(false);
  }

}
