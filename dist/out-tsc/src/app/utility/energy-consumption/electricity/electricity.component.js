import { __decorate } from "tslib";
import { Component } from '@angular/core';
let ElectricityComponent = class ElectricityComponent {
    constructor() {
        this.meters = [1, 2];
        this.filterMenu = false;
        this.filterkWh = true;
        this.filterPeak = true;
        this.filterOffpeak = true;
        this.filterDemand = true;
        this.filterCost = true;
        this.filterAvg = true;
        this.popup = false;
        this.popup2 = false;
    }
    ngOnInit() {
        this.bills = [
            {
                id: 1,
                readDate: 'January 15 2020',
                kWh: '0.00',
                peak: '0.00',
                offPeak: '0.00',
                demand: '0.00',
                cost: '0.00',
                average: '<i class="fa fa-arrow-circle-up"></i>'
            },
            {
                id: 2,
                readDate: 'February 11 2020',
                kWh: '0.00',
                peak: '0.00',
                offPeak: '0.00',
                demand: '0.00',
                cost: '0.00',
                average: '<i class="fa fa-arrow-circle-down"></i>'
            },
            {
                id: 3,
                readDate: 'February 11 2020',
                kWh: '0.00',
                peak: '0.00',
                offPeak: '0.00',
                demand: '0.00',
                cost: '0.00',
                average: '<i class="fa fa-arrow-circle-down"></i>'
            },
            {
                id: 4,
                readDate: 'February 11 2020',
                kWh: '0.00',
                peak: '0.00',
                offPeak: '0.00',
                demand: '0.00',
                cost: '0.00',
                average: '<i class="fa fa-arrow-circle-down"></i>'
            },
            {
                id: 5,
                readDate: 'February 11 2020',
                kWh: '0.00',
                peak: '0.00',
                offPeak: '0.00',
                demand: '0.00',
                cost: '0.00',
                average: '<i class="fa fa-arrow-circle-down"></i>'
            },
            {
                id: 2,
                readDate: 'February 11 2020',
                kWh: '0.00',
                peak: '0.00',
                offPeak: '0.00',
                demand: '0.00',
                cost: '0.00',
                average: '<i class="fa fa-arrow-circle-down"></i>'
            }
        ];
    }
    addNewBill() {
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
};
ElectricityComponent = __decorate([
    Component({
        selector: 'app-electricity',
        templateUrl: './electricity.component.html',
        styleUrls: ['./electricity.component.css']
    })
], ElectricityComponent);
export { ElectricityComponent };
//# sourceMappingURL=electricity.component.js.map