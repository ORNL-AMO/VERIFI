import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';

@Component({
  selector: 'app-meter-data',
  templateUrl: './meter-data.component.html',
  styleUrl: './meter-data.component.css'
})
export class MeterDataComponent {

  selectedMeter: IdbUtilityMeter;
  // label: string;
  // routerSub: Subscription;
  constructor(
    private utilityMeterDbService: UtilityMeterdbService,
    private activatedRoute: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let meterId: string = params['id'];
      let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
      this.selectedMeter = facilityMeters.find(meter => { return meter.guid == meterId });
    });
    // this.routerSub = this.router.events.subscribe(event => {
    //   if (event instanceof NavigationEnd) {
    //     this.setLabel(this.router.url);
    //   }
    // });
    // this.setLabel(this.router.url);
  }

  // ngOnDestroy(){
  //   this.routerSub.unsubscribe();
  // }


  // setLabel(url: string) {
  //   if (this.router.url.includes('new-bill')) {
  //     this.label = 'New Bill'
  //   } else if (this.router.url.includes('edit-bill')) {
  //     this.label = 'Edit Bill';
  //   } else {
  //     this.label = 'Bills';
  //   }
  // }
}
