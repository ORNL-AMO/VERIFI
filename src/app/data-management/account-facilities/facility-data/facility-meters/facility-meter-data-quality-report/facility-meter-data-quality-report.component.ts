import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

@Component({
  selector: 'app-facility-meter-data-quality-report',
  standalone: false,
  templateUrl: './facility-meter-data-quality-report.component.html',
  styleUrl: './facility-meter-data-quality-report.component.css'
})
export class FacilityMeterDataQualityReportComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  utilityMeter: IdbUtilityMeter;
  utilityMeterData: Array<IdbUtilityMeterData>;

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router

  ) {

  }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let meterId: string = params['id'];
      this.utilityMeter = this.accountWorkspaceQuery.getMeterByGuid(meterId);
      if (this.utilityMeter) {
        this.accountWorkspaceService.selectMeter((this.utilityMeter)?.guid);
        this.utilityMeterData = this.accountWorkspaceQuery.getMeterData(this.utilityMeter.guid);
      } else {
        this.goToMeterList();
      }
    });
  }

  ngOnDestroy() {
    this.accountWorkspaceService.selectMeter(undefined);
  }


  goToMeterList() {
    let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    this.router.navigateByUrl('/data-management/' + selectedFacility.accountId + '/facilities/' + selectedFacility.guid + '/meters')
  }
}
