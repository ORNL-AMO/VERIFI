import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-edit-facility',
  templateUrl: './edit-facility.component.html',
  styleUrls: ['./edit-facility.component.css']
})

export class EditFacilityComponent implements OnInit {
  @Input()
  facility: IdbFacility;
  @Output('emitClose')
  emitClose: EventEmitter<boolean> = new EventEmitter<boolean>();

  facilityCopy: IdbFacility;

  facilityForm = new FormGroup({
    id: new FormControl('', [Validators.required]),
    accountId: new FormControl('', [Validators.required]),
    name: new FormControl('', [Validators.required]),
    country: new FormControl('', [Validators.required]),
    state: new FormControl('', [Validators.required]),
    address: new FormControl('', [Validators.required]),
    type: new FormControl('', [Validators.required]),
    tier: new FormControl('', [Validators.required]),
    size: new FormControl('', [Validators.required]),
    units: new FormControl('', [Validators.required]),
    division: new FormControl('', [Validators.required]),
  });
  
  constructor(private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.facilityCopy = JSON.parse(JSON.stringify(this.facility));
    this.facilityForm.patchValue(this.facilityCopy);
  }

  save() {
    this.facilityDbService.update(this.facilityForm.value);
    this.cancel();
  }

  cancel() {
    this.emitClose.emit(true);
  }

}
