import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { MeterCommandHandler } from 'src/app/account-workspace/handlers/meter-command-handler.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, computed, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
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
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  facilityMeters: Array<IdbUtilityMeter>;
  facilityMetersSub: Subscription;

  facility: IdbFacility;
  facilitySub: Subscription;

  meterDataSub: Subscription;
  meterData: Array<IdbUtilityMeterData>;

  calanderizationWorker: Worker;

  constructor(
    private commandBoundary: WorkspaceCommandBoundary,
    private meterHandler: MeterCommandHandler,
    private router: Router,
    private meterGroupingDataService: MeterGroupingDataService,
    private injector: Injector
  ) {
  }


  ngOnInit() {
    this.facilityMetersSub = toObservable(computed(() => [...this.accountWorkspaceStore.facilityMeters()]), { injector: this.injector }).subscribe(meters => {
      this.facilityMeters = meters;
    });
    this.facilitySub = toObservable(this.accountWorkspaceStore.selectedFacility, { injector: this.injector }).subscribe(facility => {
      this.facility = facility;
      this.setCalanderizedMeterData();
    });

    this.meterDataSub = toObservable(computed(() => [...this.accountWorkspaceStore.facilityMeterData()]), { injector: this.injector }).subscribe(meterData => {
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
    let account: IdbAccount = this.accountWorkspaceStore.account();
    const result = await this.commandBoundary.execute(
      { entityKind: 'meter', changeKind: 'add', label: 'Add Meter' ,
        publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'meters', upsert: [value] }] }) }},
      () => this.meterHandler.addMeter(newMeter, this.accountWorkspaceStore.account()?.guid)
    );
    this.router.navigateByUrl('data-management/' + account.guid + '/facilities/' + this.facility.guid + '/meters/' + result.value.guid);
  }


  setCalanderizedMeterData() {
    if (this.facility && this.facilityMeters && this.meterData) {
      this.meterGroupingDataService.calanderizingMeterData.next(true);
      let selectedAccount: IdbAccount = this.accountWorkspaceStore.account();
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
