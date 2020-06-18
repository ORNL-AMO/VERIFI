import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { version } from '../../../../package.json';
let FooterComponent = class FooterComponent {
    constructor(accountService, accountdbService, facilitydbService) {
        this.accountService = accountService;
        this.accountdbService = accountdbService;
        this.facilitydbService = facilitydbService;
        this.date = new Date();
        this.version = version;
        this.accountCount = 0;
        this.facilityCount = 0;
        this.facilityCountTotal = 0;
    }
    ngOnInit() {
        // Subscribe to account ID
        this.accountService.getValue().subscribe((value) => {
            this.accountid = value;
            this.countFacilities();
        });
        this.countAccounts();
        this.countAllFacilities();
    }
    countAccounts() {
        // Count all accounts
        this.accountdbService.count().then(data => {
            this.accountCount = data;
        }, error => {
            console.log(error);
        });
    }
    countFacilities() {
        // Count current facilities
        this.facilitydbService.getAllByIndex(this.accountid).then(data => {
            this.facilityCount = data.length;
        }, error => {
            console.log(error);
        });
    }
    countAllFacilities() {
        // Count all facilities
        this.facilitydbService.count().then(data => {
            this.facilityCountTotal = data;
        }, error => {
            console.log(error);
        });
    }
};
FooterComponent = __decorate([
    Component({
        selector: 'app-footer',
        templateUrl: './footer.component.html',
        styleUrls: ['./footer.component.css']
    })
], FooterComponent);
export { FooterComponent };
//# sourceMappingURL=footer.component.js.map