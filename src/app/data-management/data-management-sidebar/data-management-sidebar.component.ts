import { Component, EventEmitter, Output } from '@angular/core';
import { firstValueFrom, Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FileReference } from 'src/app/data-management/data-management-import/import-services/upload-data-models';
import { DataManagementService } from '../data-management.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { NavigationEnd, Router } from '@angular/router';

@Component({
  selector: 'app-data-management-sidebar',
  templateUrl: './data-management-sidebar.component.html',
  styleUrl: './data-management-sidebar.component.css',
  standalone: false
})
export class DataManagementSidebarComponent {
  @Output('emitToggleCollapse')
  emitToggleCollapse: EventEmitter<boolean> = new EventEmitter<boolean>(false);


  account: IdbAccount;
  accountSub: Subscription;

  facilities: Array<IdbFacility>;
  facilitiesSub: Subscription;

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;

  accountMeters: Array<IdbUtilityMeter>;
  accountMetersSub: Subscription;

  selectedMeter: IdbUtilityMeter;
  selectedMeterSub: Subscription;

  fileReferencesSub: Subscription;
  fileReferences: Array<FileReference>;

  accountPredictors: Array<IdbPredictor>;
  accountPredictorsSub: Subscription;

  sidebarOpen: boolean;
  sidebarOpenSub: Subscription;

  url: string;
  routerSub: Subscription;
  constructor(private accountDbService: AccountdbService, private facilityDbService: FacilitydbService,
    private dataManagementService: DataManagementService,
    private utilityMeterDbService: UtilityMeterdbService,
    private predictorDbService: PredictorDbService,
    private dbChangesService: DbChangesService,
    private router: Router
  ) {
  }

  ngOnInit() {
    this.accountSub = this.accountDbService.selectedAccount.subscribe(account => {
      this.account = account;
    });
    this.facilitiesSub = this.facilityDbService.accountFacilities.subscribe(facilities => {
      this.facilities = facilities;
    });
    this.fileReferencesSub = this.dataManagementService.fileReferences.subscribe(fileReferences => {
      this.fileReferences = fileReferences;
    });
    this.accountMetersSub = this.utilityMeterDbService.accountMeters.subscribe(accountMeters => {
      this.accountMeters = accountMeters.map(meter => { return { ...meter, open: false } });
    });
    this.accountPredictorsSub = this.predictorDbService.accountPredictors.subscribe(accountPredictors => {
      this.accountPredictors = accountPredictors;
    });
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.selectedFacility = facility;
    });
    this.selectedMeterSub = this.utilityMeterDbService.selectedMeter.subscribe(meter => {
      this.selectedMeter = meter;
    });

    this.sidebarOpenSub = this.dataManagementService.sidebarOpen.subscribe(val => {
      this.sidebarOpen = val;
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 100)
    })
    this.routerSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.url = this.router.url;
      }
    });
    this.url = this.router.url;
  }

  ngOnDestroy() {
    this.accountSub.unsubscribe();
    this.facilitiesSub.unsubscribe();
    this.fileReferencesSub.unsubscribe();
    this.accountPredictorsSub.unsubscribe();
    this.accountMetersSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.selectedMeterSub.unsubscribe();
    this.sidebarOpenSub.unsubscribe();
    this.routerSub.unsubscribe();
  }

  async toggleFacilitiesOpen() {
    this.account.sidebarFacilitiesOpen = !this.account.sidebarFacilitiesOpen;
    await firstValueFrom(this.accountDbService.updateWithObservable(this.account));
    await this.accountDbService.selectedAccount.next(this.account);
  }

  async toggleFacilityOpen(facility: IdbFacility) {
    facility.sidebarOpen = !facility.sidebarOpen;
    this.saveFacility(facility);
  }

  async toggleMeterOpen(meter: IdbUtilityMeter) {
    meter.sidebarOpen = !meter.sidebarOpen;
    await firstValueFrom(this.utilityMeterDbService.updateWithObservable(meter));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setMeters(selectedAccount, selectedFacility);
  }

  async toggleFacilityMetersOpen(facility: IdbFacility) {
    facility.sidebarMetersOpen = !facility.sidebarMetersOpen;
    this.saveFacility(facility);
  }

  async saveFacility(facility: IdbFacility) {
    await firstValueFrom(this.facilityDbService.updateWithObservable(facility));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.selectAccount(selectedAccount, false)
  }

  async toggleFacilityPredictorsOpen(facility: IdbFacility) {
    facility.sidebarPredictorsOpen = !facility.sidebarPredictorsOpen;
    this.saveFacility(facility);
  }

  async togglePredictorOpen(predictor: IdbPredictor) {
    predictor.sidebarOpen = !predictor.sidebarOpen;
    await firstValueFrom(this.predictorDbService.updateWithObservable(predictor));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setPredictorsV2(selectedAccount, selectedFacility);
  }

  async toggleCustomDataOpen() {
    this.account.sidebarCustomDataOpen = !this.account.sidebarCustomDataOpen;
    await firstValueFrom(this.accountDbService.updateWithObservable(this.account));
    await this.accountDbService.selectedAccount.next(this.account);
  }

  toggleSidebar() {
    this.emitToggleCollapse.emit(!this.sidebarOpen);
  }
}