import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { AnalysisGroupItem, AnalysisService } from '../../analysis.service';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';

@Component({
  selector: 'app-analysis-detail-item-card',
  standalone: false,

  templateUrl: './analysis-detail-item-card.component.html',
  styleUrl: './analysis-detail-item-card.component.css'
})
export class AnalysisDetailItemCardComponent {
  @Input({required: true})
  analysisItem: IdbAnalysisItem;
  @Input({required: true})
  calanderizedMeters: Array<CalanderizedMeter>;

  @Output() itemDeleted = new EventEmitter<boolean>();

  groupItems: Array<AnalysisGroupItem>;

  linkedItems: Array<{
    bankedAnalysisId: string,
    reportId: string,
    accountAnalysisId: string
  }>;

  displayDeleteModal: boolean = false;
  displayCreateCopyModal: boolean = false;
  selectedFacility: IdbFacility;

  displayLinkedItemModal: boolean = false;
  viewLinkedItem: { itemId: string, type: 'accountAnalysis' | 'bankedAnalysis' | 'facilityReport' } = undefined;

  displayCreateReportModal: boolean = false;
  isBanked: boolean;

  constructor(private facilityDbService: FacilitydbService,
    private analysisService: AnalysisService,
    private analysisDbService: AnalysisDbService, 
    private accountAnalysisDbService: AccountAnalysisDbService,
    private facilityReportsDbService: FacilityReportsDbService,
  ) { }

  ngOnChanges(): void {
    this.selectedFacility = this.facilityDbService.selectedFacility.getValue();
    this.initializeGroups();
    this.setLinkedItems();
  }

  initializeGroups() {
    this.groupItems = this.analysisItem?.groups.map(group => {
      return this.analysisService.getGroupItem(group);
    }).filter(item => {
      return item.group.analysisType != 'skip';
    });
  }

  setLinkedItems() {
    this.linkedItems = new Array();
    if (this.analysisItem?.hasBanking && this.analysisItem?.bankedAnalysisItemId) {
      this.linkedItems.push({
        bankedAnalysisId: this.analysisItem.bankedAnalysisItemId,
        reportId: undefined,
        accountAnalysisId: undefined
      });
    }

    this.isBanked = false;
    let facilityAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.facilityAnalysisItems.getValue();
    facilityAnalysisItems.forEach(item => {
      if (item.hasBanking && item.bankedAnalysisItemId == this.analysisItem?.guid) {
        this.isBanked = true;
      }
    });

    let facilityReportsItems: Array<IdbFacilityReport> = this.facilityReportsDbService.facilityReports.getValue();
    facilityReportsItems.forEach(item => {
      if (item.facilityReportType == 'analysis' && item.analysisItemId == this.analysisItem?.guid) {
        this.linkedItems.push({
          bankedAnalysisId: undefined,
          reportId: item.guid,
          accountAnalysisId: undefined
        });
      }
    });

    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    for (let index = 0; index < accountAnalysisItems.length; index++) {
      accountAnalysisItems[index].facilityAnalysisItems.forEach(item => {
        if (item.facilityId == this.selectedFacility.guid && item.analysisItemId == this.analysisItem?.guid) {
          this.linkedItems.push({
            bankedAnalysisId: undefined,
            reportId: undefined,
            accountAnalysisId: accountAnalysisItems[index].guid
          })
        }
      });
    }
  }
}

