import { Component } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { Subscription } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
    selector: 'app-facility-overview-help',
    templateUrl: './facility-overview-help.component.html',
    styleUrls: ['./facility-overview-help.component.css'],
    standalone: false
})
export class FacilityOverviewHelpComponent {

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  routerSub: Subscription;
  overviewType: 'an energy consumption' | 'a utility cost' | 'a water consumption' | 'an emissions';
  tableType: 'Utility Costs' | 'Utility Use and Cost' | 'Utility Emissions';
  constructor(private facilityDbService: FacilitydbService,
    private router: Router) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(selectedFacility => {
      this.selectedFacility = selectedFacility;
    });
    this.routerSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.setOverviewType(event.urlAfterRedirects);
      }
    });
    //navigationsEnd isn't fired on init. Call here.
    this.setOverviewType(this.router.url);
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
    this.routerSub.unsubscribe();
  }


  setOverviewType(urlStr: string) {
    if (urlStr.includes('energy')) {
      this.overviewType = 'an energy consumption';
      this.tableType = 'Utility Use and Cost';
    } else if (urlStr.includes('water')) {
      this.overviewType = 'a water consumption';
      this.tableType = 'Utility Use and Cost';
    } else if (urlStr.includes('costs')) {
      this.overviewType = 'a utility cost'
      this.tableType = 'Utility Costs';
    } else if (urlStr.includes('emissions')) {
      this.overviewType = 'an emissions';
      this.tableType = 'Utility Emissions';
    }
  }
}
