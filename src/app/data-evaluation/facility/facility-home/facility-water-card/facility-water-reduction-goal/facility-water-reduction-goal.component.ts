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
  selector: 'app-facility-water-reduction-goal',
  templateUrl: './facility-water-reduction-goal.component.html',
  styleUrls: ['./facility-water-reduction-goal.component.css'],
  standalone: false
})
export class FacilityWaterReductionGoalComponent {
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private facilityHomeService: FacilityHomeService = inject(FacilityHomeService);
  private router: Router = inject(Router);
  private analysisDbService: AnalysisDbService = inject(AnalysisDbService);

  latestAnalysisItem: Signal<IdbAnalysisItem> = toSignal(this.facilityHomeService.latestWaterAnalysisItem, { initialValue: undefined });
  facility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility, { initialValue: undefined });
  monthlyFacilityWaterAnalysisData: Signal<Array<MonthlyAnalysisSummaryData>> = toSignal(this.facilityHomeService.monthlyFacilityWaterAnalysisData, { initialValue: undefined });

  latestAnalysisSummary: Signal<MonthlyAnalysisSummaryData> = computed(() => {
    const monthlyFacilityWaterAnalysisData = this.monthlyFacilityWaterAnalysisData();
    return _.maxBy(monthlyFacilityWaterAnalysisData, (mData: MonthlyAnalysisSummaryData) => mData.date);
  });
  percentGoal: Signal<number> = computed(() => {
    const facility = this.facility();
    return facility?.sustainabilityQuestions?.waterReductionPercent || 0;
  });
  goalYear: Signal<number> = computed(() => {
    const facility = this.facility();
    return facility?.sustainabilityQuestions?.waterReductionTargetYear || 0;
  });
  baselineYear: Signal<number> = computed(() => {
    const facility = this.facility();
    return facility?.sustainabilityQuestions?.waterReductionBaselineYear || 0;
  });
  percentSavings: Signal<number> = computed(() => {
    const latestAnalysisSummary = this.latestAnalysisSummary();
    return latestAnalysisSummary?.rolling12MonthImprovement || 0;
  });
  percentTowardsGoal: Signal<number> = computed(() => {
    const percentSavings = this.percentSavings();
    const percentGoal = this.percentGoal();
    let percentTowardsGoal = (percentSavings / percentGoal) * 100;
    if (percentTowardsGoal < 0) {
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
