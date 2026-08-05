import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-facility-predictors-table',
  templateUrl: './facility-predictors-table.component.html',
  styleUrl: './facility-predictors-table.component.css',
  standalone: false
})
export class FacilityPredictorsTableComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription
  constructor(private facilityDbService: FacilitydbService) {

  }

  ngOnInit() {
    this.selectedFacilitySub = toObservable(this.accountWorkspaceStore.selectedFacility).subscribe(facility => {
      this.selectedFacility = facility;
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
  }

}
