import { Component, computed, inject, Signal } from '@angular/core';
import * as _ from 'lodash';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { FacilityHomeService } from '../../facility-home.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { Router } from '@angular/router';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-facility-energy-reduction-goal',
  templateUrl: './facility-energy-reduction-goal.component.html',
  styleUrls: ['./facility-energy-reduction-goal.component.css'],
  standalone: false
})
export class FacilityEnergyReductionGoalComponent {
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private facilityHomeService: FacilityHomeService = inject(FacilityHomeService);
  private router: Router = inject(Router);
  private analysisDbService: AnalysisDbService = inject(AnalysisDbService);

  latestAnalysisItem: Signal<IdbAnalysisItem> = toSignal(this.facilityHomeService.latestEnergyAnalysisItem, { initialValue: undefined });
  facility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility, { initialValue: undefined });
  monthlyFacilityEnergyAnalysisData: Signal<Array<MonthlyAnalysisSummaryData>> = toSignal(this.facilityHomeService.monthlyFacilityEnergyAnalysisData, { initialValue: undefined });

  latestAnalysisSummary: Signal<MonthlyAnalysisSummaryData> = computed(() => {
    const monthlyFacilityEnergyAnalysisData = this.monthlyFacilityEnergyAnalysisData();
    return _.maxBy(monthlyFacilityEnergyAnalysisData, (mData: MonthlyAnalysisSummaryData) => mData.date);
  });
  percentGoal: Signal<number> = computed(() => {
    const facility = this.facility();
    return facility?.sustainabilityQuestions?.energyReductionPercent || 0;
  });
  goalYear: Signal<number> = computed(() => {
    const facility = this.facility();
    return facility?.sustainabilityQuestions?.energyReductionTargetYear || 0;
  });
  baselineYear: Signal<number> = computed(() => {
    const facility = this.facility();
    return facility?.sustainabilityQuestions?.energyReductionBaselineYear || 0;
  });
  percentSavings: Signal<number> = computed(() => {
    const latestAnalysisSummary = this.latestAnalysisSummary();
    return latestAnalysisSummary?.rolling12MonthImprovement || 0;
  });
  percentTowardsGoal: Signal<number> = computed(() => {
    const percentSavings = this.percentSavings();
    const percentGoal = this.percentGoal();
    let percentTowardsGoal = (percentSavings / percentGoal) * 100;
    if (percentTowardsGoal < 0 || isNaN(percentTowardsGoal)) {
      percentTowardsGoal = 0;
    }
    return percentTowardsGoal;
  });
  latestAnalysisDate: Signal<Date> = computed(() => {
    const latestAnalysisSummary = this.latestAnalysisSummary();
    if (latestAnalysisSummary) {
      return new Date(latestAnalysisSummary.date);
    } else {
      return undefined;
    }
  });

  goToAnalysisItem() {
    this.analysisDbService.selectedAnalysisItem.next(this.latestAnalysisItem());
    this.router.navigateByUrl('/data-evaluation/facility/' + this.facility().guid + '/analysis/run-analysis');
  }
}
