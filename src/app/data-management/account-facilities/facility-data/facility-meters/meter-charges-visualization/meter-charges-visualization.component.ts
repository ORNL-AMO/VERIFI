import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';

@Component({
  selector: 'app-meter-charges-visualization',
  standalone: false,
  templateUrl: './meter-charges-visualization.component.html',
  styleUrl: './meter-charges-visualization.component.css'
})
export class MeterChargesVisualizationComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  facility: IdbFacility;
  facilitySub: Subscription;
  utilityMeter: IdbUtilityMeter;
  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router

  ) {

  }

  ngOnInit() {
    this.facilitySub = toObservable(this.accountWorkspaceStore.selectedFacility).subscribe(facility => {
      this.facility = facility;
    });

    this.activatedRoute.params.subscribe(params => {
      let meterId: string = params['id'];
      this.utilityMeter = this.accountWorkspaceQuery.getMeterByGuid(meterId);
      if (this.utilityMeter) {
        this.accountWorkspaceService.selectMeter((this.utilityMeter)?.guid);
      } else {
        this.goToMeterList();
      }
    });
  }

  ngOnDestroy() {
    this.facilitySub.unsubscribe();
    this.accountWorkspaceService.selectMeter(undefined);
  }

  goToMeterList() {
    let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    this.router.navigateByUrl('/data-management/' + selectedFacility.accountId + '/facilities/' + selectedFacility.guid + '/meters')
  }

}
