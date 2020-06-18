import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
let AccountService = class AccountService {
    constructor(localStorage) {
        this.localStorage = localStorage;
        this.accountId = new BehaviorSubject(1);
    }
    getValue() {
        // Keep users state
        if (this.localStorage.retrieve('accountid')) {
            this.accountId.next(this.localStorage.retrieve('accountid'));
        }
        return this.accountId.asObservable();
    }
    setValue(newValue) {
        this.localStorage.store('accountid', newValue);
        this.accountId.next(newValue);
    }
};
AccountService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], AccountService);
export { AccountService };
//# sourceMappingURL=account.service.js.map