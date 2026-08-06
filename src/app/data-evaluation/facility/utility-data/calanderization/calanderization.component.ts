import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, OnInit, inject, computed, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
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
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  facilityMetersSub: Subscription;
  facilityMeters: Array<IdbUtilityMeter>;

  selectedMeter: IdbUtilityMeter;
  constructor(
    private router: Router,
    private injector: Injector

  ) { }

  ngOnInit(): void {
    this.facilityMetersSub = toObservable(computed(() => [...this.accountWorkspaceStore.facilityMeters()]), { injector: this.injector }).subscribe(facilityMeters => {
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
    let selectedAccount: IdbAccount = this.accountWorkspaceStore.account();
    this.router.navigateByUrl('/data-management/' + selectedAccount.guid + '/import-data');
  }

  addMeter() {
    let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    this.router.navigateByUrl('/data-evaluation/facility/' + selectedFacility.guid + '/utility/energy-consumption/energy-source/new-meter');
  }
}
