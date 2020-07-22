import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
let AccountComponent = class AccountComponent {
    constructor(eRef, router, accountService, facilityService, accountdbService, facilitydbService) {
        this.eRef = eRef;
        this.router = router;
        this.accountService = accountService;
        this.facilityService = facilityService;
        this.accountdbService = accountdbService;
        this.facilitydbService = facilitydbService;
        this.facilityList = [];
        this.accountForm = new FormGroup({
            id: new FormControl('', [Validators.required]),
            name: new FormControl('', [Validators.required]),
            industry: new FormControl('', [Validators.required]),
            naics: new FormControl('', [Validators.required]),
            notes: new FormControl('', [Validators.required])
        });
    }
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
        this.accountdbService.getByKey(this.accountid).then(data => {
            // avoid empty errors
            if (data != null) {
                this.accountForm.get('id').setValue(data.id);
                this.accountForm.get('name').setValue(data.name);
                this.accountForm.get('industry').setValue(data.industry);
                this.accountForm.get('naics').setValue(data.naics);
                this.accountForm.get('notes').setValue(data.notes);
                // Needs image
            }
        }, error => {
            console.log(error);
        });
    }
    facilityLoadList() {
        // List all facilities
        this.facilitydbService.getAllByIndex(this.accountid).then(data => {
            this.facilityList = data;
        }, error => {
            console.log(error);
        });
    }
    facilityToggleMenu(index) {
        if (this.facilityMenuOpen === index) {
            this.facilityMenuOpen = null;
        }
        else {
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
        this.facilitydbService.add(this.accountid);
        this.facilityLoadList(); // refresh the data
    }
    onFormChange() {
        // Update db
        this.accountdbService.update(this.accountForm.value).then(data => {
            this.accountService.setValue(this.accountid);
        }, error => {
            console.log(error);
        });
    }
};
AccountComponent = __decorate([
    Component({
        selector: 'app-account',
        templateUrl: './account.component.html',
        styleUrls: ['./account.component.css'],
        host: {
            '(document:click)': 'documentClick($event)',
        }
    })
], AccountComponent);
export { AccountComponent };
//# sourceMappingURL=account.component.js.map