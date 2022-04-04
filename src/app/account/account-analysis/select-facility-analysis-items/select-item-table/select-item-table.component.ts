import { Component, Input, OnInit } from '@angular/core';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-select-item-table',
  templateUrl: './select-item-table.component.html',
  styleUrls: ['./select-item-table.component.css']
})
export class SelectItemTableComponent implements OnInit {
  @Input()
  facility: IdbFacility;
  @Input()
  selectedAnalysisItem: IdbAccountAnalysisItem;
  @Input()
  accountAnalysisItems: Array<IdbAnalysisItem>;

  facilityAnalysisItems: Array<IdbAnalysisItem>;
  selectedFacilityItemId: number;
  constructor(private accountAnalysisDbService: AccountAnalysisDbService) { }

  ngOnInit(): void {
    this.facilityAnalysisItems = this.accountAnalysisItems.filter(item => { return item.facilityId == this.facility.id && item.reportYear == this.selectedAnalysisItem.reportYear });
    this.setSelectedFacilityItemId();
  }

  setSelectedFacilityItemId() {
    this.selectedAnalysisItem.facilityAnalysisItems.forEach(item => {
      if (item.facilityId == this.facility.id) {
        this.selectedFacilityItemId = item.analysisItemId;
      }
    });
  }

  save() {
    this.accountAnalysisDbService.updateFacilityItemSelection(this.selectedAnalysisItem, this.selectedFacilityItemId, this.facility.id);
  }

}
