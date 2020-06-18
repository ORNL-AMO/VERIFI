import { __decorate } from "tslib";
import { Component } from '@angular/core';
let EnergyConsumptionComponent = class EnergyConsumptionComponent {
    constructor(energyConsumptionService) {
        this.energyConsumptionService = energyConsumptionService;
    }
    ngOnInit() {
        // Observe the energySource var
        this.energyConsumptionService.getValue().subscribe((value) => {
            this.energySource = value;
            if (value != null) {
                this.electricity = this.energySource.indexOf("Electricity") > -1;
                this.naturalGas = this.energySource.indexOf("Natural Gas") > -1;
                this.lpg = this.energySource.indexOf("LPG") > -1;
                this.fuelOil = this.energySource.indexOf("Fuel Oil") > -1;
                this.coal = this.energySource.indexOf("Coal") > -1;
                this.wood = this.energySource.indexOf("Wood") > -1;
                this.paper = this.energySource.indexOf("Paper") > -1;
                this.otherGas = this.energySource.indexOf("Other Gas") > -1;
                this.otherEnergy = this.energySource.indexOf("Other Energy") > -1;
            }
        });
    }
};
EnergyConsumptionComponent = __decorate([
    Component({
        selector: 'app-energy-consumption',
        templateUrl: './energy-consumption.component.html',
        styleUrls: ['./energy-consumption.component.css']
    })
], EnergyConsumptionComponent);
export { EnergyConsumptionComponent };
//# sourceMappingURL=energy-consumption.component.js.map