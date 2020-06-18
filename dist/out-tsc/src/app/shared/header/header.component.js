import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { NavigationStart } from '@angular/router';
let HeaderComponent = class HeaderComponent {
    constructor(eRef, router, accountService, facilityService, accountdbService, facilitydbService, localStorage) {
        this.eRef = eRef;
        this.router = router;
        this.accountService = accountService;
        this.facilityService = facilityService;
        this.accountdbService = accountdbService;
        this.facilitydbService = facilitydbService;
        this.localStorage = localStorage;
        this.accountMenu = false;
        this.facilityMenu = false;
        this.accountList = [];
        this.facilityList = [];
        this.activeAccount = '';
        this.activeFacility = '';
        this.devtools = false;
        // Close menus on navigation
        router.events.subscribe((event) => {
            if (event instanceof NavigationStart) {
                this.accountMenu = false;
                this.facilityMenu = false;
            }
        });
    }
    ngOnInit() {
        // Subscribe to account ID
        this.accountService.getValue().subscribe((value) => {
            this.accountid = value;
            this.accountLoadList();
        });
        // Subscribe to facility ID
        this.facilityService.getValue().subscribe((value) => {
            this.facilityid = value;
            this.facilityLoadList();
        });
    }
    accountLoadList() {
        // List all accounts for popup
        this.accountdbService.getAll().then(data => {
            // Load test data if no data is present
            if (data.length != 0) {
                this.accountList = data;
                const index = this.accountList.findIndex(x => x.id === this.accountid);
                this.activeAccount = this.accountList[index]['name']; // get the name
            }
            else {
                //TEMPORARY
                this.loadTestData();
            }
        }, error => {
            console.log(error);
        });
    }
    facilityLoadList() {
        // List all facilities for dropdown
        this.facilitydbService.getAllByIndex(this.accountid).then(data => {
            // avoid empty errors
            if (data.length != 0) {
                this.facilityList = data; // array dropdown
                const index = this.facilityList.findIndex(x => x.id === this.facilityid); // find current facility in list
                this.defaultFacility(index); // choose default facility
            }
            else {
                this.facilityList = [];
                this.activeFacility = '';
            }
        }, error => {
            console.log(error);
        });
    }
    toggleFacilityMenu() {
        this.facilityMenu = !this.facilityMenu;
        this.accountMenu = false;
    }
    toggleAccountMenu() {
        this.accountMenu = !this.accountMenu;
        this.facilityMenu = false;
    }
    toggleManageAccountsMenu() {
        this.manageAccountMenu = !this.manageAccountMenu;
        this.facilityMenu = false;
        this.accountMenu = false;
    }
    // close menus when user clicks outside the dropdown
    documentClick() {
        if (!this.eRef.nativeElement.contains(event.target)) {
            this.accountMenu = false;
            this.facilityMenu = false;
            this.manageAccountMenu = false;
        }
    }
    addNewAccount() {
        this.toggleManageAccountsMenu();
        this.accountdbService.add();
        this.router.navigate(['account/account']);
        this.accountService.setValue(this.accountList.length + 1); // switch to new account
        this.facilitydbService.add(this.accountid); // add 1 facility with every new account
        this.facilityService.setValue(0); // having problems with selecting first index
    }
    addNewFacility() {
        this.facilitydbService.add(this.accountid);
        this.facilityLoadList(); // refresh the data
    }
    switchAccount(index) {
        this.toggleManageAccountsMenu();
        this.router.navigate(['account/account']);
        this.accountService.setValue(index);
        this.facilityService.setValue(0); // having problems with selecting first index
    }
    switchFacility(index) {
        this.toggleFacilityMenu();
        //this.router.navigate(['account/facility']); dont navigate away
        this.facilityService.setValue(index);
    }
    defaultFacility(index) {
        if (index != -1) {
            this.activeFacility = this.facilityList[index]['name']; // get the name
        }
        else {
            this.activeFacility = this.facilityList[0]['name']; // get the name
            const index = this.facilityList[0]['id'];
            this.facilityService.setValue(index);
        }
    }
    /* DEV TOOLS BELOW
    *******************************************************************************/
    loadTestData() {
        this.accountdbService.addTestData();
        this.facilitydbService.addTestData().then(data => {
            location.reload();
        });
        //location.reload();
        console.log("Data loaded");
    }
    getAllAccounts() {
        this.accountdbService.getAll().then(data => {
            console.log(data);
        });
    }
    getAllFacilities() {
        this.facilitydbService.getAll().then(data => {
            console.log(data);
        });
    }
    clearLocalstorage() {
        this.localStorage.clear('accountid');
        this.localStorage.clear('facilityid');
        console.log("data cleared");
    }
};
HeaderComponent = __decorate([
    Component({
        selector: 'app-header',
        templateUrl: './header.component.html',
        styleUrls: ['./header.component.css'],
        host: {
            '(document:click)': 'documentClick($event)',
        }
    })
], HeaderComponent);
export { HeaderComponent };
//# sourceMappingURL=header.component.js.map