import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
let FacilityComponent = class FacilityComponent {
    constructor(accountService, facilityService, accountdbService, facilitydbService) {
        this.accountService = accountService;
        this.facilityService = facilityService;
        this.accountdbService = accountdbService;
        this.facilitydbService = facilitydbService;
        this.facilityForm = new FormGroup({
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
    }
    ngOnInit() {
        // Get current account and fill form.
        this.facilityService.getValue().subscribe((value) => {
            this.facilityid = value;
            this.facilitydbService.getByKey(this.facilityid).then(data => {
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
            }, error => {
                console.log(error);
            });
        });
    }
    onFormChange() {
        // Update db
        this.facilitydbService.update(this.facilityForm.value).then(data => {
            this.facilityService.setValue(this.facilityid);
        }, error => {
            console.log(error);
        });
    }
};
FacilityComponent = __decorate([
    Component({
        selector: 'app-facility',
        templateUrl: './facility.component.html',
        styleUrls: ['./facility.component.css']
    })
], FacilityComponent);
export { FacilityComponent };
//# sourceMappingURL=facility.component.js.map