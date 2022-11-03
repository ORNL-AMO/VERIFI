import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { AccountAnalysisService } from '../../account-analysis.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
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
  facilities: Array<IdbFacility>
  showCreateItem: boolean;
  constructor(private accountAnalysisDbService: AccountAnalysisDbService, private router: Router,
    private analysisDbService: AnalysisDbService, private facilityDbService: FacilitydbService,
    private accountAnalysisService: AccountAnalysisService,
    private dbChangesService: DbChangesService) { }

  ngOnInit(): void {
    this.facilities = this.facilityDbService.accountFacilities.getValue();
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

  async save() {
    await this.accountAnalysisDbService.updateFacilityItemSelection(this.selectedAnalysisItem, this.selectedFacilityItemId, this.facility.guid);
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

  goBack() {
    let facilityIndex: number = this.facilities.findIndex(facility => { return facility.guid == this.facility.guid });
    if (facilityIndex == 0) {
      this.router.navigateByUrl("/account/analysis/setup");
    } else {
      this.accountAnalysisService.selectedFacility.next(this.facilities[facilityIndex - 1]);
    }
  }

  continue() {
    let facilityIndex: number = this.facilities.findIndex(facility => { return facility.guid == this.facility.guid });
    if (facilityIndex == this.facilities.length - 1) {
      this.router.navigateByUrl("/account/analysis/results/annual-analysis");
    } else {
      this.accountAnalysisService.selectedFacility.next(this.facilities[facilityIndex + 1]);
    }
  }


  createNewItem(){
    this.showCreateItem = true;
  }

  cancelCreateNew(){
    this.showCreateItem = false;
  }

  async confirmCreateNew(){
    this.dbChangesService.selectFacility(this.facility);
    let newIdbItem: IdbAnalysisItem = this.analysisDbService.getNewAnalysisItem();
    newIdbItem.energyIsSource = this.selectedAnalysisItem.energyIsSource;
    newIdbItem.reportYear = this.selectedAnalysisItem.reportYear;
    newIdbItem = await this.analysisDbService.addWithObservable(newIdbItem).toPromise();
    this.analysisDbService.selectedAnalysisItem.next(newIdbItem);
    this.router.navigateByUrl("/facility/" + this.facility.id + "/analysis/run-analysis/analysis-setup");
    console.log(newIdbItem);
  }
}
