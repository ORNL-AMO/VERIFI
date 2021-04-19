import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FacilitydbService } from "../../indexedDB/facility-db.service";
import { Subscription } from 'rxjs';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { PredictordbService } from "../../indexedDB/predictors-db.service";
import { UtilityMeterdbService } from "../../indexedDB/utilityMeter-db.service";
import { UtilityMeterDatadbService } from "../../indexedDB/utilityMeterData-db.service";
import { UtilityMeterGroupdbService } from "../../indexedDB/utilityMeterGroup-db.service";
import { LoadingService } from "../../shared/loading/loading.service";
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { BackupDataService } from '../backup-data.service';

@Component({
  selector: 'app-facility',
  templateUrl: './facility.component.html',
  styleUrls: ['./facility.component.css']
})
export class FacilityComponent implements OnInit {

  showDeleteFacility: boolean = false;
  selectedFacilitySub: Subscription;
  selectedFacility: IdbFacility;
  unitsDontMatchAccount: boolean;

  constructor(
    private router: Router,
    private facilityDbService: FacilitydbService,
    private predictorDbService: PredictordbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private accountDbService: AccountdbService,
    private loadingService: LoadingService,
    private backupDataService: BackupDataService
  ) { }

  ngOnInit() {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.selectedFacility = facility;
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
  }


  async facilityDelete() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage("Deleting Facility Predictors...");
    // Delete all info associated with account
    await this.predictorDbService.deleteAllFacilityPredictors(this.selectedFacility.id);
    this.loadingService.setLoadingMessage("Deleting Facility Meter Data...");
    await this.utilityMeterDataDbService.deleteAllFacilityMeterData(this.selectedFacility.id);
    this.loadingService.setLoadingMessage("Deleting Facility Meters...");
    await this.utilityMeterDbService.deleteAllFacilityMeters(this.selectedFacility.id);
    this.loadingService.setLoadingMessage("Deleting Facility Meter Groups...");
    await this.utilityMeterGroupDbService.deleteAllFacilityMeterGroups(this.selectedFacility.id);
    this.loadingService.setLoadingMessage("Deleting Facility...");
    await this.facilityDbService.deleteFacilitiesAsync([this.selectedFacility]);
    // Then navigate to another facility
    let allFacilities: Array<IdbFacility> = await this.facilityDbService.getAll().toPromise();
    this.facilityDbService.allFacilities.next(allFacilities);
    let accountFacilites: Array<IdbFacility> = allFacilities.filter(facility => { return facility.accountId == selectedAccount.id });
    this.facilityDbService.accountFacilities.next(accountFacilites);
    this.facilityDbService.setSelectedFacility();
    this.router.navigate(['/']);
    this.loadingService.setLoadingStatus(false);
  }

  openDeleteFacility() {
    this.showDeleteFacility = true;
  }

  async confirmDelete() {
    this.showDeleteFacility = undefined;
    await this.facilityDelete();
  }

  cancelDelete() {
    this.showDeleteFacility = undefined;
  }

  backupFacility(){
    this.backupDataService.backupFacility(this.selectedFacility);
  }
}
