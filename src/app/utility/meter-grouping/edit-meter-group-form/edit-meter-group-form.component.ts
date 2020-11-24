import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
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
  editOrAdd: string;
  groupForm: FormGroup;
  constructor(private formBuilder: FormBuilder, private utilityMeterGroupDbService: UtilityMeterGroupdbService) { }

  ngOnInit(): void {
    this.groupForm = this.formBuilder.group({
      name: [this.groupToEdit.name],
      description: [this.groupToEdit.description]
    });
  }


  save() {
    this.groupToEdit.name = this.groupForm.controls.name.value;
    this.groupToEdit.description = this.groupForm.controls.description.value;
    if (this.editOrAdd == 'add') {
      this.utilityMeterGroupDbService.add(this.groupToEdit);
    } else {
      this.utilityMeterGroupDbService.update(this.groupToEdit);
    }
    this.cancel();
  }

  cancel() {
    this.emitClose.emit(true);
  }

}
