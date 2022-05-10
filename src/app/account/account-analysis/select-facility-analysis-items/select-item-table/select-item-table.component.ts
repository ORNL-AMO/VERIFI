import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
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
  facilityAnalysisItems: Array<IdbAnalysisItem>;

  selectedFacilityItemId: string;
  itemToEdit: IdbAnalysisItem;
  constructor(private accountAnalysisDbService: AccountAnalysisDbService, private router: Router,
    private analysisDbService: AnalysisDbService) { }

  ngOnInit(): void {
  }

  ngOnChanges() {
    this.setSelectedFacilityItemId();

  }

  setSelectedFacilityItemId() {
    this.selectedAnalysisItem.facilityAnalysisItems.forEach(item => {
      if (item.facilityId == this.facility.guid) {
        this.selectedFacilityItemId = item.analysisItemId;
      }
    });
  }

  save() {
    this.accountAnalysisDbService.updateFacilityItemSelection(this.selectedAnalysisItem, this.selectedFacilityItemId, this.facility.guid);
  }


  editItem(analysisItem: IdbAnalysisItem) {
    this.itemToEdit = analysisItem;
  }

  cancelEditItem() {
    this.itemToEdit = undefined;
  }

  confirmEditItem() {
    this.analysisDbService.selectedAnalysisItem.next(this.itemToEdit);
    this.router.navigateByUrl('facility/' + this.facility.id + '/analysis/run-analysis');
  }

}
