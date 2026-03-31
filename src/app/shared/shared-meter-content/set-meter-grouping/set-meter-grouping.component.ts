import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { getNewIdbUtilityMeter, IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { MeterGroupingDataService } from './meter-grouping-data.service';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { CalanderizedMeter } from 'src/app/models/calanderization';


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

  meterDataSub: Subscription;
  meterData: Array<IdbUtilityMeterData>;

  calanderizationWorker: Worker;

  constructor(private utilityMeterDbService: UtilityMeterdbService, private facilityDbService: FacilitydbService,
    private router: Router,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private meterGroupingDataService: MeterGroupingDataService
  ) {
  }


  ngOnInit() {
    this.facilityMetersSub = this.utilityMeterDbService.facilityMeters.subscribe(meters => {
      this.facilityMeters = meters;
    });
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facility = facility;
      this.setCalanderizedMeterData();
    });

    this.meterDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(meterData => {
      this.meterData = meterData;
      this.setCalanderizedMeterData();
    });
  }

  ngOnDestroy() {
    this.facilityMetersSub.unsubscribe();
    this.facilitySub.unsubscribe();
    this.meterDataSub.unsubscribe();
    this.meterGroupingDataService.calanderizedMeters.next([]);
    if (this.calanderizationWorker) {
      this.calanderizationWorker.terminate();
    }
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


  setCalanderizedMeterData() {
    if (this.facility && this.facilityMeters && this.meterData) {
      this.meterGroupingDataService.calanderizingMeterData.next(true);
      let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
      if (typeof Worker !== 'undefined') {
        if (this.calanderizationWorker) {
          this.calanderizationWorker.terminate();
        }
        this.calanderizationWorker = new Worker(new URL('../../../web-workers/calanderization.worker', import.meta.url));
        this.calanderizationWorker.onmessage = ({ data }) => {
          this.calanderizationWorker.terminate();
          if (!data.error) {
            this.meterGroupingDataService.calanderizedMeters.next(data.calanderizedMeters);
            this.meterGroupingDataService.calanderizingMeterData.next(false);
          } else {
            console.log('Error in calanderization worker');
            this.meterGroupingDataService.calanderizedMeters.next([]);
            this.meterGroupingDataService.calanderizingMeterData.next('error');
          }
        };
        this.calanderizationWorker.postMessage({
          meters: this.facilityMeters,
          allMeterData: this.meterData,
          accountOrFacility: this.facility,
          monthDisplayShort: false,
          calanderizationOptions: undefined,
          co2Emissions: [],
          customFuels: [],
          facilities: [this.facility],
          assessmentReportVersion: selectedAccount.assessmentReportVersion,
          customGWPs: []
        });
      } else {
        let allCalanderizedMeterData: Array<CalanderizedMeter> = getCalanderizedMeterData(this.facilityMeters, this.meterData, this.facility, false, undefined, [], [], [this.facility], selectedAccount.assessmentReportVersion, []);
        this.meterGroupingDataService.calanderizedMeters.next(allCalanderizedMeterData);
        this.meterGroupingDataService.calanderizingMeterData.next(false);
      }
    }
  }
}
