import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
@Component({
  selector: 'app-energy-consumption-help',
  templateUrl: './energy-consumption-help.component.html',
  styleUrls: ['./energy-consumption-help.component.css']
})
export class EnergyConsumptionHelpComponent implements OnInit {

  routerSub: Subscription;
  helpURL: 'edit-bill' | 'edit-meter' | 'meters-list' | 'utility-meter';
  constructor(private router: Router) { }

  ngOnInit(): void {
    this.routerSub = this.router.events.subscribe((val) => {
      if (val instanceof NavigationEnd) {
        this.setHelpURL(val.url);
      }
    });
    this.setHelpURL(this.router.url);
  }

  ngOnDestroy() {
    this.routerSub.unsubscribe();
  }

  setHelpURL(url: string) {
    if (url.includes('energy-source')) {
      if (url.includes('edit-meter') || url.includes('new-meter')) {
        this.helpURL = 'edit-meter';
      } else {
        this.helpURL = 'meters-list';
      }
    } else {
      if (url.includes('edit-bill') || url.includes('new-bill')) {
        this.helpURL = 'edit-bill';
      } else {
        this.helpURL = 'utility-meter';
      }
    }
  }

}
