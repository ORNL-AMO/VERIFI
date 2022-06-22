import { Component, OnInit } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter } from 'src/app/models/idb';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';

@Component({
  selector: 'app-utility-meter-data',
  templateUrl: './utility-meter-data.component.html',
  styleUrls: ['./utility-meter-data.component.css']
})
export class UtilityMeterDataComponent implements OnInit {


  selectedMeter: IdbUtilityMeter;
  label: string;
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
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setLabel(this.router.url);
      }
    });
    this.setLabel(this.router.url);
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
