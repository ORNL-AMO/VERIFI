import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { getNewIdbUtilityMeter, IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';


@Component({
  selector: 'app-set-meter-grouping',
  standalone: false,
  templateUrl: './set-meter-grouping.component.html',
  styleUrl: './set-meter-grouping.component.css'
})
export class SetMeterGroupingComponent {
  facilityMeters: Array<IdbUtilityMeter>;
  facilityMetersSub: Subscription;

  facility: IdbFacility;
  facilitySub: Subscription;
  constructor(private utilityMeterDbService: UtilityMeterdbService, private facilityDbService: FacilitydbService,
    private router: Router,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
  ) {
  }


  ngOnInit() {
    this.facilityMetersSub = this.utilityMeterDbService.facilityMeters.subscribe(meters => {
      this.facilityMeters = meters;
    });
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facility = facility;
    });
  }

  ngOnDestroy() {
    this.facilityMetersSub.unsubscribe();
    this.facilitySub.unsubscribe();
  }

  uploadData() {
    this.router.navigateByUrl('/data-management/' + this.facility.accountId + '/import-data');
  }

  async addMeter() {
    let newMeter: IdbUtilityMeter = getNewIdbUtilityMeter(this.facility.guid, this.facility.accountId, true, this.facility.energyUnit);
    newMeter = await firstValueFrom(this.utilityMeterDbService.addWithObservable(newMeter));
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setMeters(account, this.facility);
    this.router.navigateByUrl('data-management/' + account.guid + '/facilities/' + this.facility.guid + '/meters/' + newMeter.guid);
  }
}
