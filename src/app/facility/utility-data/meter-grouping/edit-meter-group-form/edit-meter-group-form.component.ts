import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbUtilityMeterGroup } from 'src/app/models/idb';

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

  groupForm: FormGroup;
  constructor(private formBuilder: FormBuilder, private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private analysisDbService: AnalysisDbService, private toastNotificationService: ToastNotificationsService) { }

  ngOnInit(): void {
    this.groupForm = this.formBuilder.group({
      name: [this.groupToEdit.name, Validators.required],
      description: [this.groupToEdit.description]
    });
  }


  async save() {
    this.groupToEdit.name = this.groupForm.controls.name.value;
    this.groupToEdit.description = this.groupForm.controls.description.value;
    let allGroups: Array<IdbUtilityMeterGroup>;
    if (this.editOrAdd == 'add') {
      let groupToAdd: IdbUtilityMeterGroup = await this.utilityMeterGroupDbService.addWithObservable(this.groupToEdit).toPromise();
      allGroups = await this.utilityMeterGroupDbService.getAllByIndexRange('accountId', this.groupToEdit.accountId).toPromise();
      this.toastNotificationService.showToast("Meter Group Added!", undefined, undefined, false, "success");
      this.analysisDbService.addGroup(groupToAdd.guid)
    } else {
      allGroups = await this.utilityMeterGroupDbService.updateWithObservable(this.groupToEdit).toPromise();
      this.toastNotificationService.showToast("Meter Group Updated!", undefined, undefined, false, "success");
    }
    let accountGroups: Array<IdbUtilityMeterGroup> = allGroups.filter(group => {return this.groupToEdit.accountId == group.accountId});
    this.utilityMeterGroupDbService.accountMeterGroups.next(accountGroups);
    let facilityGroups: Array<IdbUtilityMeterGroup> = accountGroups.filter(group => {return group.facilityId == this.groupToEdit.facilityId});
    this.utilityMeterGroupDbService.facilityMeterGroups.next(facilityGroups);
    this.emitClose.emit(true);
  }

  cancel() {
    this.emitClose.emit(false);
  }

}
