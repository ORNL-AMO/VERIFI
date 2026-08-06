import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

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
    private router: Router
  ) { }

  ngOnInit(): void {
    this.utilityMeterDataSub = toObservable(computed(() => [...this.accountWorkspaceStore.facilityMeterData()])).subscribe(val => {
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
