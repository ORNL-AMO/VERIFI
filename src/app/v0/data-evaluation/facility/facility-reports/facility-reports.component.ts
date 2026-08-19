import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@app/account-workspace/account-workspace.store';
import { Component, inject, computed, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { IdbFacility } from '@app/models/idbModels/facility';
import { IdbUtilityMeterData } from '@app/models/idbModels/utilityMeterData';

@Component({
    selector: 'app-facility-reports',
    templateUrl: './facility-reports.component.html',
    styleUrl: './facility-reports.component.css',
    standalone: false
})
export class FacilityReportsComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);


  utilityMeterDataSub: Subscription;
  utilityMeterData: Array<IdbUtilityMeterData>;
  constructor(
    private router: Router,
    private injector: Injector
  ) { }

  ngOnInit(): void {
    this.utilityMeterDataSub = toObservable(computed(() => [...this.accountWorkspaceStore.facilityMeterData()]), { injector: this.injector }).subscribe(val => {
      this.utilityMeterData = val;
    });
  }


  ngOnDestroy() {
    this.utilityMeterDataSub.unsubscribe();
  }

  goToUtilityData() {
    let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    this.router.navigateByUrl('/data-evaluation/facility/' + selectedFacility.guid + '/utility')
  }
}
