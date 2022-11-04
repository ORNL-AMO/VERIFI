import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';
@Component({
  selector: 'app-energy-consumption-help',
  templateUrl: './energy-consumption-help.component.html',
  styleUrls: ['./energy-consumption-help.component.css']
})
export class EnergyConsumptionHelpComponent implements OnInit {

  selectedSource: string;
  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  routerSub: Subscription;
  constructor(private facilityDbService: FacilitydbService, private router: Router) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(selectedFacility => {
      this.selectedFacility = selectedFacility;
    });
    this.routerSub = this.router.events.subscribe((val) => {
      if (val instanceof NavigationEnd) {
        this.setSelectedSource(val.url);
      }
    });
    this.setSelectedSource(this.router.url);
  }

  ngOnDestroy() {
    this.routerSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }

  setSelectedSource(url: string) {
    this.selectedSource = undefined;
    this.checkSource('electricity', url);
    this.checkSource('natural-gas', url);
    this.checkSource('other-fuels', url);
    this.checkSource('other-energy', url);
    this.checkSource('water', url);
    this.checkSource('waste-water', url);
    this.checkSource('other-utility', url);
  }

  checkSource(source: string, url: string) {
    if (url.indexOf(source) != -1) {
      this.selectedSource = source;
      this.selectedSource = this.selectedSource.replace('-', ' ');
    }
  }

}
