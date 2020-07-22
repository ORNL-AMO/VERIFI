import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
let EnergyConsumptionService = class EnergyConsumptionService {
    constructor() {
        this.energySource = new BehaviorSubject(null);
    }
    getValue() {
        // Keep users state
        return this.energySource.asObservable();
    }
    setValue(newValue) {
        this.energySource.next(newValue);
    }
};
EnergyConsumptionService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], EnergyConsumptionService);
export { EnergyConsumptionService };
//# sourceMappingURL=energy-consumption.service.js.map