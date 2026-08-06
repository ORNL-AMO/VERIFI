import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-facility-data',
  templateUrl: './facility-data.component.html',
  styleUrl: './facility-data.component.css',
  standalone: false
})
export class FacilityDataComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);


  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router

  ) {

  }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let facilityId: string = params['id'];
      let selectedFacility: IdbFacility = this.accountWorkspaceStore.facilities().find(facility => facility.guid === (facilityId));
      if (selectedFacility) {
        this.accountWorkspaceService.selectFacility(selectedFacility.guid);
      } else {
        this.router.navigateByUrl('/welcome')
      }
    });
  }

}
