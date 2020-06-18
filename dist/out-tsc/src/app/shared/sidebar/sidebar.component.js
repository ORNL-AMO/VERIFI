import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { NavigationEnd } from '@angular/router';
let SidebarComponent = class SidebarComponent {
    constructor(renderer, eRef, router) {
        this.renderer = renderer;
        this.eRef = eRef;
        this.router = router;
        router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                // Close sidebar on navigation
                this.open = true;
                this.toggleSidebar();
            }
            else if (router.url.toString() === "/") {
                // Keep sidebar open if its the homepage
                this.open = false;
                this.toggleSidebar();
            }
        });
    }
    ngOnInit() { }
    toggleSidebar() {
        this.open = !this.open;
        const action = this.open ? 'addClass' : 'removeClass';
        this.renderer[action](document.body, 'open');
        if (action === "removeClass") {
        }
    }
};
SidebarComponent = __decorate([
    Component({
        selector: 'app-sidebar',
        templateUrl: './sidebar.component.html',
        styleUrls: ['./sidebar.component.css']
    })
], SidebarComponent);
export { SidebarComponent };
//# sourceMappingURL=sidebar.component.js.map