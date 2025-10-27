import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { AnalysisService } from '../../analysis.service';
import * as _ from 'lodash';

@Component({
  selector: 'app-analysis-dashboard-view',
  standalone: false,

  templateUrl: './analysis-dashboard-view.component.html',
  styleUrl: './analysis-dashboard-view.component.css'
})
export class AnalysisDashboardViewComponent {

  baselineYearErrorMin: boolean;
  baselineYearErrorMax: boolean;
  yearOptions: Array<number>;
  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  facilityAnalysisItemsSub: Subscription;

  showDetail: boolean;
  showDetailSub: Subscription;
  analysisItems: Array<IdbAnalysisItem>;
  selectedAnalysisCategory: 'energy' | 'water' | 'all' = 'all';
  filteredAnalysisItems: Array<IdbAnalysisItem>;
  selectedReportYear: number | 'all' = 'all';
  errorList: Array<{ year: number, category: string }> = [];

  constructor(private analysisDbService: AnalysisDbService,
    private facilityDbService: FacilitydbService,
    private analysisService: AnalysisService,
    private calanderizationService: CalanderizationService,
    private router: Router) { }

  ngOnInit(): void {
    this.facilityAnalysisItemsSub = this.analysisDbService.facilityAnalysisItems.subscribe(items => {
      this.analysisItems = items;
      this.setAnalysisItems();
    });

    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
      this.yearOptions = this.calanderizationService.getYearOptionsFacility(this.selectedFacility.guid, 'energy');
      if (this.yearOptions) {
        this.baselineYearErrorMin = this.yearOptions[0] > this.selectedFacility.sustainabilityQuestions.energyReductionBaselineYear;
        this.baselineYearErrorMax = this.yearOptions[this.yearOptions.length - 1] < this.selectedFacility.sustainabilityQuestions.energyReductionBaselineYear
      }
    });

    this.showDetailSub = this.analysisService.showDetail.subscribe(showDetail => {
      this.showDetail = showDetail;
      this.selectedAnalysisCategory = 'all';
      this.selectedReportYear = 'all';
      this.setAnalysisItems();
    })

  }

  ngOnDestroy() {
    this.showDetailSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.facilityAnalysisItemsSub.unsubscribe();
  }

  filterAnalysisItems() {
    this.filteredAnalysisItems = this.analysisItems
      .filter(item => {
        const categoryMatch = this.selectedAnalysisCategory === 'all' || item.analysisCategory === this.selectedAnalysisCategory;
        const yearMatch = this.selectedReportYear === 'all' || item.reportYear === this.selectedReportYear;
        return categoryMatch && yearMatch;
      });
  }

  setAnalysisItems() {
    this.filteredAnalysisItems = this.analysisItems;
    this.computeSelectionErrors();
  }

  computeSelectionErrors() {
    this.errorList = [];
    let yearCategoryPairs = Array.from(new Set(this.filteredAnalysisItems.map(item => item.reportYear + '-' + item.analysisCategory)));

    yearCategoryPairs.forEach(pair => {
      const [yearStr, category] = pair.split('-');
      const year = +yearStr;
      const itemsForYearCategory = this.filteredAnalysisItems.filter(item => item.reportYear === year && item.analysisCategory === category);

      if (itemsForYearCategory.every(item => !item.selectedYearAnalysis)) {
        this.errorList.push({ year: year, category: category });
      }
    });
  }

  onItemDeleted(deleted: boolean) {
    if (deleted) {
      this.selectedAnalysisCategory = 'all';
      this.selectedReportYear = 'all';
      this.setAnalysisItems();
    }
  }

  goToSettings() {
    this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility.guid + '/settings');
  }

  goToUtilityData() {
    this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility.guid + '/utility');
  }
}

