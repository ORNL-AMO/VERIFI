import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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
    private analysisDbService: AnalysisDbService) { }

  ngOnInit(): void {
    this.groupForm = this.formBuilder.group({
      name: [this.groupToEdit.name, Validators.required],
      description: [this.groupToEdit.description]
    });
  }


  async save() {
    this.groupToEdit.name = this.groupForm.controls.name.value;
    this.groupToEdit.description = this.groupForm.controls.description.value;
    if (this.editOrAdd == 'add') {
      let groupToAdd: IdbUtilityMeterGroup = await this.utilityMeterGroupDbService.addWithObservable(this.groupToEdit).toPromise();
      this.utilityMeterGroupDbService.setAccountMeterGroups();
      this.utilityMeterGroupDbService.setFacilityMeterGroups();
      this.analysisDbService.addGroup(groupToAdd.id)
    } else {
      this.utilityMeterGroupDbService.update(this.groupToEdit);
    }
    this.cancel();
  }

  cancel() {
    this.emitClose.emit(true);
  }

}
