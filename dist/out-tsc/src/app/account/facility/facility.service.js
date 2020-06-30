import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
let FacilityService = class FacilityService {
    constructor(localStorage, facilitydbService) {
        this.localStorage = localStorage;
        this.facilitydbService = facilitydbService;
        this.facilityId = new BehaviorSubject(1);
    }
    getValue() {
        // Keep users state
        if (this.localStorage.retrieve('facilityid')) {
            this.facilityId.next(this.localStorage.retrieve('facilityid'));
        }
        return this.facilityId.asObservable();
    }
    setValue(newValue) {
        this.localStorage.store('facilityid', newValue);
        this.facilityId.next(newValue);
    }
};
FacilityService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], FacilityService);
export { FacilityService };
//# sourceMappingURL=facility.service.js.map