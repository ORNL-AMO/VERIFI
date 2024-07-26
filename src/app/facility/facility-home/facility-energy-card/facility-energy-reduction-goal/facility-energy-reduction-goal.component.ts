import { Component } from '@angular/core';
import * as _ from 'lodash';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { Subscription } from 'rxjs';
import { IdbAnalysisItem } from 'src/app/models/idb';
import { FacilityHomeService } from '../../facility-home.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-facility-energy-reduction-goal',
  templateUrl: './facility-energy-reduction-goal.component.html',
  styleUrls: ['./facility-energy-reduction-goal.component.css']
})
export class FacilityEnergyReductionGoalComponent {

  latestAnalysisSummary: MonthlyAnalysisSummaryData;
  latestSummarySub: Subscription;
  percentSavings: number = 0;
  percentGoal: number;
  percentTowardsGoal: number = 0;
  goalYear: number;
  baselineYear: number;
  facility: IdbFacility;
  selectedFacilitySub: Subscription;
  latestAnalysisDate: Date;
  constructor(private facilityDbService: FacilitydbService, private facilityHomeService: FacilityHomeService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.facility = val;
      this.setGoalYears()
    });

    this.latestSummarySub = this.facilityHomeService.monthlyFacilityEnergyAnalysisData.subscribe(val => {
      let latestAnalysisItem: IdbAnalysisItem = this.facilityHomeService.latestEnergyAnalysisItem;
      this.latestAnalysisSummary = _.maxBy(val, 'date');
      if (this.latestAnalysisSummary && latestAnalysisItem?.selectedYearAnalysis) {
        this.latestAnalysisDate = new Date(this.latestAnalysisSummary.date);
        this.setProgressPercentages();
      } else {
        this.latestAnalysisDate = undefined;
        this.percentSavings = 0;
        this.percentTowardsGoal = 0;
      }
    });
  }

  ngOnDestroy() {
    this.latestSummarySub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }

  setGoalYears() {
    if (this.facility && this.facility.sustainabilityQuestions) {
      this.percentGoal = this.facility.sustainabilityQuestions.energyReductionPercent;
      this.goalYear = this.facility.sustainabilityQuestions.energyReductionTargetYear;
      this.baselineYear = this.facility.sustainabilityQuestions.energyReductionBaselineYear;
    }
  }

  setProgressPercentages() {
    this.percentSavings = this.latestAnalysisSummary.rolling12MonthImprovement;
    this.percentTowardsGoal = (this.percentSavings / this.percentGoal) * 100;
    if (this.percentTowardsGoal < 0) {
      this.percentTowardsGoal = 0;
    }
  }
}
