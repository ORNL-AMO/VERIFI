import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-predictors-data-help',
  templateUrl: './predictors-data-help.component.html',
  styleUrls: ['./predictors-data-help.component.css']
})
export class PredictorsDataHelpComponent implements OnInit {

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  routerSub: Subscription;
  helpURL: 'manage' | 'entries' | 'predictor-form' | 'predictor-entry-form';
  constructor(private facilityDbService: FacilitydbService,
    private router: Router) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(selectedFacility => {
      this.selectedFacility = selectedFacility;
    });
    this.routerSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.setHelpURL(event.urlAfterRedirects);
      }
    });
    //navigationsEnd isn't fired on init. Call here.
    this.setHelpURL(this.router.url);
  }

  ngOnDestroy() {
    this.routerSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }

  setHelpURL(url: string) {
    if (url.includes('manage')) {
      if(url.includes('predictor-table')){
        this.helpURL = 'manage';
      }else if(url.includes('add-predictor') || url.includes('edit-predictor')){
        this.helpURL = 'predictor-form';
      }
    } else if (url.includes('entries')) {
      if(url.includes('predictor-entries-table')){
        this.helpURL = 'entries';
      }else if(url.includes('add-entry') || url.includes('edit-entry')){
        this.helpURL = 'predictor-entry-form';
      }
    }
  }

}
