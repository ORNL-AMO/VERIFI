import { Component, OnInit } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';

@Component({
  selector: 'app-utility-meter-data',
  templateUrl: './utility-meter-data.component.html',
  styleUrls: ['./utility-meter-data.component.css']
})
export class UtilityMeterDataComponent implements OnInit {


  selectedMeter: IdbUtilityMeter;
  label: string;
  routerSub: Subscription;
  constructor(
    private utilityMeterDbService: UtilityMeterdbService,
    private activatedRoute: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let meterId: number = parseInt(params['id']);
      let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
      this.selectedMeter = facilityMeters.find(meter => { return meter.id == meterId });
    });
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setLabel(this.router.url);
      }
    });
    this.setLabel(this.router.url);
  }

  ngOnDestroy(){
    this.routerSub.unsubscribe();
  }


  setLabel(url: string) {
    if (this.router.url.includes('new-bill')) {
      this.label = 'New Bill'
    } else if (this.router.url.includes('edit-bill')) {
      this.label = 'Edit Bill';
    } else {
      this.label = 'Bills';
    }
  }
}
