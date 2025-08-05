import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';

@Component({
  selector: 'app-calanderization',
  templateUrl: './calanderization.component.html',
  styleUrls: ['./calanderization.component.css'],
  standalone: false
})
export class CalanderizationComponent implements OnInit {

  facilityMetersSub: Subscription;
  facilityMeters: Array<IdbUtilityMeter>;

  selectedMeter: IdbUtilityMeter;
  constructor(private utilityMeterDbService: UtilityMeterdbService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.facilityMetersSub = this.utilityMeterDbService.facilityMeters.subscribe(facilityMeters => {
      this.facilityMeters = facilityMeters;
      this.initializeSelectedMeter();
    });
  }

  ngOnDestroy() {
    this.facilityMetersSub.unsubscribe();
  }

  initializeSelectedMeter() {
    if (!this.selectedMeter) {
      this.selectMeter(this.facilityMeters[0])
    } else {
      let meterInFacility: IdbUtilityMeter = this.facilityMeters.find(meter => { return meter.id == this.selectedMeter.id });
      if (!meterInFacility) {
        this.selectMeter(this.facilityMeters[0])
      }
    }
  }

  selectMeter(meter: IdbUtilityMeter) {
    this.selectedMeter = meter;
  }

  uploadData() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.router.navigateByUrl('/data-management/' + selectedAccount.guid + '/import-data');
  }

  addMeter() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/data-evaluation/facility/' + selectedFacility.guid + '/utility/energy-consumption/energy-source/new-meter');
  }
}
