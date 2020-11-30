import { Component, OnInit} from '@angular/core';
import { AccountService } from '../account/account.service';
import { FacilityService } from '../facility/facility.service';
import { AccountdbService } from "../../indexedDB/account-db.service";
import { FacilitydbService } from "../../indexedDB/facility-db.service";
import { FormGroup, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-facility',
  templateUrl: './facility.component.html',
  styleUrls: ['./facility.component.css']
})
export class FacilityComponent implements OnInit {
  accountid: number;
  facilityid: number;

  facilityForm = new FormGroup({
    id: new FormControl('', [Validators.required]),
    accountid: new FormControl('', [Validators.required]),
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

  constructor(
    private accountService: AccountService,
    private facilityService: FacilityService,
    private accountdbService: AccountdbService,
    private facilitydbService: FacilitydbService
  ) {}

  ngOnInit() {
    // Get current account and fill form.
    this.facilityService.getValue().subscribe((value) => {
      this.facilityid = value;

      this.facilitydbService.getByKey(this.facilityid).then(
        data => {
          if (data != null) {
            this.facilityForm.get('id').setValue(data.id);
            this.facilityForm.get('accountid').setValue(data.accountid);
            this.facilityForm.get('name').setValue(data.name);
            this.facilityForm.get('country').setValue(data.country);
            this.facilityForm.get('state').setValue(data.state);
            this.facilityForm.get('address').setValue(data.address);
            this.facilityForm.get('type').setValue(data.type);
            this.facilityForm.get('tier').setValue(data.tier);
            this.facilityForm.get('size').setValue(data.size);
            this.facilityForm.get('units').setValue(data.units);
            this.facilityForm.get('division').setValue(data.division);
            // Needs image
          }
        },
        error => {
            console.log(error);
        }
      );
      
    });
  }

  onFormChange(): void {
    // Update db
    this.facilitydbService.update(this.facilityForm.value).then(
      data => {
        this.facilityService.setValue(this.facilityid);
      },
      error => {
          console.log(error);
      }
    );
    
}

}
