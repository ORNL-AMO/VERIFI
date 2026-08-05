import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';

@Component({
  selector: 'app-facility-meter-monthly-data',
  templateUrl: './facility-meter-monthly-data.component.html',
  styleUrl: './facility-meter-monthly-data.component.css',
  standalone: false
})
export class FacilityMeterMonthlyDataComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);

  utilityMeter: IdbUtilityMeter;
  constructor(private activatedRoute: ActivatedRoute,
    private utilityMeterDbService: UtilityMeterdbService
  ) { }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let meterId: string = params['id'];
      this.utilityMeter = this.accountWorkspaceQuery.getMeterByGuid(meterId);
      this.accountWorkspaceService.selectMeter((this.utilityMeter)?.guid);
    });
  }
}
