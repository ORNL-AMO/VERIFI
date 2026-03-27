import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AccountAnalysisService } from '../account-analysis.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

@Component({
  selector: 'app-select-facility-analysis-items',
  templateUrl: './select-facility-analysis-items.component.html',
  styleUrls: ['./select-facility-analysis-items.component.css'],
  standalone: false
})
export class SelectFacilityAnalysisItemsComponent implements OnInit {

  selectedAnalysisItem: IdbAccountAnalysisItem;
  selectedAnalysisItemSub: Subscription;
  facilityAnalysisItems: Array<IdbAnalysisItem>;
  showInUseMessage: boolean;
  facilities: Array<IdbFacility>;
  facilitiesSub: Subscription;

  calanderizedMeters: Array<CalanderizedMeter>;
  calanderizedMetersSub: Subscription;

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  constructor(private facilityDbService: FacilitydbService,
    private analysisDbService: AnalysisDbService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private router: Router,
    private accountAnalysisService: AccountAnalysisService,
    private accountReportDbService: AccountReportDbService,
    private calanderizationService: CalanderizationService) { }

  ngOnInit(): void {
    this.selectedAnalysisItemSub = this.accountAnalysisDbService.selectedAnalysisItem.subscribe(item => {
      this.selectedAnalysisItem = item;
      this.setShowInUseMessage();
    })

    this.facilitiesSub = this.facilityDbService.accountFacilities.subscribe(facilities => {
      this.facilities = facilities;
    });

    this.calanderizedMetersSub = this.calanderizationService.calanderizedMeterData.subscribe(calanderizedMeters => {
      this.calanderizedMeters = calanderizedMeters;
    });

    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(selectedFacility => {
      this.selectedFacility = selectedFacility;
      if (this.selectedFacility) {
        this.setFacilityAnlaysisItems();
      } else if (this.facilities.length > 0) {
        this.selectFacility(this.facilities[0].guid);
      }
    })

    if (!this.selectedAnalysisItem) {
      this.router.navigateByUrl('/data-evaluation/account/analysis/dashboard')
    }
  }

  ngOnDestroy() {
    this.facilitiesSub.unsubscribe();
    this.selectedAnalysisItemSub.unsubscribe();
    this.calanderizedMetersSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }

  selectFacility(facilityId: string) {
    this.selectedFacility = this.facilities.find(facility => facility.guid === facilityId);
  }

  setFacilityAnlaysisItems() {
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    if (this.selectedAnalysisItem.analysisCategory == 'energy') {
      this.facilityAnalysisItems = accountAnalysisItems.filter(item => {
        return (item.analysisCategory == this.selectedAnalysisItem.analysisCategory
          && item.facilityId == this.selectedFacility.guid
          && item.energyIsSource == this.selectedAnalysisItem.energyIsSource
          && (item.baselineYear == this.selectedAnalysisItem.baselineYear || this.selectedFacility.isNewFacility));
      });
    } else if (this.selectedAnalysisItem.analysisCategory == 'water') {
      this.facilityAnalysisItems = accountAnalysisItems.filter(item => {
        return (item.analysisCategory == this.selectedAnalysisItem.analysisCategory
          && item.facilityId == this.selectedFacility.guid
          && (item.baselineYear == this.selectedAnalysisItem.baselineYear || this.selectedFacility.isNewFacility));
      });
    }
    //order by modified date
    this.facilityAnalysisItems = this.facilityAnalysisItems.sort((a, b) => {
      return new Date(b.modifiedDate).getTime() - new Date(a.modifiedDate).getTime();
    });
  }

  setShowInUseMessage() {
    let hasCorrespondingReport: boolean = this.accountReportDbService.getHasCorrespondingReport(this.selectedAnalysisItem.guid);
    if (hasCorrespondingReport && this.accountAnalysisService.hideInUseMessage == false) {
      this.showInUseMessage = true;
    }
  }

  hideInUseMessage() {
    this.showInUseMessage = false;
    this.accountAnalysisService.hideInUseMessage = true;
  }
}
