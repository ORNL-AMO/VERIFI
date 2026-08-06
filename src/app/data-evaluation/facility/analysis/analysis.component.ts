import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, effect, inject, OnDestroy, Signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { AnalysisService } from './analysis.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { RegressionModelStateService } from 'src/app/account-workspace/regression-model-state.service';

@Component({
  selector: 'app-analysis',
  templateUrl: './analysis.component.html',
  styleUrls: ['./analysis.component.css'],
  standalone: false
})
export class AnalysisComponent implements OnDestroy {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private router: Router = inject(Router);
  private analysisService: AnalysisService = inject(AnalysisService);
  private regressionModelState = inject(RegressionModelStateService);

  utilityMeterData: Signal<Array<IdbUtilityMeterData>> = computed(() => [...this.accountWorkspaceStore.facilityMeterData()]);
  utilityMeterGroups: Signal<Array<IdbUtilityMeterGroup>> = computed(() => [...this.accountWorkspaceStore.facilityMeterGroups()]);
  facility: Signal<IdbFacility> = this.accountWorkspaceStore.selectedFacility;
  annualKey: string;
  monthlyKey: string;

  constructor() {
    effect(() => {
      const selectedFacility = this.facility();
      if (selectedFacility) {
        this.annualKey = 'annual-' + selectedFacility.id;
        this.monthlyKey = 'monthly-' + selectedFacility.id;
      }
    })
  }

  ngOnDestroy() {
    //Reset when leaving analysis section
    this.analysisService.accountAnalysisItem.next(undefined);
    this.analysisService.hideInUseMessage.next(false);
    this.analysisService.getDisplaySubject(this.annualKey, 'table').next('table');
    this.analysisService.getDisplaySubject(this.monthlyKey, 'graph').next('graph');
    this.regressionModelState.clear();
  }

  goToMeterGroups() {
    this.router.navigateByUrl('/data-evaluation/facility/' + this.facility().guid + '/utility/meter-groups')
  }

  goToUtilityData() {
    this.router.navigateByUrl('/data-evaluation/facility/' + this.facility().guid + '/utility')
  }
}
