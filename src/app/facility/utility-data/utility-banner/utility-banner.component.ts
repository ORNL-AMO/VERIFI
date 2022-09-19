import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility, IdbUtilityMeterData } from 'src/app/models/idb';
import { ExportToExcelTemplateService } from 'src/app/shared/helper-services/export-to-excel-template.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-utility-banner',
  templateUrl: './utility-banner.component.html',
  styleUrls: ['./utility-banner.component.css']
})
export class UtilityBannerComponent implements OnInit {

  utilityMeterData: Array<IdbUtilityMeterData>;
  utilityDataSub: Subscription;

  modalOpen: boolean;
  modalOpenSub: Subscription;

  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private sharedDataService: SharedDataService,
    private exportToExcelTemplateService: ExportToExcelTemplateService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.utilityDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(utilityMeterData => {
      this.utilityMeterData = utilityMeterData;
    });
    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    })
  }

  ngOnDestroy() {
    this.utilityDataSub.unsubscribe();
    this.modalOpenSub.unsubscribe();
  }

  exportData() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.exportToExcelTemplateService.exportFacilityData(selectedFacility.guid);
  }
}
