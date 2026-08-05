import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { Subscription } from 'rxjs';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
    selector: 'app-facility-home-help',
    templateUrl: './facility-home-help.component.html',
    styleUrls: ['./facility-home-help.component.css'],
    standalone: false
})
export class FacilityHomeHelpComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  constructor(private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = toObservable(this.accountWorkspaceStore.selectedFacility).subscribe(selectedFacility => {
      this.selectedFacility = selectedFacility;
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
  }
}
