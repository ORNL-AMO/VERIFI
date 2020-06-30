import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
let EnergySourceComponent = class EnergySourceComponent {
    constructor(accountService, facilityService, accountdbService, facilitydbService, energyConsumptionService) {
        this.accountService = accountService;
        this.facilityService = facilityService;
        this.accountdbService = accountdbService;
        this.facilitydbService = facilitydbService;
        this.energyConsumptionService = energyConsumptionService;
        this.activeFacility = { name: '' };
        this.popup = false;
        this.meters = [
            {
                id: 1,
                meterNum: '12345',
                accountNum: '12345',
                type: 'Electricity',
                name: 'Knoxville',
                supplier: 'Knox Utilities',
                readDate: '6/12/20',
                notes: 'Back Wall'
            },
            {
                id: 2,
                meterNum: '12346',
                accountNum: '12346',
                type: 'Natural Gas',
                name: 'Knoxville',
                supplier: 'Knox Utilities',
                readDate: '6/12/20',
                notes: 'Needs new fuse'
            }
        ];
        this.meterForm = new FormGroup({
            id: new FormControl('', [Validators.required]),
            meterNum: new FormControl('', [Validators.required]),
            accountNum: new FormControl('', [Validators.required]),
            type: new FormControl('', [Validators.required]),
            name: new FormControl('', [Validators.required]),
            supplier: new FormControl('', [Validators.required]),
            readDate: new FormControl('', [Validators.required]),
            notes: new FormControl('', [Validators.required])
        });
        // load tabs based on existing meter types
        this.energySource = this.meters.map(function (el) { return el.type; });
        this.energyConsumptionService.setValue(this.energySource);
    }
    ngOnInit() {
        // Observe the accountid var
        this.accountService.getValue().subscribe((value) => {
            this.accountid = value;
        });
        // Observe the facilityid var
        this.facilityService.getValue().subscribe((value) => {
            this.facilityid = value;
            // get current facility object
            this.facilitydbService.getById(this.facilityid).then(data => {
                this.activeFacility = data;
            }, error => {
                console.log(error);
            });
        });
        // prevent errors
        this.selectedMeter = this.meters.find(obj => obj.id == 1);
    }
    addNewMeter() {
        this.meters.push({
            id: this.meters.length + 1,
            meterNum: '000000',
            accountNum: '000000',
            type: '',
            name: '',
            supplier: '',
            readDate: '',
            notes: ''
        });
    }
    // Close menus when user clicks outside the dropdown
    documentClick() {
        this.meterMenuOpen = null;
    }
    meterToggleMenu(index) {
        if (this.meterMenuOpen === index) {
            this.meterMenuOpen = null;
        }
        else {
            this.meterMenuOpen = index;
        }
    }
    meterSave() {
        this.popup = !this.popup;
    }
    meterEdit(id) {
        this.popup = !this.popup;
        this.meterMenuOpen = null;
        this.selectedMeter = this.meters.find(obj => obj.id == id);
        this.meterForm.setValue(this.selectedMeter);
    }
    meterDelete(id) {
        console.log("delete: " + id);
        this.meterMenuOpen = null;
        this.meters.splice(this.meters.findIndex(obj => obj.id == id), 1);
    }
    onFormChange() {
        // Update db
        this.meters.splice(this.meters.findIndex(obj => obj.id == this.selectedMeter.id), 1, this.meterForm.value);
        this.energySource = this.meters.map(function (el) { return el.type; });
        this.energyConsumptionService.setValue(this.energySource);
        /*
        this.accountdbService.update(this.accountForm.value).then(
          data => {
            this.accountService.setValue(this.accountid);
          },
          error => {
              console.log(error);
          }
        );*/
    }
};
EnergySourceComponent = __decorate([
    Component({
        selector: 'app-energy-source',
        templateUrl: './energy-source.component.html',
        styleUrls: ['./energy-source.component.css'],
        host: {
            '(document:click)': 'documentClick($event)',
        }
    })
], EnergySourceComponent);
export { EnergySourceComponent };
//# sourceMappingURL=energy-source.component.js.map