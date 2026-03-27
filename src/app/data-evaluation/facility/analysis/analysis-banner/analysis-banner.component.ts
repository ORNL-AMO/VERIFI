import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-analysis-banner',
  templateUrl: './analysis-banner.component.html',
  styleUrls: ['./analysis-banner.component.css'],
  standalone: false
})
export class AnalysisBannerComponent implements OnInit {

  inRunAnalysis: boolean;
  analysisItem: IdbAnalysisItem;
  analysisItemSub: Subscription;
  modalOpen: boolean;
  modalOpenSub: Subscription;
  routerSub: Subscription;

  analysisItems: Array<IdbAnalysisItem>;
  analysisItemsSub: Subscription;

  showDropdown: boolean = false;

  calanderizedMeters: Array<CalanderizedMeter>;
  calanderizationSub: Subscription;
  constructor(private router: Router,
    private analysisDbService: AnalysisDbService, private sharedDataService: SharedDataService,
    private facilityDbService: FacilitydbService,
    private calanderizationService: CalanderizationService) { }

  ngOnInit(): void {
    this.analysisItemSub = this.analysisDbService.selectedAnalysisItem.subscribe(item => {
      this.analysisItem = item;
    })
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setInRunAnalysis(event.url);
      }
      this.showDropdown = false;
    });
    this.setInRunAnalysis(this.router.url);
    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    });

    this.analysisItemsSub = this.analysisDbService.facilityAnalysisItems.subscribe(items => {
      this.analysisItems = items;
    })
    this.calanderizationSub = this.calanderizationService.calanderizedMeterData.subscribe(meters => {
      this.calanderizedMeters = meters;
    });
  }

  ngOnDestroy() {
    this.analysisItemSub.unsubscribe();
    this.modalOpenSub.unsubscribe();
    this.routerSub.unsubscribe();
    this.analysisItemsSub.unsubscribe();
    this.calanderizationSub.unsubscribe();
  }

  setInRunAnalysis(url: string) {
    this.inRunAnalysis = url.includes('run-analysis');
  }

  goToDashboard() {
    this.router.navigateByUrl('/data-evaluation/analysis/analysis-dashboard')
  }

  toggleShow() {
    this.showDropdown = !this.showDropdown;
  }

  selectItem(item: IdbAnalysisItem) {
    this.analysisDbService.selectedAnalysisItem.next(item);
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/data-evaluation/facility/' + facility.guid + '/analysis/run-analysis/analysis-setup');
    this.showDropdown = false;
  }
}
