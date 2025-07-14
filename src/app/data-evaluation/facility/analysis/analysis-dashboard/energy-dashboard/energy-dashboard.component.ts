import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnalysisService } from '../../analysis.service';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import * as _ from 'lodash';
import { Router } from '@angular/router';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';

@Component({
    selector: 'app-energy-dashboard',
    templateUrl: './energy-dashboard.component.html',
    styleUrls: ['./energy-dashboard.component.css'],
    standalone: false
})
export class EnergyDashboardComponent {

  baselineYearErrorMin: boolean;
  baselineYearErrorMax: boolean;
  yearOptions: Array<number>;
  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  facilityAnalysisItemsSub: Subscription;
  analysisItemsList: Array<{
    year: number,
    analysisItems: Array<IdbAnalysisItem>,
    hasSelectedItem: boolean
  }>;
  showDetail: boolean;
  showDetailSub: Subscription;
  constructor(private analysisDbService: AnalysisDbService,
    private facilityDbService: FacilitydbService,
    private analysisService: AnalysisService,
    private calanderizationService: CalanderizationService,
    private router: Router) { }

  ngOnInit(): void {
    this.facilityAnalysisItemsSub = this.analysisDbService.facilityAnalysisItems.subscribe(items => {
      this.setAnalysisItemsList(items);
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
    })

  }

  ngOnDestroy() {
    this.showDetailSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.facilityAnalysisItemsSub.unsubscribe();
  }


  setAnalysisItemsList(facilityAnalysisItems: Array<IdbAnalysisItem>) {
    this.analysisItemsList = new Array();
    let energyItems: Array<IdbAnalysisItem> = facilityAnalysisItems.filter(items => { return items.analysisCategory == 'energy' });
    let years: Array<number> = energyItems.map(item => { return item.reportYear });
    years = _.uniq(years);
    years = _.orderBy(years, (year) => { return year }, 'desc');
    years.forEach(year => {
      let yearAnalysisItems: Array<IdbAnalysisItem> = energyItems.filter(item => { return item.reportYear == year });
      this.analysisItemsList.push({
        year: year,
        analysisItems: yearAnalysisItems,
        hasSelectedItem: yearAnalysisItems.findIndex((item: IdbAnalysisItem) => { return item.selectedYearAnalysis == true }) != -1
      });
    })
  }
  
  goToSettings() {
    this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility.id + '/settings');
  }

  goToUtilityData() {
    this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility.id + '/utility');
  }
}
