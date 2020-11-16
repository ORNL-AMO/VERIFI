import { Component, OnInit, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { AccountService } from "./account.service";
import { FacilityService } from '../facility/facility.service';
import { AccountdbService } from "../../indexedDB/account-db.service";
import { FacilitydbService } from "../../indexedDB/facility-db-service";
import { IdbAccount, IdbFacility } from 'src/app/models/idb';


@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css'],
  host: {
    '(document:click)': 'documentClick($event)',
  }
})
export class AccountComponent implements OnInit {
  accountid: number;
  facilityid: number;
  facilityList: any = [];
  facilityMenuOpen: number;

  accountForm = new FormGroup({
    id: new FormControl('', [Validators.required]),
    name: new FormControl('', [Validators.required]),
    industry: new FormControl('', [Validators.required]),
    naics: new FormControl('', [Validators.required]),
    notes: new FormControl('', [Validators.required])
  });

  constructor(
    private eRef: ElementRef,
    private router: Router,
    private accountService: AccountService,
    private facilityService: FacilityService,
    private accountdbService: AccountdbService,
    private facilitydbService: FacilitydbService,
  ) { }

  ngOnInit() {
    // Observe the accountid var
    this.accountService.getValue().subscribe((value) => {
      this.accountid = value;
      this.accountLoadList();
      this.facilityLoadList();
    });

    // Observe the facilityid var
    this.facilityService.getValue().subscribe((value) => {
      this.facilityid = value;
      this.facilityLoadList();
    });
  }

  // Close menus when user clicks outside the dropdown
  documentClick() {
    this.facilityMenuOpen = null;
  }

  accountLoadList() {
    // Get current account and fill form.
    this.accountdbService.getById(this.accountid).subscribe(
      data => {
        // avoid empty errors
        if (data != null) {
          this.accountForm.get('id').setValue(data.id);
          this.accountForm.get('name').setValue(data.name);
          this.accountForm.get('industry').setValue(data.industry);
          this.accountForm.get('naics').setValue(data.naics);
          this.accountForm.get('notes').setValue(data.notes);
          // Needs image
        }
      },
      error => {
        console.log(error);
      }
    );
  }

  facilityLoadList() {
    // List all facilities
    this.facilitydbService.getAllByIndexRange('accountId', this.accountid).subscribe(
      data => {
        this.facilityList = data;
      },
      error => {
        console.log(error);
      }
    );
  }

  facilityToggleMenu(index) {
    if (this.facilityMenuOpen === index) {
      this.facilityMenuOpen = null;
    } else {
      this.facilityMenuOpen = index;
    }
  }

  facilityEdit(index) {
    this.facilityService.setValue(index);
    this.router.navigate(['account/facility']);
  }

  facilityDelete(index) {
    this.facilitydbService.deleteIndex(index);
    this.facilityLoadList(); // refresh the data
  }

  addNewFacility() {
    let idbFacility: IdbFacility = this.facilitydbService.getNewIdbFacility(this.accountid);
    this.facilitydbService.add(idbFacility);
    this.facilityLoadList(); // refresh the data
  }

  onFormChange(): void {
    // Update db
    this.accountdbService.update(this.accountForm.value).subscribe(
      data => {
        this.accountService.setValue(this.accountid); // forces ui to update
      },
      error => {
        console.log(error);
      }
    );
  }

}
